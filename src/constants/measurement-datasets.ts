/**
 * Measurement 页面专用数据集配置
 * 定义各指标在真实数据集上的可用范围、额外数据集以及 Out of metric 列表
 */

import {
  ATAC_REAL_DATASET_IDS,
  SPATIAL_REAL_DATASET_IDS,
  LINEAGE_REAL_DATASET_IDS,
  REAL_RESULT_DATASET_ID_SET,
  SC_RNA_REAL_DATASET_IDS,
  getRealDatasetLabel,
  type DatasetOption
} from '@/constants/datasets'
import { isMetricSupportedInScope } from './metric-scope-policy'
import { REAL_DATASETS_WITHOUT_LINEAGE, getBenchmarkFigureState } from './benchmark-results'
import { getMetricById } from './metrics'

/**
 * 已接入通用指标的真实数据：scRNA、Spatial、ATAC 与 Lineage。
 * Chromatin 专属数据只有 stream，不进入通用指标筛选器。
 */
// 名称沿用旧常量，表示 General Metrics 使用的基础真实数据集 ID 列表
export const CROSS_DATASET_REAL_BASE_IDS: readonly string[] = [
  ...SC_RNA_REAL_DATASET_IDS,
  ...ATAC_REAL_DATASET_IDS,
  ...SPATIAL_REAL_DATASET_IDS,
  ...LINEAGE_REAL_DATASET_IDS
].filter(id => REAL_RESULT_DATASET_ID_SET.has(id))

type MetricDatasetConfig = {
  extraRealDatasets?: readonly string[]
  outOfMetricRealDatasets?: readonly string[]
  unableToComputeRealDatasets?: readonly string[]
}

/**
 * General Metrics 的真实数据配置
 * key 对应 metrics.ts 中的 metric id
 */
const METRIC_REAL_DATASET_CONFIG: Record<string, MetricDatasetConfig> = {
  'cbdir': {
    outOfMetricRealDatasets: [...REAL_DATASETS_WITHOUT_LINEAGE]
  },
  'transition-score': {
    outOfMetricRealDatasets: [...REAL_DATASETS_WITHOUT_LINEAGE]
  },
  'angle-consistency': {
    outOfMetricRealDatasets: [...REAL_DATASETS_WITHOUT_LINEAGE]
  },
  // ICCoh / Consistency score 没有额外或缺失配置
}

/**
 * 获取指定指标的真实数据集选项
 * - 合并基础编号与额外数据集
 * - 结果按编号排序
 */
export function getRealDatasetOptionsForMetric(
  metricId: string,
  { role = 'tool', includeInapplicable = false }: { role?: 'aggregate' | 'tool'; includeInapplicable?: boolean } = {}
): DatasetOption[] {
  const config = METRIC_REAL_DATASET_CONFIG[metricId] ?? {}
  const ids = new Set<string>(CROSS_DATASET_REAL_BASE_IDS)

  config.extraRealDatasets?.forEach(id => ids.add(id))
  if (!isMetricSupportedInScope(metricId, 'SPATIAL')) {
    SPATIAL_REAL_DATASET_IDS.forEach(id => ids.delete(id))
  }

  return Array.from(ids)
    .filter(id => includeInapplicable || (
      !isRealDatasetOutOfMetric(metricId, id) &&
      // A missing aggregate does not exclude available tool-specific results for this dataset.
      (role !== 'aggregate' || getBenchmarkFigureState('*', id, 'real', getMetricById(metricId)?.name ?? metricId) !== 'not_applicable')
    ))
    .map(id => ({
      value: Number(id),
      label: getRealDatasetLabel(id)
    }))
    .sort((a, b) => Number(a.value) - Number(b.value))
}

/**
 * 判断指定指标在真实数据集上是否为 Out of metric
 */
export function isRealDatasetOutOfMetric(metricId: string, datasetId: string | number): boolean {
  const config = METRIC_REAL_DATASET_CONFIG[metricId]
  if (!config?.outOfMetricRealDatasets) {
    return false
  }
  return config.outOfMetricRealDatasets.includes(String(datasetId))
}

/**
 * 判断指定指标在真实数据集上是否为 Unable to compute
 */
export function isRealDatasetUnableToCompute(metricId: string, datasetId: string | number): boolean {
  const config = METRIC_REAL_DATASET_CONFIG[metricId]
  if (!config?.unableToComputeRealDatasets) {
    return false
  }
  return config.unableToComputeRealDatasets.includes(String(datasetId))
}
