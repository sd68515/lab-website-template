import { getTopologyLabel } from './catalogueLabels'
/**
 * 模拟数据集统一配置
 *
 * 命名约定：
 * - key/value：kebab-case，例如 'linear-simple'
 * - label：Title Case，例如 'Linear simple'
 * - sizeKey：'cells*genes'，例如 '120*80'（虚构示例）
 */

// ============================================================================
// 一、拓扑结构定义
// ============================================================================

export const TOPOLOGY_KEYS = {
  LINEAR_SIMPLE: 'linear-simple',
  CYCLE_SIMPLE: 'cycle-simple',
  BIFURCATING: 'bifurcating',
  BIFURCATING_LOOP: 'bifurcating-loop',
  CONSECUTIVE_BIFURCATING: 'consecutive-bifurcating',
  TRIFURCATING: 'trifurcating',
  DISCONNECTED: 'disconnected',
  BURSTING_TREE: 'bursting-tree',
  LINEAGE_TRACING: 'lineage-tracing',
  ADDITIONAL: 'additional',
  ATAC: 'atac',
  SPATIAL: 'spatial'
} as const;

export type TopologyKey = (typeof TOPOLOGY_KEYS)[keyof typeof TOPOLOGY_KEYS];

export interface TopologyDefinition {
  key: TopologyKey;
  label: string;
  /**
   * 拓扑模式描述，用于必要时在 UI 或文档中展示
   */
  pattern: string;
}

export const TOPOLOGY_DEFINITIONS: TopologyDefinition[] = [
  { key: 'linear-simple', label: 'Linear simple', pattern: 'Linear structure' },
  { key: 'cycle-simple', label: 'Cycle simple', pattern: 'Cycle structure' },
  { key: 'bifurcating', label: 'Bifurcating', pattern: 'Tree structure' },
  {
    key: 'bifurcating-loop',
    label: 'Bifurcating loop',
    pattern: 'Tree structure with cycle'
  },
  {
    key: 'consecutive-bifurcating',
    label: 'Consecutive bifurcating',
    pattern: 'Disconnected structure'
  },
  { key: 'trifurcating', label: 'Trifurcating', pattern: 'Tree structure' },
  {
    key: 'disconnected',
    label: 'Disconnected structure',
    pattern: 'Disconnected structure'
  },
  { key: 'bursting-tree', label: 'Example group A', pattern: 'Example structure A' },
  { key: 'lineage-tracing', label: 'Example group D', pattern: 'Example structure D' },
  { key: 'additional', label: 'Additional data', pattern: 'Various' },
  { key: 'atac', label: 'Example group B', pattern: 'Example structure B' },
  { key: 'spatial', label: 'Example group C', pattern: 'Example structure C' }
];

export const STANDARD_SIMULATION_TOPOLOGY_KEYS = [
  TOPOLOGY_KEYS.LINEAR_SIMPLE,
  TOPOLOGY_KEYS.CYCLE_SIMPLE,
  TOPOLOGY_KEYS.BIFURCATING,
  TOPOLOGY_KEYS.BIFURCATING_LOOP,
  TOPOLOGY_KEYS.CONSECUTIVE_BIFURCATING,
  TOPOLOGY_KEYS.TRIFURCATING,
  TOPOLOGY_KEYS.DISCONNECTED
] as const;
export const STANDARD_SIMULATION_TOPOLOGY_KEY_SET = new Set<TopologyKey>(STANDARD_SIMULATION_TOPOLOGY_KEYS);

export const DATASET_ID_SIMULATION_TOPOLOGY_KEYS = [
  TOPOLOGY_KEYS.ADDITIONAL,
  TOPOLOGY_KEYS.BURSTING_TREE,
  TOPOLOGY_KEYS.LINEAGE_TRACING,
  TOPOLOGY_KEYS.ATAC,
  TOPOLOGY_KEYS.SPATIAL
] as const;
export const DATASET_ID_SIMULATION_TOPOLOGY_KEY_SET = new Set<TopologyKey>(DATASET_ID_SIMULATION_TOPOLOGY_KEYS);

export type StandardSimulationTopologyKey = (typeof STANDARD_SIMULATION_TOPOLOGY_KEYS)[number];
export type DatasetIdSimulationTopologyKey = (typeof DATASET_ID_SIMULATION_TOPOLOGY_KEYS)[number];

// ============================================================================
// 二、参数规格定义（标准 / 效率 / 降采样 / 额外数据）
// ============================================================================

export interface SizeSpec {
  cells: number;
  genes: number;
}

