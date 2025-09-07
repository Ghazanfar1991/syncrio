import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ log: process.env.NODE_ENV === 'development' ? ['error'] : [] })
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function GET() {
  try {
    const [providersRaw, modelsRaw, assignmentsRaw] = await Promise.all([
      prisma.aIProvider.findMany().catch(() => []),
      prisma.aIModel.findMany().catch(() => []),
      prisma.featureModel.findMany({ orderBy: [{ feature: 'asc' }, { priority: 'asc' }] }).catch(() => []),
    ])

    const providers = providersRaw.map((p: any) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      baseUrl: p.base_url ?? null,
      apiKeyEnvVar: p.api_key_env_var ?? null,
      isActive: p.is_active,
      metadata: p.metadata ?? null,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }))

    const mapModel = (m: any, provider?: any) => ({
      id: m.id,
      providerId: m.provider_id,
      name: m.name,
      modelId: m.model_id,
      modality: m.modality,
      systemPrompt: m.system_prompt ?? null,
      defaultOptions: m.default_options ?? null,
      capabilities: m.capabilities ?? null,
      isActive: m.is_active,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
      provider: provider
        ? {
            id: provider.id,
            name: provider.name,
            type: provider.type,
            baseUrl: provider.base_url ?? null,
            apiKeyEnvVar: provider.api_key_env_var ?? null,
            isActive: provider.is_active,
          }
        : undefined,
    })

    const providerById = new Map<string, any>()
    for (const p of providersRaw as any[]) providerById.set(p.id, p)

    const models = (modelsRaw as any[]).map((m) => {
      const pid = m.providerId ?? m.provider_id
      const prov = pid ? providerById.get(pid) : undefined
      return mapModel(m, prov)
    })

    // Group assignments by feature, mapping model + provider to camelCase
    const byFeature: Record<string, { feature: string; models: any[] }> = {}
    for (const a of assignmentsRaw as any[]) {
      if (!byFeature[a.feature]) byFeature[a.feature] = { feature: a.feature, models: [] }
      const mid = (a as any).modelId ?? (a as any).model_id
      const model = models.find((m) => m.id === mid)
      if (model) {
        byFeature[a.feature].models.push({ id: a.id, priority: a.priority, model })
      }
    }

    return NextResponse.json({ providers, models, assignments: Object.values(byFeature) })
  } catch (err: any) {
    console.error('models GET error', err)
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const action = body?.action as string

    if (action === 'provider') {
      const { name, type, baseUrl, apiKeyEnvVar, isActive, metadata } = body ?? {}
      if (!name || !type) return NextResponse.json({ error: 'name and type are required' }, { status: 400 })
      const created = await prisma.aIProvider.create({
        data: {
          name,
          type,
          base_url: baseUrl || null,
          api_key_env_var: apiKeyEnvVar || null,
          is_active: typeof isActive === 'boolean' ? isActive : true,
          metadata: metadata ?? undefined,
        } as any,
      })
      return NextResponse.json({ ok: true, provider: {
        id: created.id,
        name: created.name,
        type: created.type,
        baseUrl: (created as any).base_url ?? null,
        apiKeyEnvVar: (created as any).api_key_env_var ?? null,
        isActive: (created as any).is_active,
        metadata: created.metadata ?? null,
        createdAt: (created as any).created_at,
        updatedAt: (created as any).updated_at,
      } })
    }

    if (action === 'model') {
      const { providerId, name, modelId, modality, systemPrompt, defaultOptions, capabilities, isActive } = body ?? {}
      if (!providerId || !name || !modelId) return NextResponse.json({ error: 'providerId, name and modelId are required' }, { status: 400 })
      const created = await prisma.aIModel.create({
        data: {
          provider_id: providerId,
          name,
          model_id: modelId,
          modality: modality || 'TEXT',
          system_prompt: systemPrompt || null,
          default_options: defaultOptions ?? undefined,
          capabilities: capabilities ?? undefined,
          is_active: typeof isActive === 'boolean' ? isActive : true,
        } as any,
      })
      return NextResponse.json({ ok: true, model: {
        id: created.id,
        providerId: (created as any).provider_id,
        name: created.name,
        modelId: (created as any).model_id,
        modality: (created as any).modality,
        systemPrompt: (created as any).system_prompt,
        defaultOptions: (created as any).default_options,
        capabilities: (created as any).capabilities,
        isActive: (created as any).is_active,
        createdAt: (created as any).created_at,
        updatedAt: (created as any).updated_at,
      } })
    }

    if (action === 'assign') {
      const { feature, modelId, priority } = body ?? {}
      if (!feature || !modelId) return NextResponse.json({ error: 'feature and modelId are required' }, { status: 400 })
      const p = typeof priority === 'number' ? priority : 0
      // Upsert by (feature, priority)
      const existing = await prisma.featureModel.findFirst({ where: { feature, priority: p } })
      let saved
      if (existing) {
        try {
          saved = await prisma.featureModel.update({ where: { id: existing.id }, data: { modelId } as any })
        } catch {
          saved = await prisma.featureModel.update({ where: { id: existing.id }, data: { model_id: modelId } as any })
        }
      } else {
        try {
          saved = await prisma.featureModel.create({ data: { feature, modelId, priority: p } as any })
        } catch {
          saved = await prisma.featureModel.create({ data: { feature, model_id: modelId, priority: p } as any })
        }
      }
      return NextResponse.json({ ok: true, assignment: { id: saved.id, feature: saved.feature, priority: saved.priority, modelId: (saved as any).modelId ?? (saved as any).model_id } })
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
  } catch (err: any) {
    console.error('models POST error', err)
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}
