import { formatNumber } from '@/utils/locale'
import { relativeLuminance, contrastRatio } from '@/utils/colorContrast'
import type { GeneralHeatmapMetric, GeneralHeatmapSource } from './general-heatmap-assets'

export type DynamicMetric = GeneralHeatmapMetric | 'ground-truth-correlation'
export type DynamicScope = 'scRNA' | 'ATAC' | 'SPATIAL' | 'LINEAGE'
export type DynamicSource = GeneralHeatmapSource
export interface DynamicMatrix {
  schemaVersion: 1
  metricId: DynamicMetric
  scope: DynamicScope
  source: DynamicSource
  sourceFile: string
  sha256: string
  tools: { id: string; raw: string }[]
  displayOrder: string[]
  datasets: string[]
  values: (string | null)[][]
  stats: { numericCount: number; naCount: number; zeroCount: number; negativeCount: number; min: number | null; max: number | null }
}
/** Fictional scores preserve the original keyboard-navigable matrix interface. */
export async function loadDynamicMatrix(metricId: DynamicMetric, scope: DynamicScope, source: DynamicSource, signal?: AbortSignal): Promise<DynamicMatrix> {
  signal?.throwIfAborted()
  const offset = ['iccoh', 'cbdir', 'transition-score', 'angle-consistency', 'consistency-score', 'ground-truth-correlation'].indexOf(metricId) * 0.02
  const values = [[0.82 - offset, 0.71 + offset], [0.68 + offset, 0.78 - offset]].map(row => row.map(value => value.toFixed(2)))
  return { schemaVersion: 1, metricId, scope, source, sourceFile: 'fictional example', sha256: '',
    tools: [{ id: 'MethodA', raw: 'MethodA' }, { id: 'MethodB', raw: 'MethodB' }],
    displayOrder: ['MethodA', 'MethodB'], datasets: ['1', '2'], values,
    stats: { numericCount: 4, naCount: 0, zeroCount: 0, negativeCount: 0, min: 0, max: 1 } }
}

export function formatHeatmapValue(raw: string | null): string {
  if (raw === null) return 'NA'
  const value = Number(raw)
  if (value === 0) return formatNumber(0, { minimumFractionDigits: 3, maximumFractionDigits: 3 })
  if (Math.abs(value) < 0.001) return `${value > 0 ? '<' : '>−'}${formatNumber(0.001, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`
  const fixed = formatNumber(value, { minimumFractionDigits: 3, maximumFractionDigits: 3 })
  return fixed
}

function heatmapTextColor(background: number[]): string {
  const luminance = relativeLuminance(background)
  const blackContrast = contrastRatio(luminance, 0)
  const whiteContrast = contrastRatio(luminance, 1)
  return whiteContrast > blackContrast ? '#ffffff' : '#000000'
}

export function heatmapColor(value: number, min: number, max: number, diverging: boolean): { background: string; color: string } {
  if (diverging) {
    const extent = Math.max(Math.abs(min), Math.abs(max))
    const t = extent === 0 ? 0 : Math.min(1, Math.abs(value) / extent)
    const base: number[] = value < 0 ? [72, 139, 192] : [215, 112, 87]
    const mix = (channel: number) => Math.round(247 + (channel - 247) * t)
    const background = base.map(mix)
    return { background: `rgb(${background.join(', ')})`, color: heatmapTextColor(background) }
  }
  const t = max === min ? 0.5 : Math.max(0, Math.min(1, (value - min) / (max - min)))
  const low = [238, 247, 251]
  const high = [35, 110, 164]
  const channels = low.map((channel, i) => Math.round(channel + ((high[i] ?? channel) - channel) * t))
  return { background: `rgb(${channels.join(', ')})`, color: heatmapTextColor(channels) }
}
