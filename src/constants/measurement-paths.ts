import { resolveBenchmarkImageAsset } from '@/utils/path'

/** Dataset-level metric artwork is shared by every method. */
export function buildAggregateMetricPath(metricName: string, datasetId: string | number, isSimulation: boolean) {
  const scope = isSimulation ? 'simulation' : 'real'
  const metric = metricName.replace(/[-\s]+/g, '_').toLowerCase()
  return resolveBenchmarkImageAsset(`images/benchmark/datasets/${scope}/${datasetId}/metrics/${metric}.webp`)
}
