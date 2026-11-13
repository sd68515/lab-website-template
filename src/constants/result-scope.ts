import {
  ATAC_REAL_DATASET_ID_SET,
  CHROMATIN_REAL_DATASET_ID_SET,
  LINEAGE_REAL_DATASET_IDS,
  SC_RNA_REAL_DATASET_IDS,
  SPATIAL_REAL_DATASET_ID_SET
} from './datasets'
import { findSimulationDatasetById } from './simulation'
import { getToolByName, type ToolModality } from './tools'

export const RESULT_SCOPES = ['scRNA', 'ATAC', 'SPATIAL', 'LINEAGE', 'CHROMATIN'] as const
export type DatasetResultScope = (typeof RESULT_SCOPES)[number]
export type ResultScope = DatasetResultScope | 'all'

export const RESULT_SCOPE_LABELS: Record<DatasetResultScope, string> = {
  scRNA: 'Data group A',
  ATAC: 'Data group B',
  SPATIAL: 'Data group C',
  LINEAGE: 'Data group D',
  CHROMATIN: 'Data group E'
}

const REAL_SCOPE_ID_SETS: Record<DatasetResultScope, ReadonlySet<string>> = {
  scRNA: new Set(SC_RNA_REAL_DATASET_IDS),
  ATAC: ATAC_REAL_DATASET_ID_SET,
  SPATIAL: SPATIAL_REAL_DATASET_ID_SET,
  LINEAGE: new Set(LINEAGE_REAL_DATASET_IDS),
  CHROMATIN: CHROMATIN_REAL_DATASET_ID_SET
}

const TOOL_MODALITY_TO_SCOPE: Record<ToolModality, DatasetResultScope> = {
  scRNA: 'scRNA',
  ATAC: 'ATAC',
  SPATIAL: 'SPATIAL',
  LINEAGE: 'LINEAGE',
  CYCLE: 'scRNA',
  CHROMATIN: 'CHROMATIN'
}

/** Missing query means the legacy complete view; malformed or unknown values are rejected. */
export function parseResultScope(raw: unknown): ResultScope | null {
  if (raw === undefined) return 'all'
  if (typeof raw !== 'string') return null
  return raw === 'all' || (RESULT_SCOPES as readonly string[]).includes(raw)
    ? raw as ResultScope
    : null
}

export function getToolResultScopes(toolName: string): DatasetResultScope[] {
  const tool = getToolByName(toolName)
  if (!tool) return []
  const supported = new Set(tool.modalities.map(modality => TOOL_MODALITY_TO_SCOPE[modality]))
  return RESULT_SCOPES.filter(scope => supported.has(scope))
}

export function getDatasetResultScopes(
  datasetType: 'real' | 'simulation',
  datasetId: string
): DatasetResultScope[] {
  if (datasetType === 'real') {
    return RESULT_SCOPES.filter(scope => REAL_SCOPE_ID_SETS[scope].has(datasetId))
  }
  const special = findSimulationDatasetById(datasetId)
  if (special) {
    if (special.modality === 'ATAC') return ['ATAC']
    if (special.modality === 'SPATIAL') return ['SPATIAL']
    return ['scRNA']
  }
  return /_cell\d+_gene\d+$/.test(datasetId) ? ['scRNA'] : []
}

export function getResultCombinationScopes(
  toolName: string,
  datasetType: 'real' | 'simulation',
  datasetId: string
): DatasetResultScope[] {
  const toolScopes = new Set(getToolResultScopes(toolName))
  return getDatasetResultScopes(datasetType, datasetId).filter(scope => toolScopes.has(scope))
}

export function isResultScopeSupported(
  scope: ResultScope,
  availableScopes: readonly DatasetResultScope[]
): boolean {
  return scope === 'all' || availableScopes.includes(scope)
}
