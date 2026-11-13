import type { PlaceholderDisplay, PlaceholderMode, PlaceholderSpec } from '@/types'

export type PlaceholderContext = {
  fallbackMode: PlaceholderMode
}

const normalizeMode = (value: unknown): PlaceholderMode | null => {
  if (!value) return null
  const normalized = String(value).trim().toLowerCase()

  if (['upload', 'missing', 'picture', 'not_uploaded'].includes(normalized)) return 'upload'
  if (['compute', 'unable', 'analysis', 'noresult'].includes(normalized)) return 'compute'
  if (['metric', 'out-of-metric', 'outofmetric'].includes(normalized)) return 'metric'
  if (normalized === 'pending') return 'pending'
  if (normalized === 'empty') return 'empty'
  if (['unknown', 'loading'].includes(normalized)) return 'unknown'

  return null
}

export function getDefaultPlaceholderMessage(mode: PlaceholderMode): string {
  if (mode === 'upload' || mode === 'pending') return 'Picture not uploaded'
  if (mode === 'metric') return 'Out of metric'
  if (mode === 'compute') return 'Unable to compute'
  if (mode === 'empty') return 'No results available'
  if (mode === 'unknown') return 'Result status unavailable'
  return 'Pending'
}

export function resolvePlaceholder(spec: unknown, ctx: PlaceholderContext): PlaceholderDisplay | null {
  if (spec === null || spec === undefined || spec === '') return null

  if (typeof spec === 'string') {
    const mode = normalizeMode(spec) ?? ctx.fallbackMode
    const message = normalizeMode(spec) ? getDefaultPlaceholderMessage(mode) : spec
    return { mode, message }
  }

  if (typeof spec !== 'object') {
    const mode = normalizeMode(spec) ?? ctx.fallbackMode
    return { mode, message: getDefaultPlaceholderMessage(mode) }
  }

  const record = spec as PlaceholderSpec
  const mode = normalizeMode((record as { mode?: unknown }).mode) ?? normalizeMode((record as { type?: unknown }).type) ?? ctx.fallbackMode
  const message =
    (record as { message?: string | null }).message ??
    (record as { text?: string | null }).text ??
    getDefaultPlaceholderMessage(mode)

  const label = (record as { label?: string | null }).label ?? null
  const reason = (record as { reason?: string | null }).reason ?? null

  return {
    mode,
    message,
    label,
    reason
  }
}
