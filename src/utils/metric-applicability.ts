// 指标适用性判断工具函数
import { GENERAL_METRICS_ORDER } from '@/constants/metrics'
import { isMetricSupportedInScope } from '@/constants/metric-scope-policy'
import { getBenchmarkModality } from '@/constants/benchmark-results'
import { parseDatasetIdToEfficiencyFilters } from '@/constants/efficiency-tools'

const isLineageTracingSimulationId = (id: string): boolean => id.startsWith('lineage-tracing_')

/**
 * 判断指标是否适用于指定数据
 *
 * 适用性规则：
 * - 真实数据：只显示现役通用指标（General Metrics）
 * - 模拟数据：显示通用指标 + 符合条件的 Simulation-Specific Metrics
 *
 * Simulation-Specific Metrics 适用性：
 * - Ground-truth correlation: scRNA 模拟数据（不含 lineage-tracing）及 ATAC 模拟数据
 * - Running time / Memory efficiency: 已登记的 scRNA / ATAC 资源评测规格
 * - Down-sampling: 仅 cellsub-bifurcating 或 genesub-bifurcating
 * - Batch-run: 仅带 _r[1-5] 后缀的数据
 *
 * @param metricName 指标名称（如 'ICCoh'）
 * @param datasetId 数据集 ID（字符串或数字）
 * @param dataType 数据类型（'real' 或 'simulated'）
 * @returns 是否适用该指标
 */
export function isMetricApplicable(
  metricName: string,
  datasetId: string | number,
  dataType: 'real' | 'simulated'
): boolean {
  const generalMetrics: readonly string[] = GENERAL_METRICS_ORDER
  const id = String(datasetId)
  const modality = getBenchmarkModality(id, dataType === 'real' ? 'real' : 'simulation')
  if (!isMetricSupportedInScope(metricName, modality)) return false

  // 适用模态中的通用指标。空间局部一致性指标已由空间专用指标替代。
  if (generalMetrics.includes(metricName)) {
    return true
  }

  // 真实数据不显示 Simulation-Specific 指标
  if (dataType === 'real') {
    return false
  }

  // 以下是 Simulation-Specific Metrics 的适用性判断
  if (metricName === 'Running time' || metricName === 'Memory efficiency') {
    return parseDatasetIdToEfficiencyFilters(id) !== null
  }
  if (modality === 'SPATIAL') {
    return metricName === 'Time consistency' || metricName === 'Velocity consistency'
  }
  if (modality === 'ATAC') return metricName === 'Ground-truth correlation'

  switch (metricName) {
    case 'Ground-truth correlation':
      // Lineage tracing 模拟数据仿照真实数据生成，不提供 Ground-truth correlation
      return !isLineageTracingSimulationId(id)

    case 'Down-sampling':
      // 仅 cellsub-bifurcating 或 genesub-bifurcating 数据适用
      return id.includes('cellsub-bifurcating') || id.includes('genesub-bifurcating')

    case 'Batch-run':
      // 仅带 _r[1-5] 后缀的数据适用
      return /_r[1-5]/.test(id)

    default:
      // 未知指标默认不适用
      return false
  }
}
