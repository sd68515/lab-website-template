/**
 * 指标可见性/适用性策略
 */
import { SIMULATION_METRICS_ORDER } from './metrics';

export const SIMULATION_SPECIFIC_METRICS = [...SIMULATION_METRICS_ORDER] as const;

/**
 * 判断指标是否属于模拟专属
 */
export const isSimulationSpecificMetric = (metric: string) =>
  SIMULATION_SPECIFIC_METRICS.includes(metric as (typeof SIMULATION_SPECIFIC_METRICS)[number]);
