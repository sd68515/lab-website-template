/**
 * 数据集常量配置
 * 定义真实数据集标签、多组学数据集白名单及工具支持映射
 */

import {
  TOPOLOGY_DEFINITIONS,
  STANDARD_SIMULATION_TOPOLOGY_KEY_SET,
  STANDARD_FULL_SIZES,
  EFFICIENCY_ONLY_SIZES,
  TOPOLOGY_SIZE_RESTRICTIONS,
  sizeKey
} from './simulation'
import benchmarkCatalogue from './generated/benchmarkCatalogue.json'
import { REAL_DATASET_LABELS } from './generated/realDatasetLabels'
import { TOOL_DEFINITIONS, VELOCITY_TOOLS, type ToolModality } from './tools'
export { REAL_DATASET_LABELS } from './generated/realDatasetLabels'
export type { RealDatasetLabel } from './generated/realDatasetLabels'

export const HOME_DATASET_TYPES = {
  REAL: 'real',
  SIMULATION_FULL: 'simulation_full'
} as const

export type DatasetTypeValue = (typeof HOME_DATASET_TYPES)[keyof typeof HOME_DATASET_TYPES]

// 真实数据集标签由 CSV 的 Display ID 列自动生成

/**
 * 根据数据集 ID 获取对应的标签
 * @param id - 数据集 ID（字符串或数字，从 1 开始）
 * @returns 数据集标签，若不存在则返回 "Dataset {id}"
 */
export const getRealDatasetLabel = (id: string | number): string => {
  const index = Number(id) - 1
  return REAL_DATASET_LABELS[index] ?? `Dataset ${id}`
}

const rangeDatasetIds = (start: number, end: number): string[] =>
  Array.from({ length: end - start + 1 }, (_, index) => String(start + index))

export const SC_RNA_REAL_DATASET_IDS = rangeDatasetIds(1, 2)

/**
 * Optional data-group IDs, empty in this example.
 */
export const ATAC_REAL_DATASET_IDS = rangeDatasetIds(1, 0)
export const ATAC_REAL_DATASET_ID_SET = new Set<string>(ATAC_REAL_DATASET_IDS)

/**
 * Optional data-group IDs, empty in this example.
 */
export const CHROMATIN_REAL_DATASET_IDS = [] as const
export const CHROMATIN_REAL_DATASET_ID_SET = new Set<string>(CHROMATIN_REAL_DATASET_IDS)

/**
 * Optional data-group IDs, empty in this example.
 */
export const SPATIAL_REAL_DATASET_IDS = rangeDatasetIds(1, 0)
export const SPATIAL_REAL_DATASET_ID_SET = new Set<string>(SPATIAL_REAL_DATASET_IDS)

export const LINEAGE_REAL_DATASET_IDS = rangeDatasetIds(1, 0)

/**
 * 多模态真实数据集 ID。按模态分组派生，避免独立维护另一份编号范围。
 */
export const MULTI_MODAL_REAL_DATASET_IDS = [
  ...SPATIAL_REAL_DATASET_IDS,
  ...CHROMATIN_REAL_DATASET_IDS,
  ...ATAC_REAL_DATASET_IDS,
  ...LINEAGE_REAL_DATASET_IDS
]
export const MULTI_MODAL_REAL_DATASET_ID_SET = new Set<string>(MULTI_MODAL_REAL_DATASET_IDS)

/**
 * 数据集范围；方法和图片的状态另按清单判断。
 */
export const REAL_RESULT_DATASET_ID_SET = new Set<string>([
  ...SC_RNA_REAL_DATASET_IDS,
  ...CHROMATIN_REAL_DATASET_IDS,
  ...benchmarkCatalogue.realDatasetIds
])

/**
 * 多组学数据集工具支持映射
 * 键为工具名称，值为该工具支持的多组学数据集 ID 数组
 * 若需要某工具支持特定多组学数据集，在此添加映射即可
 */
const REAL_DATASET_IDS_BY_TOOL_MODALITY: Record<ToolModality, readonly string[]> = {
  scRNA: SC_RNA_REAL_DATASET_IDS,
  ATAC: ATAC_REAL_DATASET_IDS,
  SPATIAL: SPATIAL_REAL_DATASET_IDS,
  LINEAGE: LINEAGE_REAL_DATASET_IDS,
  CHROMATIN: CHROMATIN_REAL_DATASET_IDS,
  // 周期工具的具体数据限制由cycle-support.ts统一判断。
  CYCLE: SC_RNA_REAL_DATASET_IDS
}

