import { resolveToolName } from './tools'

export type DownSamplingModality = 'scRNA' | 'ATAC'
export type DownSamplingDimension = 'cell' | 'gene'
export type DownSamplingRatio = '60' | '70' | '80' | '90' | '95'
export type DownSamplingReplicate = '1' | '2'

/** 专题独立的方法范围，不扩展运行时间或内存指标的白名单。 */
export const DOWN_SAMPLING_TOOL_NAMES = { scRNA: ['MethodA', 'MethodB'], ATAC: ['MethodA', 'MethodB'] } as const
export type DownSamplingToolName = (typeof DOWN_SAMPLING_TOOL_NAMES)[DownSamplingModality][number]

export const DOWN_SAMPLING_MODALITY_OPTIONS = [
  { label: 'scRNA', value: 'scRNA' },
  { label: 'ATAC', value: 'ATAC' }
] as const

export const DOWN_SAMPLING_DIMENSION_OPTIONS = [
  { label: 'Cell down-sampling', value: 'cell' },
  { label: 'Gene down-sampling', value: 'gene' }
] as const

export const DOWN_SAMPLING_RATIO_OPTIONS = [
  { label: '95%', value: '95' },
  { label: '90%', value: '90' },
  { label: '80%', value: '80' },
  { label: '70%', value: '70' },
  { label: '60%', value: '60' }
] as const

export const DOWN_SAMPLING_REPLICATE_OPTIONS = [
  { label: 'r1', value: '1' },
  { label: 'r2', value: '2' }
] as const

export function normalizeDownSamplingToolName(input: string, modality: DownSamplingModality): DownSamplingToolName | null {
  const tool = resolveToolName(input)
  return tool && (DOWN_SAMPLING_TOOL_NAMES[modality] as readonly string[]).includes(tool)
    ? tool as DownSamplingToolName
    : null
}
