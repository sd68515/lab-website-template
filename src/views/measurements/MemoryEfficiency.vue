<template>
  <div class="metric-detail-page efficiency-metric-page">
    <header
      class="metric-hero"
      role="banner"
      :aria-labelledby="heroTitleId"
      :aria-describedby="heroDescriptionId"
    >
      <div class="metric-hero__titles">
        <h1 :id="heroTitleId" class="metric-title">{{ displayText(metricInfo.displayName ?? metricInfo.name) }}</h1>
        <p :id="heroDescriptionId" class="metric-description">
          {{ displayText(metricInfo.description) }}
        </p>
      </div>
    </header>

    <section class="metric-filters">
      <EfficiencyMetricFilter
        v-model:modality="filterState.modality"
        v-model:scale="filterState.scale"
        v-model:topology="filterState.topology"
        v-model:selected-tools="filterState.selectedTools"
        v-model:y-axis-type="yAxisType"
        v-model:resource-type="memoryResourceType"
        :tool-options="availableTools"
        :linear-only="isExtraLargeScale || isTopologyComparison"
      />
    </section>

    <!-- 图例区域 -->
    <section
      v-if="canRenderChart && !isLoading && !errorMessage && series.length > 0 && !isExtraLargeScale"
      class="metric-legend"
    >
      <EfficiencyLegend
        :series="series"
        :unit="unit"
        :decimals="decimals"
        :highlighted-tool-name="legendHeldToolName"
        @hold-start="handleLegendHoldStart"
        @hold-end="releaseLegendHold"
      />
    </section>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="metric-chart-wrapper">
      <section class="metric-chart">
        <StatusMessage
          state="loading"
          :title="text('memoryEfficiency.loadingValue1MemoryEfficiencyData', { value1: String(memoryResourceType) })"
          :description="text('memoryEfficiency.pleaseWaitWhileWeFetchTheData')"
        />
      </section>
    </div>

    <!-- 错误状态：无数据 -->
    <div v-else-if="errorMessage" class="metric-chart-wrapper">
      <section class="metric-chart">
        <div class="data-empty-card data-empty-card--inline">
          <v-icon size="48" color="primary" class="data-empty-card__icon" icon="$mdi-table-off" />
          <p class="data-empty-card__title">{{ text('memoryEfficiency.dataFileTemporarilyUnavailable') }}</p>
        </div>
      </section>
    </div>

    <div v-else-if="chartErrorMessage" class="metric-chart-wrapper">
      <section class="metric-chart">
        <StatusMessage
          state="error"
          :title="text('memoryEfficiency.chartTemporarilyUnavailable')"
          :description="text('memoryEfficiency.pleaseRefreshThePageToReloadThe')"
        />
      </section>
    </div>

    <!-- 未选择筛选条件 -->
    <div v-else-if="!canRenderChart" class="metric-chart-wrapper">
      <section class="metric-chart">
        <div class="subplot-placeholder">
          <v-icon class="subplot-placeholder__icon" icon="$mdi-information-outline" size="28" />
          <p class="subplot-placeholder__text">{{ displayText(emptyHintText) }}</p>
        </div>
      </section>
    </div>

    <!-- 空数据占位符 -->
    <div v-else-if="series.length === 0" class="metric-chart-wrapper">
      <section class="metric-chart">
        <div class="subplot-placeholder">
          <v-icon class="subplot-placeholder__icon" icon="$mdi-information-outline" size="28" />
          <p class="subplot-placeholder__text">
            {{ filterState.selectedTools.length === 0
              ? text('common.selectToolForChart')
              : text('common.noToolChartData') }}
          </p>
        </div>
      </section>
    </div>

    <!-- 图表区域 -->
    <div v-else class="metric-chart-wrapper">
      <section class="metric-chart">
        <EfficiencyExtraLargeChart
          v-if="isExtraLargeScale"
          :x-axis-labels="xAxisLabels"
          :series="series"
          :unit="unit"
          :decimals="decimals"
          :x-axis-name="displayYAxisName"
          :x-axis-type="yAxisType"
          @error="handleChartError"
        />

        <EfficiencyTopologyChart
          v-else-if="isTopologyComparison"
          :highlighted-tool-name="legendHeldToolName"
          :x-axis-labels="xAxisLabels"
          :series="series"
          :unit="unit"
          :decimals="decimals"
          :x-axis-name="displayYAxisName"
          @error="handleChartError"
        />

        <EfficiencyLineChart
          v-else
          ref="lineChartRef"
          :x-axis-labels="xAxisLabels"
          :series="series"
          :unit="unit"
          :decimals="decimals"
          :y-axis-name="displayYAxisName"
          :y-axis-type="yAxisType"
          @error="handleChartError"
        />

        <p v-if="yAxisType === 'log' && hasNonPositiveValues" class="metric-ps-note">
          {{ text('efficiency.nonPositiveLogNote') }}
        </p>

        <p
          v-if="naToolsDescription"
          class="metric-ps-note"
        ><LocalizedText message="memoryEfficiency.metricPsNote" :values="{ value1: String(naToolsDescription) }" />
        </p>
      </section>
    </div>

  </div>
