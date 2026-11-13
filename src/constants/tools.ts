/**
 * 工具（Category A 分析方法）常量配置
 * 定义所有支持的工具名称、分类和相关配置
 *
 * 注意：本文件的工具定义与 MethodResult.vue 和 DatasetResult.vue 保持一致
 */

import benchmarkCatalogue from './generated/benchmarkCatalogue.json'
import scientificTypes from './generated/toolScientificTypes.json'

/**
 * 工具定义接口
 */
export const TOOL_MODALITY_DEFINITIONS = [
  { value: 'scRNA', label: 'scRNA' },
  { value: 'ATAC', label: 'ATAC' },
  { value: 'SPATIAL', label: 'Spatial' },
  { value: 'LINEAGE', label: 'Data group D' },
  { value: 'CYCLE', label: 'Method type B' },
  { value: 'CHROMATIN', label: 'Method type C' }
] as const

export type ToolModality = (typeof TOOL_MODALITY_DEFINITIONS)[number]['value']

export type ToolCategory = 'Category A' | 'Category B' | 'Category C'

export const TOOL_CATEGORY_LABELS: Record<ToolCategory, string> = {
  'Category A': 'Category A',
  'Category B': 'Method type B',
  'Category C': 'Category C'
}

/** Scientific analysis types from tool_list.csv (ExampleShared expands to two configurations).
 * These describe the method, while `modalities` below describe benchmark evaluation coverage.
 */
export const TOOL_SCIENTIFIC_TYPE_DEFINITIONS = [
  { value: 'rna-velocity', label: 'Category A', scope: 'scRNA' },
  { value: 'chromatin-aided', label: 'Chromatin-aided Category A', scope: 'ATAC' },
  { value: 'spatial-velocity', label: 'Spatial velocity', scope: 'SPATIAL' },
  { value: 'lineage-velocity', label: 'Lineage-traced velocity', scope: 'LINEAGE' },
  { value: 'cycle-inference', label: 'Method type B', scope: 'scRNA' },
  { value: 'chromatin-velocity', label: 'Method type C', scope: 'CHROMATIN' }
] as const

export type ToolScientificType = (typeof TOOL_SCIENTIFIC_TYPE_DEFINITIONS)[number]['value']

const SCIENTIFIC_TYPE_METHODS: Record<ToolScientificType, readonly string[]> = scientificTypes

export function getToolsByScientificType(type: ToolScientificType): ToolDefinition[] {
  const names = new Set(SCIENTIFIC_TYPE_METHODS[type])
  return TOOL_DEFINITIONS.filter(tool => names.has(tool.name))
}

export interface ToolDefinition {
  /** 工具名称（与图片文件名匹配） */
  name: string
  /** 工具分类 */
  category: ToolCategory
  /** 本研究的模态支持；一个工具可以对应多个模态。 */
  modalities: readonly ToolModality[]
  /** 显示名称（可选，用于界面展示） */
  displayName?: string
  /** 用户可见 CSV 名称（可选，用于工具目录、Usability 等文本 CSV） */
  csvName?: string
}

/**
 * 所有支持的 Category A 工具定义列表
 * 44 个独立工具、45 个方法配置；modalities 表示本研究的评测范围。
 *
 * 特别说明：
 * - ExampleShared 有两种分析模式，分别为 ExampleMethod02 和 ExampleMethod03
 * - 工具名称与图片文件命名保持一致（例如：ExampleMethod02_1_angle_consistency.png）
 */
export const TOOL_DEFINITIONS: ToolDefinition[] = [
  { name: 'MethodA', displayName: 'Method A', category: 'Category A', modalities: ['scRNA'] },
  { name: 'MethodB', displayName: 'Method B', category: 'Category A', modalities: ['scRNA'] }
]

