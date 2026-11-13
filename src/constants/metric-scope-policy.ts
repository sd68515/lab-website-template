import exclusions from './metricScopePolicy.json'

const normalizedMetric = (metric: string): string => metric.toLowerCase().replace(/[-_\s]+/g, '')
const spatialExcluded = new Set(exclusions.SPATIAL.map(normalizedMetric))

/** Spatial Time/Velocity consistency replace these local smoothing metrics. */
export function isMetricSupportedInScope(metric: string, scope: string): boolean {
  return scope.toUpperCase() !== 'SPATIAL' || !spatialExcluded.has(normalizedMetric(metric))
}
