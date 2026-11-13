import manifest from './generated/benchmarkResultManifest.json'
import { isResultUnable, isMetricUnable } from './result-missing-truth'
import { excludesMetricResults } from './result-display'
import { isMetricSupportedInScope } from './metric-scope-policy'
import {
  ATAC_REAL_DATASET_ID_SET,
  CHROMATIN_REAL_DATASET_ID_SET,
  LINEAGE_REAL_DATASET_IDS,
  SPATIAL_REAL_DATASET_ID_SET
} from './datasets'
import { findSimulationDatasetById } from './simulation'
import { getToolByName, type ToolModality } from './tools'

export type BenchmarkResultState = 'ready' | 'unable_to_compute' | 'not_applicable' | 'pending'
export type BenchmarkDatasetType = 'real' | 'simulation'

const figures: Readonly<Record<string, number>> = manifest.figures
const legacyFigures: Readonly<Record<string, number>> = manifest.legacyFigures
const aggregates: Readonly<Record<string, number>> = manifest.aggregates
const scRnaTools = new Set<string>(manifest.scRnaTools)
const lineageIds = new Set<string>(LINEAGE_REAL_DATASET_IDS)

const FIGURE_BITS: Readonly<Record<string, number>> = {
  umap: 1, stream: 2, grid: 4, pseudotime: 8,
  'Angle consistency': 16, 'Consistency score detailed': 32
}
const AGGREGATE_BITS: Readonly<Record<string, number>> = {
  ICCoh: 1, CBDir: 2, 'Transition score': 4, 'Consistency score': 8
}
export const PATH_DEPENDENT_METRICS = new Set(['Angle consistency', 'CBDir', 'Transition score'])
export const REAL_DATASETS_WITHOUT_LINEAGE = new Set<string>()

/** A dataset-level explanation; method-specific exclusions must not inherit it. */
export function getDatasetMetricNotApplicableReason(
  metric: string, id: string, type: BenchmarkDatasetType
): string | null {
  return type === 'real' && REAL_DATASETS_WITHOUT_LINEAGE.has(id) && PATH_DEPENDENT_METRICS.has(metric)
    ? 'No reference differentiation path provided.'
    : null
}

export function getBenchmarkModality(id: string, type: BenchmarkDatasetType): ToolModality {
  if (type === 'simulation') return findSimulationDatasetById(id)?.modality ?? 'scRNA'
  if (SPATIAL_REAL_DATASET_ID_SET.has(id)) return 'SPATIAL'
  if (ATAC_REAL_DATASET_ID_SET.has(id)) return 'ATAC'
  if (lineageIds.has(id)) return 'LINEAGE'
  if (CHROMATIN_REAL_DATASET_ID_SET.has(id)) return 'CHROMATIN'
  return 'scRNA'
}

function isManagedCombination(tool: string, id: string, type: BenchmarkDatasetType): boolean {
  const modality = getBenchmarkModality(id, type)
  return modality === 'ATAC' || modality === 'SPATIAL' || modality === 'LINEAGE' || scRnaTools.has(tool) ||
    (((figures[`${type}|${id}|${tool}`] ?? 0) & 15) !== 0)
}

export function isToolInSimulationModality(tool: string, id: string): boolean {
  const modality = getBenchmarkModality(id, 'simulation')
  const definition = getToolByName(tool)
  return Boolean(definition?.modalities.includes(modality)) ||
    (modality === 'scRNA' && Boolean(definition?.modalities.includes('CYCLE')))
}

export function getBenchmarkMetricFolder(id: string, isSimulation: boolean): string {
  const modality = getBenchmarkModality(id, isSimulation ? 'simulation' : 'real')
  const suffix = isSimulation ? '_sim' : ''
  if (modality === 'ATAC') return `General_Metrics_atac${suffix}`
  if (modality === 'SPATIAL') return `General_Metrics_spatial${suffix}`
  if (modality === 'LINEAGE') return 'General_Metrics_lineage'
  return isSimulation ? 'General_Metrics_sim' : 'General_Metrics_real'
}

/** Only delivered results and explicitly documented failures open a new combination. */
export function getBenchmarkCombinationState(
  tool: string, id: string, type: BenchmarkDatasetType
): BenchmarkResultState | null {
  const key = `${type}|${id}|${tool}`
  if (isResultUnable(tool, id, type)) return 'unable_to_compute'
  if (((figures[key] ?? 0) & 15) !== 0) return 'ready'
  return isManagedCombination(tool, id, type) ? 'pending' : null
}

/** null delegates unchanged legacy combinations to their existing rules. */
export function getBenchmarkFigureState(
  tool: string, id: string, type: BenchmarkDatasetType, figure: string
): BenchmarkResultState | null {
  if (!isMetricSupportedInScope(figure, getBenchmarkModality(id, type))) return 'not_applicable'
  if (excludesMetricResults(tool) &&
    (AGGREGATE_BITS[figure] || figure === 'Angle consistency' || figure === 'Consistency score detailed')) {
    return 'not_applicable'
  }
  if (getDatasetMetricNotApplicableReason(figure, id, type)) {
    return 'not_applicable'
  }
  if (figure === 'Ground-truth correlation' &&
    (type === 'real' || getBenchmarkModality(id, type) === 'SPATIAL' || id.startsWith('lineage-tracing_rep'))) {
    return 'not_applicable'
  }
  // 工具指标适用性优先于数据级总图的交付状态。
  if (tool === 'ExampleMethod20' &&
    (figure === 'ICCoh' || figure === 'Transition score' ||
      figure === 'Consistency score' || figure === 'Consistency score detailed')) {
    return 'not_applicable'
  }

  const combination = getBenchmarkCombinationState(tool, id, type)
  if (combination === 'unable_to_compute') return combination
  if (isMetricUnable(tool, id, type, figure)) return 'unable_to_compute'
  const key = `${type}|${id}|${tool}`
  const bit = FIGURE_BITS[figure]
  if (bit && (((figures[key] ?? legacyFigures[key]) ?? 0) & bit) !== 0) return 'ready'
  const aggregateBit = AGGREGATE_BITS[figure]
  if (aggregateBit && ((aggregates[`${type}|${id}`] ?? 0) & aggregateBit) !== 0) return 'ready'

  if (bit || aggregateBit) {
    if ((bit && Object.prototype.hasOwnProperty.call(legacyFigures, key)) ||
      isManagedCombination(tool, id, type) || (tool === '*' && aggregates[`${type}|${id}`] !== undefined)) {
      return 'pending'
    }
  }
  return null
}
