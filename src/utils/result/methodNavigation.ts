import type { DatasetSection } from '@/types/results'
import { getResultScopeLabel, getTopologyLabel } from '@/constants/catalogueLabels'
import { getDatasetResultScopes, getResultCombinationScopes, RESULT_SCOPES, type DatasetResultScope } from '@/constants/result-scope'
import { ADDITIONAL_DATASETS, findSimulationDatasetById, formatNumberWithCommas } from '@/constants/simulation'
import type { ResultNavigationGroup, ResultNavigationSection } from '@/types/resultNavigation'
import { text } from '@/utils/locale'

const additionalDatasetIds = new Set(ADDITIONAL_DATASETS.map(dataset => dataset.id))

export function getMethodSectionScope(section: DatasetSection, toolName: string): DatasetResultScope | undefined {
  const datasetId = section.key.replace(/^(real|simulation)-/, '')
  return getResultCombinationScopes(toolName, section.type, datasetId)[0]
    ?? getDatasetResultScopes(section.type, datasetId)[0]
}

function simulationGroup(section: DatasetSection): { id: string; title: string } {
  const datasetId = section.simulation?.additionalId
  const dataset = datasetId ? findSimulationDatasetById(datasetId) : undefined
  const key = datasetId && additionalDatasetIds.has(datasetId)
    ? 'additional'
    : dataset?.topologyKey
  return {
    id: key ?? section.simulation?.shapeKey ?? section.key,
    title: key ? getTopologyLabel(key) : section.simulation?.shape ?? text('common.simulationGroup')
  }
}

function navigationItem(section: DatasetSection): ResultNavigationSection {
  const datasetId = section.simulation?.additionalId
  if (!datasetId) return { id: section.anchorId, label: section.navigationLabel, fullLabel: section.title }
  const dataset = findSimulationDatasetById(datasetId)
  let label = datasetId
  if (dataset?.cells !== undefined && dataset.genes !== undefined) {
    const scale = `${formatNumberWithCommas(dataset.cells)} × ${formatNumberWithCommas(dataset.genes)}`
    if (additionalDatasetIds.has(datasetId)) {
      label = `${datasetId} · ${getTopologyLabel(dataset.topologyKey)} · ${scale}`
    } else if (dataset.topologyKey === 'bursting-tree') {
      label = `${dataset.marker ?? ''} · ${scale}`
    } else {
      // Preserve the numbered condition and sparse percentage that distinguish ATAC datasets.
      label = datasetId.replace(/_cell\d+_gene\d+/, ` · ${scale}`).replaceAll('_', ' · ')
    }
  } else if (dataset?.topologyKey === 'lineage-tracing') {
    label = dataset.marker ?? datasetId

  }
  return { id: section.anchorId, label, fullLabel: datasetId, wrapText: true }
}

/** One tree defines both the sidebar hierarchy and the order of result articles. */
export function buildMethodNavigationGroups(
  sections: readonly DatasetSection[],
  toolName: string,
  spatialBaseline: boolean
): ResultNavigationGroup[] {
  const sectionScopes = new Map(sections.map(section => {
    const scope = getMethodSectionScope(section, toolName)
    if (!scope) throw new Error(`Dataset has no data modality: ${section.key}`)
    return [section.anchorId, scope] as const
  }))
  const scopes = RESULT_SCOPES.filter(scope => [...sectionScopes.values()].includes(scope))
  const showModality = scopes.length > 1
  return scopes.flatMap(scope => {
    const scopedSections = sections.filter(section => sectionScopes.get(section.anchorId) === scope)
    const sources: ResultNavigationGroup[] = []
    const realSections = scopedSections.filter(section => section.type === 'real')
    if (realSections.length) {
      sources.push({ id: `${scope}-real`, title: text('common.realData'), items: realSections.map(navigationItem) })
    }
    const simulatedSections = scopedSections.filter(section => section.type === 'simulation')
    if (simulatedSections.length) {
      const source: ResultNavigationGroup = { id: `${scope}-simulation`, title: text('common.simulatedData') }
      if (scope === 'scRNA') {
        const groups = new Map<string, ResultNavigationGroup>()
        for (const section of simulatedSections) {
          const group = simulationGroup(section)
          const id = `${scope}-simulation-${group.id}`
          const existing = groups.get(id)
          if (existing) existing.items?.push(navigationItem(section))
          else groups.set(id, { id, title: group.title, items: [navigationItem(section)] })
        }
        source.subGroups = [...groups.values()]
      } else {
        source.items = simulatedSections.map(navigationItem)
      }
      sources.push(source)
    }
    return showModality ? [{
      id: `modality-${scope}`,
      title: scope === 'SPATIAL' && spatialBaseline ? text('scope.spatialBaseline') : getResultScopeLabel(scope),
      subGroups: sources
    }] : sources
  })
}
