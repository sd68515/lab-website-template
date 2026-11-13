import { getToolPublicName, resolveToolName } from '@/constants/tools'
import { getToolColor } from './toolColors'

export const EFFICIENCY_TOOL_NAMES = ['MethodA', 'MethodB'] as const
export type EfficiencyToolName = (typeof EFFICIENCY_TOOL_NAMES)[number]

export const EFFICIENCY_MODALITY_OPTIONS = [
  { label: 'scRNA', value: 'scRNA' },
  { label: 'ATAC', value: 'ATAC' },
  { label: 'Spatial', value: 'SPATIAL' }
] as const

export type EfficiencyModality = (typeof EFFICIENCY_MODALITY_OPTIONS)[number]['value']

export const EFFICIENCY_TOOLS_BY_MODALITY: Record<EfficiencyModality, readonly EfficiencyToolName[]> = {
  scRNA: EFFICIENCY_TOOL_NAMES, ATAC: EFFICIENCY_TOOL_NAMES, SPATIAL: EFFICIENCY_TOOL_NAMES
}

export type EfficiencyMemoryResourceType = 'RAM' | 'VRAM'

export const MEMORY_EFFICIENCY_RESOURCE_OPTIONS = [
  { label: 'RAM', value: 'RAM' },
  { label: 'VRAM', value: 'VRAM' }
] as const

export const MEMORY_EFFICIENCY_VRAM_TOOL_NAMES: readonly EfficiencyToolName[] = EFFICIENCY_TOOL_NAMES

export const EFFICIENCY_VRAM_TOOLS_BY_MODALITY: Record<EfficiencyModality, readonly EfficiencyToolName[]> = {
  scRNA: EFFICIENCY_TOOL_NAMES, ATAC: EFFICIENCY_TOOL_NAMES, SPATIAL: EFFICIENCY_TOOL_NAMES
}

// 保留原导出名，颜色定义统一维护在toolColors.ts。
export { TOOL_COLOR_PALETTE as SIMULATION_METRIC_TOOL_COLOR_PALETTE } from './toolColors'

export const EFFICIENCY_TOOL_COLORS: Record<EfficiencyToolName, string> = Object.fromEntries(
  EFFICIENCY_TOOL_NAMES.map(tool => [tool, getToolColor(tool)])
) as Record<EfficiencyToolName, string>

export const EFFICIENCY_ALWAYS_NA_NOTE_TOOLS: readonly string[] = []

export const DATA_SCALE_OPTIONS = [
  { label: 'Items = 120', value: 'cell1000' },
  { label: 'Features = 80', value: 'gene1000' },
  { label: 'Extra-large', value: 'extra-large' }
] as const

export type EfficiencyScale = (typeof DATA_SCALE_OPTIONS)[number]['value'] | 'large' | 'cell1967' | 'gene9836'

export function getEfficiencyScaleOptions(modality: EfficiencyModality): Array<{ label: string; value: EfficiencyScale }> {
  if (modality === 'ATAC') return [
    ...DATA_SCALE_OPTIONS.filter(option => option.value !== 'extra-large'),
    { label: 'Items = 240; Features = 320', value: 'large' }
  ]
  if (modality === 'SPATIAL') return [
    { label: 'Features = 160', value: 'gene9836' },
    { label: 'Items = 180', value: 'cell1967' }
  ]
  return [...DATA_SCALE_OPTIONS]
}

const EFFICIENCY_TOOL_ALIASES: Record<string, EfficiencyToolName> = {

}

export const TOPOLOGY_OPTIONS = [
  { label: 'Linear simple', value: 'linear-simple' },
  { label: 'Cycle simple', value: 'cycle-simple' },
  { label: 'Bifurcating', value: 'bifurcating' },
  { label: 'Bifurcating loop', value: 'bifurcating-loop' },
  { label: 'Consecutive bifurcating', value: 'consecutive-bifurcating' },
  { label: 'Trifurcating', value: 'trifurcating' },
  { label: 'Disconnected', value: 'disconnected' }
] as const

export type EfficiencyTopology = (typeof TOPOLOGY_OPTIONS)[number]['value'] | 'linear' | 'bifurcation3' | 'bifurcation5'

export function getEfficiencyTopologyOptions(modality: EfficiencyModality): Array<{ label: string; value: EfficiencyTopology }> {
  if (modality === 'ATAC') return [
    { label: 'Linear', value: 'linear' },
    { label: 'Bifurcation 3', value: 'bifurcation3' },
    { label: 'Bifurcation 5', value: 'bifurcation5' }
  ]
  return modality === 'SPATIAL' ? [] : [...TOPOLOGY_OPTIONS]
}

