import { getToolsByScientificType, TOOL_DEFINITIONS } from './tools'

const rnaMethods = getToolsByScientificType('rna-velocity')
const rnaOnlyMultiOmics = rnaMethods.filter(tool => tool.category === 'Category C').length
const chromatin = getToolsByScientificType('chromatin-velocity').length
const chromatinAided = getToolsByScientificType('chromatin-aided').length

/** Method classification is separate from the datasets on which a tool was evaluated. */
export const BENCHMARK_METHOD_COUNTS = {
  configurations: TOOL_DEFINITIONS.length,
  rnaConfigurations: rnaMethods.length,
  traditionalRnaConfigurations: rnaMethods.length - rnaOnlyMultiOmics,
  overlappingConfigurations: rnaOnlyMultiOmics,
  lineageConfigurations: getToolsByScientificType('lineage-velocity').length,
  cycleConfigurations: getToolsByScientificType('cycle-inference').length,
  multiOmicsConfigurations: chromatin + chromatinAided,
  chromatinConfigurations: chromatin,
  chromatinAidedConfigurations: chromatinAided,
  spatialConfigurations: getToolsByScientificType('spatial-velocity').length
} as const
