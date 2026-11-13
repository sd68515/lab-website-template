import {
  normalizeEfficiencyToolName
} from './efficiency-tools'
import { resolveToolName } from './tools'
import { getToolColor } from './toolColors'

/** Batch-run结果独立登记，不扩展运行时间、内存或降采样的工具范围。 */
export const BATCH_RUN_TOOL_NAMES = ['MethodA', 'MethodB'] as const

export type BatchRunToolName = (typeof BATCH_RUN_TOOL_NAMES)[number]

export function normalizeBatchRunToolName(input: unknown): BatchRunToolName | null {
  const tool = normalizeEfficiencyToolName(input)
    ?? (typeof input === 'string' ? resolveToolName(input) : null)
  return tool && (BATCH_RUN_TOOL_NAMES as readonly string[]).includes(tool)
    ? tool as BatchRunToolName
    : null
}

export function getBatchRunToolColor(tool: BatchRunToolName): string {
  return getToolColor(tool)
}