const TOPOLOGY_VALUE_SET = new Set<string>(TOPOLOGY_OPTIONS.map((option) => option.value))

export type EfficiencyMetricType = 'running-time' | 'memory-efficiency'

export function normalizeEfficiencyToolName(input: unknown): EfficiencyToolName | null {
  if (typeof input !== 'string') return null
  const trimmed = input.trim()
  if (!trimmed) return null

  const resolved = resolveToolName(trimmed)
  const fallback = EFFICIENCY_TOOL_ALIASES[trimmed.toLowerCase()]
  if (!resolved && !fallback) return null

  const normalized: string = resolved ?? fallback ?? ''

  return (EFFICIENCY_TOOL_NAMES as readonly string[]).includes(normalized)
    ? (normalized as EfficiencyToolName)
    : null
}

export function getEfficiencyToolLabel(tool: EfficiencyToolName): string {
  return getToolPublicName(tool)
}

export function formatXAxisLabel(columnName: string): string {
  const match = columnName.match(/(cell\d+_gene\d+)$/)
  return match?.[1] ?? columnName
}

export function buildEfficiencyCsvPath(
  metricType: EfficiencyMetricType,
  scale: EfficiencyScale,
  topology: EfficiencyTopology | null,
  resourceType: EfficiencyMemoryResourceType = 'RAM',
  modality: EfficiencyModality = 'scRNA'
): string {
  const metricBasePath = metricType === 'memory-efficiency'
    ? `sheets/${metricType}/${resourceType}`
    : `sheets/${metricType}`

  if (modality !== 'scRNA') {
    return `${metricBasePath}/${metricType}_${modality === 'ATAC' ? 'atac' : 'spatial'}.csv`
  }

  if (scale === 'extra-large') {
    return `${metricBasePath}/${metricType}_extra-large.csv`
  }
  if (!topology) {
    return ''
  }
  return `${metricBasePath}/${metricType}_${scale}_${topology}.csv`
}

export function matchesEfficiencyDataset(
  datasetId: string,
  modality: EfficiencyModality,
  scale: EfficiencyScale | null,
  topology: EfficiencyTopology | null
): boolean {
  if (modality === 'scRNA') return true
  const match = datasetId.match(/^(.*?)_cell(\d+)_gene(\d+)$/)
  if (!match) return false
  const [, prefix, cells, genes] = match
  if (modality === 'SPATIAL') {
    return prefix === 'spatial' && (scale === 'gene9836' ? genes === '160' : scale === 'cell1967' && cells === '180')
  }
  if (scale === 'large') return cells === '240' && genes === '320'
  if (prefix?.replace(/^\d+_/, '') !== topology) return false
  if (scale === 'cell1000') return cells === '120'
  if (scale === 'gene1000') return genes === '80'
  return false
}

export function parseDatasetIdToEfficiencyFilters(
  datasetId: unknown
): { modality: EfficiencyModality; scale: EfficiencyScale; topology: EfficiencyTopology | null } | null {
  if (typeof datasetId !== 'string') return null
  const trimmed = datasetId.trim()
  if (!trimmed) return null

  const match = trimmed.match(/^(.+)_cell(\d+)_gene(\d+)$/)
  if (!match) return null

  const prefix = match[1]
  const cells = match[2]
  const genes = match[3]
  if (!prefix || !cells || !genes) return null

  const atacTopology = prefix.replace(/^\d+_/, '')
  if (/^\d+_/.test(prefix) && (atacTopology === 'linear' || atacTopology === 'bifurcation3' || atacTopology === 'bifurcation5')) {
    const scale = cells === '120' ? 'cell1000' : genes === '80' ? 'gene1000' : cells === '240' && genes === '320' ? 'large' : null
    return scale ? { modality: 'ATAC', scale, topology: scale === 'large' ? null : atacTopology } : null
  }

  if (prefix === 'extra-large') {
    return { modality: 'scRNA', scale: 'extra-large', topology: null }
  }

  const topology = TOPOLOGY_VALUE_SET.has(prefix) ? (prefix as EfficiencyTopology) : null

  // cell1000_gene1000 同时满足两类尺度，优先归入 cell1000。
  if (cells === '120') {
    return { modality: 'scRNA', scale: 'cell1000', topology }
  }
  if (genes === '80') {
    return { modality: 'scRNA', scale: 'gene1000', topology }
  }

  return null
}
