import type { ComputedRef, Ref } from 'vue'
import { useResultsData } from '@/composables/useResultsData'
import type { ResultRouteState } from '@/types'
import type { ToolNoResultConfig } from '@/constants/results/noResultConfig'

export interface UseResultMetadataOptions {
  routeState: Ref<ResultRouteState | undefined> | ComputedRef<ResultRouteState | undefined>
  noResultConfig?: Ref<Record<string, ToolNoResultConfig>>
}

export function useResultMetadata(options: UseResultMetadataOptions) {
  const data = useResultsData({
    routeState: options.routeState,
    ...(options.noResultConfig ? { noResultConfig: options.noResultConfig } : {})
  })

  return {
    datasetTitle: data.datasetTitle,
    datasetDescription: data.datasetDescription,
    datasetDetailEntries: data.datasetDetailEntries,
    datasetInfoLoading: data.datasetInfoLoading,
    isRealDataset: data.isRealDataset,
    lineageValue: data.lineageValue,
    simulationMode: data.simulationMode,
    toolMetadata: data.toolMetadata,
    loadError: data.loadError,
    refresh: data.refresh
  }
}