/** 此组工具的结果交付与 Usability 评分范围分别维护。 */
const NEW_TOOL_RESULT_NAMES = [
  'ExampleMethod29', 'ExampleMethod30', 'ExampleMethod31', 'ExampleMethod32', 'ExampleMethod33', 'ExampleMethod34', 'ExampleMethod35',
  'ExampleMethod36', 'ExampleMethod37', 'ExampleMethod38', 'ExampleMethod39', 'ExampleMethod40',
  'ExampleMethod41', 'ExampleMethod42', 'ExampleMethod43', 'ExampleMethod44', 'ExampleMethod45'
]

const DELIVERED_TOOL_NAMES = new Set<string>(benchmarkCatalogue.deliveredToolNames)
/** 完全没有基础结果的新增工具；局部未交付组合由 benchmark-results 单独过滤。 */
export const PENDING_TOOL_RESULT_NAMES = new Set<string>(
  NEW_TOOL_RESULT_NAMES.filter(name => !DELIVERED_TOOL_NAMES.has(name))
)

export function hasPublishedToolResults(toolName: string): boolean {
  return TOOL_DEFINITIONS.some(tool => tool.name === toolName) && !PENDING_TOOL_RESULT_NAMES.has(toolName)
}

export function getToolsByModality(modality: ToolModality): ToolDefinition[] {
  return TOOL_DEFINITIONS.filter(tool => tool.modalities.includes(modality))
}

/**
 * 所有工具名称列表（用于类型约束）
 */
export const VELOCITY_TOOLS = TOOL_DEFINITIONS.map((tool) => tool.name) as readonly string[]

/**
 * 支持模拟数据入口的工具列表（仅这些工具会进入 simulated 结果页）
 *
 * 注意：
 * - 该列表表示“是否展示模拟数据入口”，不等同于“是否支持模拟指标（running time / memory 等）”。
 * - Cycle 工具（ExampleMethod09 / ExampleMethod10）在模拟数据中仅展示基础 velocity 结果（如 pseudotime），
 *   通过 excludesMetricResults 排除于所有指标筛选和指标结果构建。
 */
export const LEGACY_SIMULATION_SUPPORTED_TOOLS = [
  'ExampleMethod12',
  'ExampleMethod05',
  'ExampleMethod09',
  'ExampleMethod11',
  'ExampleMethod18',
  'ExampleMethod24',
  'ExampleMethod19',
  'ExampleMethod08',
  'ExampleMethod20',
  'ExampleMethod17',
  'ExampleMethod16',
  'ExampleMethod03',
  'ExampleMethod02',
  'ExampleMethod21',
  'ExampleMethod22',
  'ExampleMethod07',
  'ExampleMethod25',
  'ExampleMethod06',
  'ExampleMethod10',
  'ExampleMethod23',
  'MethodA',
  'ExampleMethod14',
  'MethodB'
] as const

export const SIMULATION_SUPPORTED_TOOLS = [...new Set([
  ...LEGACY_SIMULATION_SUPPORTED_TOOLS,
  ...benchmarkCatalogue.simulationToolNames
])]

const SIMULATION_SUPPORTED_TOOL_SET = new Set<string>(SIMULATION_SUPPORTED_TOOLS)

export const isSimulationSupportedTool = (toolName: string): boolean =>
  SIMULATION_SUPPORTED_TOOL_SET.has(toolName)

/**
 * 工具名称类型
 */
export type VelocityTool = (typeof VELOCITY_TOOLS)[number]

/**
 * 工具选项接口（用于筛选器组件）
 */
export interface ToolOption {
  /** 显示标签（优先使用 displayName，否则使用 name） */
  label: string
  /** 工具实际名称（与图片文件名匹配） */
  value: string
}

/**
 * 获取工具选项列表（用于筛选器）
 * @returns 工具选项数组，包含所有已注册工具
 */
export function getToolOptions(): ToolOption[] {
  return TOOL_DEFINITIONS.map((tool) => ({
    label: getToolPublicName(tool.name),
    value: tool.name
  }))
}

