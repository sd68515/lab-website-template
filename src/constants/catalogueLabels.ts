import type { MessageKey } from '@/locales/en'
import { text } from '@/utils/locale'
import type { DatasetResultScope } from './result-scope'
import type { ToolCategory, ToolScientificType } from './tools'
import type { TopologyKey } from './simulation'
import type { EfficiencyTopology } from './efficiency-tools'

export const getResultScopeLabel = (scope: DatasetResultScope): string => text(`scope.${scope}`)
export const getScientificTypeLabel = (type: ToolScientificType): string => text(`scientificType.${type}`)
export const getTopologyLabel = (topology: TopologyKey | EfficiencyTopology): string =>
  topology === 'linear' || topology === 'bifurcation3' || topology === 'bifurcation5'
    ? text(`efficiency.topology.${topology}`)
    : text(`topology.${topology}`)

const TOOL_CATEGORY_MESSAGES = {
  'Category A': 'toolCategory.rna',
  'Category B': 'toolCategory.cycle',
  'Category C': 'toolCategory.multiOmics'
} as const satisfies Record<ToolCategory, MessageKey>

export const getToolCategoryLabel = (category: ToolCategory): string => text(TOOL_CATEGORY_MESSAGES[category])

/** Stable catalogue identities never depend on the current display language. */
export const CATALOGUE_VELOCITY_LABELS = {
  rna: 'catalogue.velocity.rna',
  cycle: 'catalogue.velocity.cycle',
  chromatin: 'catalogue.velocity.chromatin',
  'chromatin-aided': 'catalogue.velocity.chromatinAided',
  spatial: 'catalogue.velocity.spatial',
  lineage: 'catalogue.velocity.lineage'
} as const satisfies Record<string, MessageKey>

export const CATALOGUE_DATA_LABELS = {
  scrna: 'scope.scRNA',
  atac: 'scope.ATAC',
  spatial: 'scope.SPATIAL',
  lineage: 'scope.LINEAGE',
  chromatin: 'scope.CHROMATIN'
} as const satisfies Record<string, MessageKey>

function displayLabel(labels: Readonly<Record<string, MessageKey>>, value: string): string {
  const key = labels[value]
  // Unrecognized source categories retain their original spelling instead of losing data.
  return key ? text(key) : value
}

export const getVelocityLabel = (value: string): string => displayLabel(CATALOGUE_VELOCITY_LABELS, value)
export const getDataTypeLabel = (value: string): string => displayLabel(CATALOGUE_DATA_LABELS, value)
