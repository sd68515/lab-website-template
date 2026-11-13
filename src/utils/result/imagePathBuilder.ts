import { resolveBenchmarkImageAsset } from '@/utils/path'

export function formatToolNameForFile(tool: string): string {
  return tool
}

export function resolveVelocityDisplayLabel(
  defaultLabel: string,
  datasetIdentifier: string,
  velocityType: string,
  isSimulation: boolean
): string {
  void datasetIdentifier
  void isSimulation
  return velocityType === 'cell_map' || velocityType === 'umap' ? 'Figure A' : defaultLabel
}

/** Result images are identified by dataset, method, and figure role. */
export function buildVelocityImagePath(
  tool: string,
  datasetIdentifier: string,
  velocityType: string,
  isSimulation: boolean
): string {
  const scope = isSimulation ? 'simulation' : 'real'
  const role = velocityType === 'umap' ? 'cell_map' : velocityType
  return resolveBenchmarkImageAsset(
    `images/benchmark/results/${scope}/${datasetIdentifier}/${formatToolNameForFile(tool)}/${role}.webp`
  )
}

export function buildMetricImagePath(
  metricName: string,
  tool: string,
  datasetIdentifier: string,
  isSimulation: boolean
): string {
  const scope = isSimulation ? 'simulation' : 'real'
  const metric = metricName.replace(/[-\s]+/g, '_').toLowerCase()
  if (metric === 'angle_consistency' || metric === 'consistency_score') {
    const filename = metric === 'consistency_score' ? 'consistency_score_detailed' : metric
    return resolveBenchmarkImageAsset(
      `images/benchmark/results/${scope}/${datasetIdentifier}/${formatToolNameForFile(tool)}/metrics/${filename}.webp`
    )
  }
  return resolveBenchmarkImageAsset(
    `images/benchmark/datasets/${scope}/${datasetIdentifier}/metrics/${metric}.webp`
  )
}