/** Fictional dimensions used to demonstrate the cascading selectors. */
export const STANDARD_FULL_SIZES: readonly SizeSpec[] = [
  { cells: 120, genes: 80 },
  { cells: 120, genes: 160 },
  { cells: 240, genes: 80 }
]
export const EFFICIENCY_ONLY_SIZES: readonly SizeSpec[] = [{ cells: 120, genes: 320 }]
export const EXTRA_LARGE_EFFICIENCY_DATASETS: readonly string[] = [
  'extra-large_cell480_gene80', 'extra-large_cell960_gene80'
]
export const DOWNSAMPLING_DATASETS: readonly string[] = ['example-sample-60', 'example-sample-80']
export const ATAC_DOWNSAMPLING_DATASETS: readonly string[] = ['example-group-b-sample-60', 'example-group-b-sample-80']
export const ALL_STANDARD_SIZES: readonly SizeSpec[] = [...STANDARD_FULL_SIZES, ...EFFICIENCY_ONLY_SIZES]
export const TOPOLOGY_SIZE_RESTRICTIONS: Record<string, Set<string>> = {
  trifurcating: new Set(['240*80'])
}
export const GLOBAL_SIZE_EXCLUSIONS = new Set<string>()

export interface AdditionalDataset {
  id: string
  numericId: number
  topologyKey: TopologyKey
  cells: number
  genes: number
  hasGroundtruthStream: boolean
}
export interface SimulationDatasetWithId {
  id: string
  topologyKey: TopologyKey
  modality?: 'scRNA' | 'ATAC' | 'SPATIAL'
  marker?: string
  cells?: number
  genes?: number
  hasGroundtruthStream: boolean
  sourceRealDatasetId?: string
  differentiationPath?: string
}

/** IDs and values below are examples; replace them together for a real project. */
export const ADDITIONAL_DATASETS: readonly AdditionalDataset[] = [
  { id: 'example-extra-a', numericId: 1, topologyKey: 'linear-simple', cells: 120, genes: 80, hasGroundtruthStream: false },
  { id: 'example-extra-b', numericId: 2, topologyKey: 'bifurcating', cells: 240, genes: 80, hasGroundtruthStream: false }
]
export const BURSTING_TREE_DATASETS: readonly SimulationDatasetWithId[] = [
  { id: 'example-group-a-1', topologyKey: TOPOLOGY_KEYS.BURSTING_TREE, marker: 'example-1', cells: 120, genes: 80, hasGroundtruthStream: false }
]
export const LINEAGE_TRACING_DATASETS: readonly SimulationDatasetWithId[] = [
  { id: 'example-group-d-1', topologyKey: TOPOLOGY_KEYS.LINEAGE_TRACING, marker: 'example-1', hasGroundtruthStream: false }
]
export const ATAC_SIMULATION_DATASETS: readonly SimulationDatasetWithId[] = [
  { id: 'example-group-b-1', topologyKey: TOPOLOGY_KEYS.ATAC, modality: 'ATAC', cells: 120, genes: 80, hasGroundtruthStream: false }
]
export const SPATIAL_SIMULATION_DATASETS: readonly SimulationDatasetWithId[] = [
  { id: 'example-group-c-1', topologyKey: TOPOLOGY_KEYS.SPATIAL, modality: 'SPATIAL', cells: 120, genes: 80, hasGroundtruthStream: false }
]
export const DATASET_ID_SIMULATION_DATASETS: readonly SimulationDatasetWithId[] = [
  ...ADDITIONAL_DATASETS, ...BURSTING_TREE_DATASETS, ...LINEAGE_TRACING_DATASETS,
  ...ATAC_SIMULATION_DATASETS, ...SPATIAL_SIMULATION_DATASETS
]

// ============================================================================
// 五、辅助函数
// ============================================================================

export const sizeKey = (cells: number, genes: number): string => `${cells}*${genes}`;

export const parseSizeKey = (key: string): SizeSpec | null => {
  const match = key.match(/^(\d+)\*(\d+)$/);
  if (!match) return null;
  return { cells: Number(match[1]), genes: Number(match[2]) };
};

