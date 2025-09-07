import { PrismaClient, AIFeature } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ log: process.env.NODE_ENV === 'development' ? ['error'] : [] })
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export type ResolvedModel = {
  id: string
  name: string
  modelId: string
  modality: string
  systemPrompt?: string | null
  defaultOptions?: any
  capabilities?: any
  provider: {
    id: string
    type: string
    baseUrl?: string | null
    apiKeyEnvVar?: string | null
    apiKey?: string
  }
}

export async function getModelsForFeature(feature: AIFeature): Promise<ResolvedModel[]> {
  // Fetch rows without relying on relation field names (snake vs camel)
  const rows = await prisma.featureModel.findMany({ where: { feature }, orderBy: { priority: 'asc' } })
  const modelIds = rows.map((r: any) => r.modelId ?? r.model_id).filter(Boolean)
  if (modelIds.length === 0) return []

  const models = await prisma.aIModel.findMany({ where: { id: { in: modelIds } } })
  const providerIds = (models as any[]).map((m) => m.providerId ?? m.provider_id).filter(Boolean)
  const providers = await prisma.aIProvider.findMany({ where: { id: { in: providerIds } } })
  const providerById = new Map<string, any>()
  for (const p of providers as any[]) providerById.set(p.id, p)

  const modelsById = new Map<string, any>()
  for (const m of models as any[]) modelsById.set(m.id, m)

  const result: ResolvedModel[] = []
  for (const r of rows as any[]) {
    const mid = r.modelId ?? r.model_id
    const m = modelsById.get(mid)
    if (!m) continue
    const p = providerById.get(m.providerId ?? m.provider_id)
    const apiKeyEnvVar = p?.apiKeyEnvVar ?? p?.api_key_env_var
    const apiKey = apiKeyEnvVar ? process.env[apiKeyEnvVar] : undefined
    result.push({
      id: m.id,
      name: m.name,
      modelId: m.modelId ?? m.model_id,
      modality: m.modality,
      systemPrompt: m.systemPrompt ?? m.system_prompt,
      defaultOptions: m.defaultOptions ?? m.default_options,
      capabilities: m.capabilities,
      provider: {
        id: p?.id,
        type: p?.type,
        baseUrl: p?.baseUrl ?? p?.base_url,
        apiKeyEnvVar,
        apiKey,
      },
    })
  }
  return result
}
