import type { ComputedRef, Ref } from 'vue'
import { useResultsData } from '@/composables/useResultsData'
import type { ResultRouteState } from '@/types'
import type { ToolNoResultConfig } from '@/constants/results/noResultConfig'

export interface UseResultSectionsOptions {
  routeState: Ref<ResultRouteState | undefined> | ComputedRef<ResultRouteState | undefined>
  noResultConfig?: Ref<Record<string, ToolNoResultConfig>>
}

export function useResultSections(options: UseResultSectionsOptions) {
  const data = useResultsData({
    routeState: options.routeState,
    ...(options.noResultConfig ? { noResultConfig: options.noResultConfig } : {})
  })

  return {
    toolResults: data.toolResults,
    toolResultsLoading: data.toolResultsLoading,
    datasetSections: data.datasetSections,
    sectionsLoading: data.sectionsLoading,
    toolCategories: data.toolCategories,
    refresh: data.refresh
  }
}
