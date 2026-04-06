import { db } from '@/lib/db'

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

export async function getModelsForFeature(feature: string): Promise<ResolvedModel[]> {
  // Fetch rows from Supabase
  const { data: rows, error: rowsErr } = await (db as any)
    .from('feature_models')
    .select('*')
    .eq('feature', feature)
    .order('priority', { ascending: true })

  if (rowsErr) {
    console.error('Error fetching feature models:', rowsErr)
    return []
  }

  if (!rows || rows.length === 0) return []

  const modelIds = rows.map((r: any) => r.model_id).filter(Boolean)
  if (modelIds.length === 0) return []

  const { data: models, error: modelsErr } = await (db as any)
    .from('ai_models')
    .select('*')
    .in('id', modelIds)

  if (modelsErr) {
    console.error('Error fetching AI models:', modelsErr)
    return []
  }

  const providerIds = (models || []).map((m: any) => m.provider_id).filter(Boolean)
  const { data: providers, error: providersErr } = await (db as any)
    .from('ai_providers')
    .select('*')
    .in('id', providerIds)

  if (providersErr) {
    console.error('Error fetching AI providers:', providersErr)
  }

  const providerById = new Map<string, any>()
  for (const p of (providers || []) as any[]) providerById.set(p.id, p)

  const modelsById = new Map<string, any>()
  for (const m of (models || []) as any[]) modelsById.set(m.id, m)

  const result: ResolvedModel[] = []
  for (const r of rows as any[]) {
    const mid = r.model_id
    const m = modelsById.get(mid)
    if (!m) continue
    const p = providerById.get(m.provider_id)
    const apiKeyEnvVar = p?.api_key_env_var
    const apiKey = apiKeyEnvVar ? process.env[apiKeyEnvVar] : undefined
    result.push({
      id: m.id,
      name: m.name,
      modelId: m.model_id,
      modality: m.modality,
      systemPrompt: m.system_prompt,
      defaultOptions: m.default_options,
      capabilities: m.capabilities,
      provider: {
        id: p?.id,
        type: p?.type,
        baseUrl: p?.base_url,
        apiKeyEnvVar,
        apiKey,
      },
    })
  }
  return result
}

