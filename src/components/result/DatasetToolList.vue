<template>
  <div class="dataset-result-tools-container" :aria-busy="loading ? 'true' : undefined">
    <div
      v-for="(tool, toolIndex) in tools"
      :key="toolIndex"
      :id="tool.id"
      class="dataset-result-tool-section"
    >
      <div class="dataset-result-tool-header">
        <h2 class="dataset-result-tool-title" translate="no">{{ tool.displayName }}</h2>
        <p class="dataset-result-tool-description">
          {{ displayText(tool.description || `Results from ${tool.displayName} analysis on this dataset`) }}
        </p>
        <p v-if="tool.note" class="dataset-result-context-note">
          {{ tool.note }}
        </p>
      </div>

      <div class="dataset-result-tool-content">
        <ViewportLazyMount :min-height="resolveToolPlaceholderHeight(tool)">
          <ResultImagePlaceholder
            v-if="tool.noResultTitle || tool.noResultReason"
            :placeholder="{
              mode: tool.noResultReason === 'Out of metric' ? 'metric' : 'compute',
              message: tool.noResultReason === 'Out of metric' ? 'Out of metric' : 'Unable to compute',
              reason: tool.noResultDetail || (tool.noResultReason !== 'Unable to compute' ? tool.noResultReason : null)
            }"
          />

          <template v-else>
            <VelocityResultsSection
              v-if="shouldRenderVelocitySection(tool)"
              :results="tool.velocityResults || []"
              :title="text('resultScopeTabs.results')"
              :placeholder="tool.velocityPlaceholder"
              :get-result-alt="(result) => velocityAltText(tool, result)"
              @image-load="handleVelocityImageLoad"
              @image-error="handleVelocityImageError"
            />

            <template v-for="group in tool.groupedMetrics" :key="group.title">
              <MetricsResultsSection
                v-if="group.metrics.length > 0"
                :title="group.title"
                :metrics="group.metrics"
                :enable-title-links="group.title !== 'Spatial metrics'"
                :current-tool="tool.name"
                v-bind="datasetIdentifier ? { currentDatasetId: datasetIdentifier } : {}"
                @image-load="handleMetricImageLoad"
                @image-error="handleMetricImageError"
              />
            </template>

            <StatusMessage
              v-if="(!tool.velocityResults || tool.velocityResults.length === 0) && (!tool.metricsResults || tool.metricsResults.length === 0)"
              state="empty"
              :title="text('datasetToolList.noResultsForValue1', { value1: String(tool.displayName) })"
              :description="text('datasetToolList.thisToolMayNotSupportThisDataset')"
            />
          </template>
        </ViewportLazyMount>
      </div>
    </div>

    <div v-if="loading" class="dataset-result-status-block">
      <StatusMessage
        state="loading"
        :title="text('datasetToolList.loadingResults')"
        :description="text('datasetToolList.pleaseWaitWhileWeRetrieveTheAnalysis')"
      />
    </div>
    <div v-else-if="tools.length === 0" class="dataset-result-status-block">
      <StatusMessage
        state="empty"
        :title="text('datasetToolList.noResultsAvailable')"
        :description="text('results.emptyScope')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { text, displayText } from '@/utils/locale'
import VelocityResultsSection from '@/components/common/VelocityResultsSection.vue'
import MetricsResultsSection from '@/components/common/MetricsResultsSection.vue'
import StatusMessage from '@/components/common/StatusMessage.vue'
import ViewportLazyMount from '@/components/common/ViewportLazyMount.vue'
import ResultImagePlaceholder from '@/components/common/ResultImagePlaceholder.vue'
import { getToolPublicName } from '@/constants/tools'
import { excludesMetricResults } from '@/constants/result-display'
import { useResultImages } from '@/composables/result'
import type { DatasetTool, MetricCategorySection, VelocityResultEntry } from '@/types'
import type { MetricGroup } from '@/utils/metrics-group'
import type { ResultScope } from '@/constants/result-scope'

type DatasetToolWithId = DatasetTool & {
  id: string
  groupedMetrics: MetricGroup<MetricCategorySection>[]
}

defineProps<{
  tools: DatasetToolWithId[]
  loading: boolean
  scope: ResultScope
  datasetIdentifier?: string | undefined
}>()

const { handleVelocityImageLoad, handleVelocityImageError, handleMetricImageLoad, handleMetricImageError } = useResultImages()

const velocityAltText = (tool: DatasetToolWithId, result: VelocityResultEntry): string => {
  const toolLabel = getToolPublicName(tool.name)
  const plotLabel = (result.label || '').trim()
  if (!plotLabel) return `${toolLabel} result`
  return `${toolLabel} ${plotLabel} result`
}

const shouldRenderVelocitySection = (tool: DatasetToolWithId): boolean => {
  return (tool.velocityResults && tool.velocityResults.length > 0) || !!tool.velocitySectionPlaceholder
}

const resolveMetricPlaceholderHeight = (metrics: MetricCategorySection[]): number => {
  if (metrics.length <= 0) return 0

  return metrics.reduce((total, metric) => {
    if (metric.placeholder) return total + 180
    if (metric.category === 'Usability') return total + 56

    const imageCount = metric.images?.filter((image) => !image.placeholder).length ?? 0
    const fallbackImageCount = metric.images?.length ? Math.max(imageCount, 1) : 0
    const imageHeight = metric.category === 'Consistency score' ? 480 : 450
    return total + 86 + (fallbackImageCount * imageHeight)
  }, 180)
}

const resolveToolPlaceholderHeight = (tool: DatasetToolWithId): number => {
  if (tool.noResultTitle || tool.noResultReason) return 220

  if (excludesMetricResults(tool.name)) {
    return tool.velocityResults.length === 1 ? 620 : 540
  }

  const velocityResultCount = tool.velocityResults?.filter((result) => !result.placeholder).length ?? 0
  const velocityHeight = shouldRenderVelocitySection(tool)
    ? Math.max(500, 140 + Math.ceil(Math.max(velocityResultCount, 1) / 2) * 450)
    : 0

  const metricsHeight = tool.groupedMetrics.reduce((total, group) => {
    if (group.metrics.length === 0) return total
    return total + resolveMetricPlaceholderHeight(group.metrics)
  }, 0)

  return Math.max(420, Math.min(5200, velocityHeight + metricsHeight + 120))
}
</script>
