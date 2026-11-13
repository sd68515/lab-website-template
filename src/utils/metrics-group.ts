/**
 * 指标分组工具函数
 * 将指标按通用指标与模拟专属指标分组
 */

/**
 * 带有指标名称字段的接口（泛型约束）
 */
export interface MetricWithName {
  category: string
}

/**
 * 指标分组结果接口
 */
export interface MetricGroup<T extends MetricWithName> {
  title: string
  metrics: T[]
}

import { GENERAL_METRICS_ORDER, SIMULATION_METRICS_ORDER, SPATIAL_METRICS_ORDER } from '@/constants/metrics'

/**
 * 将指标按通用指标与模拟专属分组
 *
 * 说明：
 * - 此处 metrics 的 category 值是“指标名称”，而不是元数据中的 'general'/'simulation-specific'
 * - 使用 GENERAL_METRICS_ORDER / SIMULATION_METRICS_ORDER（指标名称列表）来归类
 */
export function groupMetricsForDisplay<T extends MetricWithName & { name?: string }>(
  metrics: T[]
): MetricGroup<T>[] {
  if (!metrics || metrics.length === 0) {
    return []
  }

  const generalMetrics = metrics.filter((m) =>
    GENERAL_METRICS_ORDER.includes(m.category as typeof GENERAL_METRICS_ORDER[number])
  )

  const simulationMetrics = metrics.filter((m) =>
    SIMULATION_METRICS_ORDER.includes(m.category as typeof SIMULATION_METRICS_ORDER[number])
  )

  const spatialMetrics = metrics.filter((m) =>
    SPATIAL_METRICS_ORDER.includes(m.category as typeof SPATIAL_METRICS_ORDER[number])
  )

  const groups: MetricGroup<T>[] = []

  // 添加通用指标组（如果有）
  if (generalMetrics.length > 0) {
    groups.push({
      title: 'General metrics',
      metrics: generalMetrics
    })
  }

  // 添加模拟专属指标组（如果有）
  if (simulationMetrics.length > 0) {
    groups.push({
      title: 'Simulation-specific metrics',
      metrics: simulationMetrics
    })
  }

  if (spatialMetrics.length > 0) {
    groups.push({
      title: 'Spatial metrics',
      metrics: spatialMetrics
    })
  }

  return groups
}