/**
 * 按分类获取工具列表
 * @param category 工具分类
 * @returns 指定分类的工具定义数组
 */
export function getToolsByCategory(
  category: ToolCategory
): ToolDefinition[] {
  return TOOL_DEFINITIONS.filter((tool) => tool.category === category)
}

/**
 * 根据工具名称获取工具定义
 * @param name 工具名称
 * @returns 工具定义对象，如果不存在则返回 undefined
 */
export function getToolByName(name: string): ToolDefinition | undefined {
  return TOOL_DEFINITIONS.find((tool) => tool.name === name)
}

/**
 * 未登记 scRNA 支持的工具；仅描述模态范围，不限制独立的 Usability 评分。
 */
export const NON_RNA_VELOCITY_TOOLS = TOOL_DEFINITIONS
  .filter(tool => !tool.modalities.includes('scRNA'))
  .map(tool => tool.name)

export type NonRnaVelocityTool = (typeof NON_RNA_VELOCITY_TOOLS)[number]

const TOOL_NAME_ALIASES: Record<string, string> = {
  'sc kinetics': 'ExampleMethod15',
  'sc rna kinetics': 'ExampleMethod16'
}

const TOOL_INPUT_LOOKUP = new Map<string, string | null>()

function registerToolLookup(input: string | undefined, toolName: string) {
  const normalized = input?.trim().toLowerCase()
  if (!normalized) return

  const existing = TOOL_INPUT_LOOKUP.get(normalized)
  if (existing && existing !== toolName) {
    TOOL_INPUT_LOOKUP.set(normalized, null)
    return
  }

  if (!existing) {
    TOOL_INPUT_LOOKUP.set(normalized, toolName)
  }
}

TOOL_DEFINITIONS.forEach((tool) => {
  registerToolLookup(tool.name, tool.name)
  registerToolLookup(tool.displayName, tool.name)
  registerToolLookup(tool.csvName, tool.name)
})

Object.entries(TOOL_NAME_ALIASES).forEach(([alias, toolName]) => {
  registerToolLookup(alias, toolName)
})

export function getToolPublicName(toolName: string): string {
  const resolvedToolName = resolveToolName(toolName) ?? toolName
  const definition = getToolByName(resolvedToolName)
  return definition?.displayName ?? definition?.csvName ?? definition?.name ?? toolName
}

export function getToolCsvMethodName(internalToolName: string): string {
  const resolvedToolName = resolveToolName(internalToolName) ?? internalToolName
  const definition = getToolByName(resolvedToolName)
  return definition?.csvName ?? definition?.displayName ?? definition?.name ?? internalToolName
}

export function resolveToolName(input: string): string | null {
  const normalized = input.trim().toLowerCase()
  if (!normalized) {
    return null
  }

  const direct = TOOL_INPUT_LOOKUP.get(normalized)
  if (direct !== undefined) {
    return direct
  }

  return null
}

export const USABILITY_METHOD_NAMES = Array.from(new Set(
  TOOL_DEFINITIONS
    .filter((tool) => tool.modalities.some(modality => ['scRNA', 'ATAC', 'SPATIAL', 'LINEAGE'].includes(modality)))
    .map((tool) => getToolCsvMethodName(tool.name))
))

/**
 * 内部工具名称与 Usability CSV Method 字段的映射表
 * 用于路由守卫与链接参数统一转换，确保 URL 与 CSV 数据一致
 */
export const TOOL_NAME_TO_CSV_METHOD: Record<string, string> = Object.fromEntries(
  TOOL_DEFINITIONS.map((tool) => [tool.name, getToolCsvMethodName(tool.name)])
)

/**
 * 获取 Usability 指标使用的工具名称（CSV Method 字段）
 * @param internalToolName 内部工具名称（如 ExampleMethod13、ExampleMethod02）
 */
export function getUsabilityMethodName(internalToolName: string): string {
  return getToolCsvMethodName(internalToolName)
}