export const formatNumberWithCommas = (value: number | string): string => {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export const getTopologyByKey = (key: TopologyKey): TopologyDefinition | undefined => {
  return TOPOLOGY_DEFINITIONS.find((t) => t.key === key);
};

export const getTopologyByLabel = (label: string): TopologyDefinition | undefined => {
  return TOPOLOGY_DEFINITIONS.find((t) => t.label === label);
};

export const topologyKeyToLabel = (key: TopologyKey): string => {
  return getTopologyByKey(key)?.label ?? key;
};

export const topologyLabelToKey = (label: string): TopologyKey | undefined => {
  return getTopologyByLabel(label)?.key as TopologyKey | undefined;
};

/**
 * 获取拓扑可用的规格列表
 */
export const getAvailableSizesForTopology = (
  topologyKey: TopologyKey,
  includeEfficiencyOnly = false
): SizeSpec[] => {
  const baseSizes = includeEfficiencyOnly ? ALL_STANDARD_SIZES : STANDARD_FULL_SIZES;
  const restrictions = TOPOLOGY_SIZE_RESTRICTIONS[topologyKey];

  return baseSizes.filter((spec) => {
    const key = sizeKey(spec.cells, spec.genes);
    if (GLOBAL_SIZE_EXCLUSIONS.has(key)) return false;
    if (restrictions?.has(key)) return false;
    return true;
  }) as SizeSpec[];
};

// ============================================================================
// 六、组件专用数据生成函数
// ============================================================================

export interface SelectOption<T = string> {
  label: string;
  value: T;
}

/**
 * 获取拓扑选项列表
 */
export const getTopologyOptions = (): SelectOption[] => {
  return TOPOLOGY_DEFINITIONS.map((t) => ({ label: getTopologyLabel(t.key), value: t.key }));
};

/** scRNA dataset search uses topology only for transcriptomic simulations. */
export const getScRnaSimulationTopologyOptions = (): SelectOption[] =>
  getTopologyOptions().filter(({ value }) =>
    value !== TOPOLOGY_KEYS.ATAC &&
    value !== TOPOLOGY_KEYS.SPATIAL
  );

/**
 * 指定拓扑是否通过 Dataset ID 选择具体数据
 */
export const requiresSimulationDatasetIdSelection = (
  topologyKey: string | null | undefined
): topologyKey is DatasetIdSimulationTopologyKey => {
  if (!topologyKey) return false;
  return DATASET_ID_SIMULATION_TOPOLOGY_KEY_SET.has(topologyKey as TopologyKey);
};

/**
 * 根据 ID 查找模拟数据记录（Additional / Bursting tree / Lineage tracing）
 */
export const findSimulationDatasetById = (
  id: string | null | undefined
): SimulationDatasetWithId | undefined => {
  if (!id) return undefined;
  return DATASET_ID_SIMULATION_DATASETS.find((dataset) => dataset.id === id);
};

/**
 * 获取基于 Dataset ID 的模拟数据选项列表
 */
export const getDatasetIdBasedSimulationOptions = (
  topologyKey: string | null | undefined
): SelectOption[] => {
  if (!requiresSimulationDatasetIdSelection(topologyKey)) {
    return [];
  }

  const datasets =
    topologyKey === TOPOLOGY_KEYS.ADDITIONAL
      ? ADDITIONAL_DATASETS
      : DATASET_ID_SIMULATION_DATASETS.filter((dataset) => dataset.topologyKey === topologyKey);

  return datasets.map((dataset) => ({
      label: dataset.id,
      value: dataset.id
    }));
};

/**
 * 获取额外数据选项列表
 */
export const getAdditionalDatasetOptions = (): SelectOption[] => {
  return getDatasetIdBasedSimulationOptions(TOPOLOGY_KEYS.ADDITIONAL);
};

/**
 * 获取可用的细胞数选项
 */
export const getCellOptions = (
  topologyKey: TopologyKey,
  includeEfficiencyOnly = false
): SelectOption[] => {
  if (requiresSimulationDatasetIdSelection(topologyKey)) {
    return [];
  }
  const sizes = getAvailableSizesForTopology(topologyKey, includeEfficiencyOnly);
  const cells = [...new Set(sizes.map((s) => s.cells))].sort((a, b) => a - b);
  return cells.map((c) => ({
    label: `${formatNumberWithCommas(c)} Cells`,
    value: String(c)
  }));
};

/**
 * 获取可用的基因数选项
 */
export const getGeneOptions = (
  topologyKey: TopologyKey,
  cellCount: number,
  includeEfficiencyOnly = false
): SelectOption[] => {
  if (requiresSimulationDatasetIdSelection(topologyKey)) {
    return [];
  }
  const sizes = getAvailableSizesForTopology(topologyKey, includeEfficiencyOnly);
  const genes = sizes
    .filter((s) => s.cells === cellCount)
    .map((s) => s.genes)
    .sort((a, b) => a - b);
  return genes.map((g) => ({
    label: `${formatNumberWithCommas(g)} Genes`,
    value: String(g)
  }));
};