</template>

<script setup lang="ts">
import { text, displayText } from '@/utils/locale'
import LocalizedText from '@/components/common/LocalizedText.vue'
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { getMetricById } from '@/constants/metrics'
import type { EfficiencyMemoryResourceType, EfficiencyToolName } from '@/constants/efficiency-tools'
import StatusMessage from '@/components/common/StatusMessage.vue'
import EfficiencyExtraLargeChart from '@/components/measurements/EfficiencyExtraLargeChart.vue'
import EfficiencyTopologyChart from '@/components/measurements/EfficiencyTopologyChart.vue'
import EfficiencyMetricFilter from '@/components/measurements/EfficiencyMetricFilter.vue'
import EfficiencyLineChart from '@/components/measurements/EfficiencyLineChart.vue'
import EfficiencyLegend from '@/components/measurements/EfficiencyLegend.vue'
import { useEfficiencyMetric } from '@/composables/useEfficiencyMetric'

type EfficiencyLineChartHandle = {
  startExternalHold: (toolName: EfficiencyToolName) => void
  endExternalHold: () => void
}

const metricInfo = getMetricById('memory-efficiency')!

const componentId = useId()
const heroTitleId = `${componentId}-metric-title`
const heroDescriptionId = `${componentId}-metric-description`

const yAxisType = ref<'value' | 'log'>('log')
const chartErrorMessage = ref('')

function handleChartError(message: string) {
  chartErrorMessage.value = message
  console.warn('[memory-efficiency] Failed to render chart:', message)
}
const memoryResourceType = ref<EfficiencyMemoryResourceType>('RAM')
const lineChartRef = ref<EfficiencyLineChartHandle | null>(null)
const legendHeldToolName = ref<EfficiencyToolName | null>(null)

const {
  filterState,
  canRenderChart,
  isLoading,
  errorMessage,
  unit,
  decimals,
  xAxisLabels,
  series,
  isTopologyComparison,
  availableTools,
  naToolsDescription,
  hasNonPositiveValues,
  emptyHintText
} = useEfficiencyMetric({
  metricType: 'memory-efficiency',
  unit: 'GB',
  decimals: 3,
  yAxisName: 'Memory (GB)',
  resourceType: memoryResourceType
})

const isExtraLargeScale = computed(() => filterState.modality === 'scRNA' && filterState.scale === 'extra-large')

watch([isExtraLargeScale, isTopologyComparison], ([extraLarge, topologyComparison]) => {
  if (extraLarge || topologyComparison) yAxisType.value = 'value'
}, { immediate: true })

watch([series, yAxisType], () => {
  chartErrorMessage.value = ''
})

function releaseLegendHold() {
  if (!legendHeldToolName.value) return
  legendHeldToolName.value = null
  lineChartRef.value?.endExternalHold()
}

function handleLegendHoldStart(toolName: EfficiencyToolName) {
  if (isExtraLargeScale.value) return
  legendHeldToolName.value = toolName
  lineChartRef.value?.startExternalHold(toolName)
}

watch(
  () => filterState.scale,
  (nextScale, prevScale) => {
    if (nextScale === 'extra-large' && prevScale !== 'extra-large') {
      yAxisType.value = 'value'
    }
    if (nextScale !== prevScale) {
      releaseLegendHold()
    }
  },
  { immediate: true }
)

watch(
  () => [filterState.topology, filterState.selectedTools, series.value, memoryResourceType.value],
  () => {
    releaseLegendHold()
  },
  { deep: true }
)

const displayYAxisName = computed(() => {
  const resourceLabel = memoryResourceType.value === 'VRAM' ? 'VRAM (GB)' : 'RAM (GB)'
  if (yAxisType.value === 'log') return `log₁₀(${resourceLabel})`
  return resourceLabel
})

onMounted(() => {
  window.addEventListener('mouseup', releaseLegendHold)
  window.addEventListener('blur', releaseLegendHold)
})

onBeforeUnmount(() => {
  window.removeEventListener('mouseup', releaseLegendHold)
  window.removeEventListener('blur', releaseLegendHold)
})
</script>

<style lang="scss">
@use '@/styles/components/efficiency-metric.scss';
</style>
