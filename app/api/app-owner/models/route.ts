import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const [
      { data: providersRaw, error: pErr },
      { data: modelsRaw, error: mErr },
      { data: assignmentsRaw, error: aErr }
    ] = await Promise.all([
      (db as any).from('ai_providers').select('*'),
      (db as any).from('ai_models').select('*'),
      (db as any).from('feature_models').select('*').order('feature', { ascending: true }).order('priority', { ascending: true }),
    ])

    if (pErr || mErr || aErr) {
      console.error('Fetch error:', { pErr, mErr, aErr })
    }

    const providers = (providersRaw || []).map((p: any) => ({
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
    for (const p of (providersRaw || []) as any[]) providerById.set(p.id, p)

    const models = ((modelsRaw || []) as any[]).map((m) => {
      const pid = m.provider_id
      const prov = pid ? providerById.get(pid) : undefined
      return mapModel(m, prov)
    })

    // Group assignments by feature
    const byFeature: Record<string, { feature: string; models: any[] }> = {}
    for (const a of (assignmentsRaw || []) as any[]) {
      if (!byFeature[a.feature]) byFeature[a.feature] = { feature: a.feature, models: [] }
      const mid = a.model_id
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
      
      const { data: created, error } = await (db as any).from('ai_providers').insert({
        name,
        type,
        base_url: baseUrl || null,
        api_key_env_var: apiKeyEnvVar || null,
        is_active: typeof isActive === 'boolean' ? isActive : true,
        metadata: metadata ?? null,
      }).select().single()

      if (error) throw error

      return NextResponse.json({ ok: true, provider: {
        id: created.id,
        name: created.name,
        type: created.type,
        baseUrl: created.base_url ?? null,
        apiKeyEnvVar: created.api_key_env_var ?? null,
        isActive: created.is_active,
        metadata: created.metadata ?? null,
        createdAt: created.created_at,
        updatedAt: created.updated_at,
      } })
    }

    if (action === 'model') {
      const { providerId, name, modelId, modality, systemPrompt, defaultOptions, capabilities, isActive } = body ?? {}
      if (!providerId || !name || !modelId) return NextResponse.json({ error: 'providerId, name and modelId are required' }, { status: 400 })
      
      const { data: created, error } = await (db as any).from('ai_models').insert({
        provider_id: providerId,
        name,
        model_id: modelId,
        modality: modality || 'TEXT',
        system_prompt: systemPrompt || null,
        default_options: defaultOptions ?? null,
        capabilities: capabilities ?? null,
        is_active: typeof isActive === 'boolean' ? isActive : true,
      }).select().single()

      if (error) throw error

      return NextResponse.json({ ok: true, model: {
        id: created.id,
        providerId: created.provider_id,
        name: created.name,
        modelId: created.model_id,
        modality: created.modality,
        systemPrompt: created.system_prompt,
        defaultOptions: created.default_options,
        capabilities: created.capabilities,
        isActive: created.is_active,
        createdAt: created.created_at,
        updatedAt: created.updated_at,
      } })
    }

    if (action === 'assign') {
      const { feature, modelId, priority } = body ?? {}
      if (!feature || !modelId) return NextResponse.json({ error: 'feature and modelId are required' }, { status: 400 })
      const p = typeof priority === 'number' ? priority : 0
      
      // Upsert by (feature, priority)
      const { data: existing } = await (db as any).from('feature_models').select('id').eq('feature', feature).eq('priority', p).maybeSingle()
      
      let saved, error
      if (existing) {
        ({ data: saved, error } = await (db as any).from('feature_models').update({ model_id: modelId }).eq('id', existing.id).select().single())
      } else {
        ({ data: saved, error } = await (db as any).from('feature_models').insert({ feature, model_id: modelId, priority: p }).select().single())
      }

      if (error) throw error

      return NextResponse.json({ ok: true, assignment: { id: saved.id, feature: saved.feature, priority: saved.priority, modelId: saved.model_id } })
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
  } catch (err: any) {
    console.error('models POST error', err)
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}