export const TOOL_REAL_DATASET_MODAL_RANGES: Record<string, readonly string[]> = Object.fromEntries(
  TOOL_DEFINITIONS.map(tool => [
    tool.name,
    [...new Set(tool.modalities.flatMap(modality => REAL_DATASET_IDS_BY_TOOL_MODALITY[modality]))]
  ])
)

export const TOOL_REAL_DATASET_MODAL_RANGE_SETS: Record<string, Set<string>> = Object.fromEntries(
  Object.entries(TOOL_REAL_DATASET_MODAL_RANGES).map(([tool, ids]) => [tool, new Set(ids)])
)

export const MULTI_MODAL_REAL_DATASET_TOOL_SUPPORT: Record<string, readonly string[]> = Object.fromEntries(
  Object.entries(TOOL_REAL_DATASET_MODAL_RANGES).map(([tool, ids]) => [
    tool,
    ids.filter(id => MULTI_MODAL_REAL_DATASET_ID_SET.has(id))
  ])
)

/**
 * 模拟数据集 ID 列表
 * 用于 General Metrics 页面的数据筛选
 */
export const SIMULATED_DATASET_IDS = [
  'linear-simple_cell120_gene80',
  'bifurcating_cell240_gene80'
] as const

/**
 * 模拟数据集 ID 类型
 */
export type SimulatedDatasetId = (typeof SIMULATED_DATASET_IDS)[number]

/**
 * 数据集选项接口（用于 DatasetFilter 组件）
 */
export interface DatasetOption {
  label: string
  value: string | number
}

/**
 * 获取真实数据集选项列表（用于筛选器）
 * @returns 真实数据集选项数组
 */
export function getRealDatasetOptions(): DatasetOption[] {
  return REAL_DATASET_LABELS
    .map((label, index) => {
      const id = index + 1
      return {
        label,
        value: id
      }
    })
    .filter(option => ALLOWED_REAL_DATASET_IDS.has(String(option.value)))
}

/**
 * 获取模拟数据集选项列表（用于筛选器）
 * @returns 模拟数据集选项数组
 */
export function getSimulatedDatasetOptions(): DatasetOption[] {
  return SIMULATED_DATASET_IDS.map((id) => ({
    label: id,
    value: id
  }))
}

/**
 * 路由验证用的常量（用于非法 URL 拦截）
 */

/**
 * 真实数据白名单
 * 该集合是“真实数据是否开放”的单一真源：
 * - 路由守卫基于此集合进行合法性校验
 * - 首页/页面内筛选应仅基于此集合决定可见性
 */
export const ALLOWED_REAL_DATASET_IDS = new Set(
  REAL_DATASET_LABELS.map((_, index) => String(index + 1))
)

export const SIM_FULL_COMBOS: Record<
  string,
  {
    full: Array<[cells: number, genes: number]>
    efficiencyOnly: Array<[cells: number, genes: number]>
  }
> = Object.fromEntries(
  TOPOLOGY_DEFINITIONS
    .filter(t => STANDARD_SIMULATION_TOPOLOGY_KEY_SET.has(t.key))
    .map(topology => {
      const restrictions = TOPOLOGY_SIZE_RESTRICTIONS[topology.key] ?? new Set<string>();

      const full = STANDARD_FULL_SIZES
        .filter(spec => !restrictions.has(sizeKey(spec.cells, spec.genes)))
        .map(spec => [spec.cells, spec.genes] as [number, number]);

      const efficiencyOnly = EFFICIENCY_ONLY_SIZES
        .filter(spec => !restrictions.has(sizeKey(spec.cells, spec.genes)))
        .map(spec => [spec.cells, spec.genes] as [number, number]);

      return [topology.label, { full, efficiencyOnly }];
    })
);

/**
 * Groundtruth stream 缺失配置
 * 所有拓扑均缺失 Groundtruth stream 的效率专用尺度。
 */
export const GROUNDTRUTH_STREAM_GLOBAL_UNAVAILABLE = new Set<string>([
  '120*320'
]);

/**
 * 工具白名单（从 tools.ts 动态派生）
 * 用途：验证 methodResult 路由的 tool 参数是否合法
 */
export const SUPPORTED_TOOLS = new Set<string>([...VELOCITY_TOOLS, 'ExampleMethod16'])
