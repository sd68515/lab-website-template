import { SIM_FULL_COMBOS } from '@/constants/datasets'
import { buildSimulationIdentifier } from '@/utils/formatters'

export const CYCLE_INFERENCE_TOOLS = ['ExampleMethod09', 'ExampleMethod10'] as const
export const CYCLE_INFERENCE_TOOL_SET = new Set<string>(CYCLE_INFERENCE_TOOLS)

export const CYCLE_REAL_DATASET_IDS = ['12', '27', '28', '29', '30'] as const
export const CYCLE_REAL_DATASET_ID_SET = new Set<string>(CYCLE_REAL_DATASET_IDS)

const CYCLE_SIMULATION_DATASET_IDS = [
  ...(SIM_FULL_COMBOS['Cycle simple']?.full ?? []),
  ...(SIM_FULL_COMBOS['Cycle simple']?.efficiencyOnly ?? [])
].map(([cells, genes]) =>
  buildSimulationIdentifier('Cycle simple', `${cells}*${genes}`)
)

export const CYCLE_SIMULATION_DATASET_ID_SET = new Set<string>(CYCLE_SIMULATION_DATASET_IDS)

/**
 * 检查真实数据集 ID 是否为 cycle 工具支持的数据集。
 */
export function isCycleRealDatasetId(id?: string | number | null): boolean {
  if (id === undefined || id === null) return false
  return CYCLE_REAL_DATASET_ID_SET.has(String(id))
}

/**
 * 检查模拟数据集标识符是否为 cycle 工具支持的数据集。
 * 注意：Additional 数据集（如 '3_cycle-simple_...'）不在支持范围内。
 */
export function isCycleSimulationDatasetId(id?: string | number | null): boolean {
  if (id === undefined || id === null || id === '') return false
  return CYCLE_SIMULATION_DATASET_ID_SET.has(String(id))
}

/**
 * 检查数据集上下文是否为 cycle 工具支持的数据集。
 */
export function isCycleDatasetContext(context: {
  type: 'real' | 'simulation'
  id?: string | number | undefined
  shape?: string | undefined
  size?: string | undefined
}): boolean {
  if (context.type === 'real') {
    return isCycleRealDatasetId(context.id)
  }

  const identifier =
    (context.id ? String(context.id).trim() : '') ||
    buildSimulationIdentifier(context.shape ?? '', context.size ?? '')
  return isCycleSimulationDatasetId(identifier)
}
