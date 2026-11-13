import truth from './generated/resultMissingTruth.json'

type DatasetType = 'real' | 'simulation'
const unable = new Set<string>(truth.unable)
const metricUnable = new Set<string>(truth.metricUnable)

export function isResultUnable(tool: string, id: string, type: DatasetType): boolean {
  return unable.has(`${type}|${id}|${tool}`)
}

export function isMetricUnable(tool: string, id: string, type: DatasetType, metric: string): boolean {
  const name = metric === 'Consistency score detailed' ? 'Consistency score' : metric
  return metricUnable.has(`${type}|${id}|${tool}|${name}`)
}
