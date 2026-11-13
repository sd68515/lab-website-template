<!--
  Down-sampling 指标详情页
  降采样测试：cellsub/genesub 数据的稳定性测试
-->
<template>
  <div class="metric-detail-page efficiency-metric-page down-sampling-page">
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
      <DownSamplingFilter
        v-model:modality="filterState.modality"
        v-model:dimension="filterState.dimension"
        v-model:ratio="filterState.ratio"
        v-model:replicate="filterState.replicate"
        :ratio-disabled="isRatioDisabled"
      />
    </section>

    <section
      v-if="shouldShowLegend && !isLoading && !errorMessage && series.length > 0"
      class="metric-legend"
    >
      <EfficiencyLegend
        :series="series"
        :decimals="3"
        sort-direction="desc"
        :highlighted-tool-name="legendHeldToolName"
        @hold-start="handleLegendHoldStart"
        @hold-end="releaseLegendHold"
      />
    </section>

    <div v-if="isLoading" class="metric-chart-wrapper">
      <section class="metric-chart">
        <StatusMessage
          state="loading"
          :title="text('downSampling.loadingDownSamplingData')"
          :description="text('downSampling.pleaseWaitWhileWeFetchTheData')"
        />
      </section>
    </div>

    <div v-else-if="errorMessage" class="metric-chart-wrapper">
      <section class="metric-chart">
        <div class="data-empty-card data-empty-card--inline">
          <v-icon size="48" color="primary" class="data-empty-card__icon" icon="$mdi-table-off" />
          <p class="data-empty-card__title">{{ text('downSampling.dataFileTemporarilyUnavailable') }}</p>
        </div>
      </section>
    </div>

    <div v-else-if="chartErrorMessage" class="metric-chart-wrapper">
      <section class="metric-chart">
        <StatusMessage
          state="error"
          :title="text('downSampling.chartTemporarilyUnavailable')"
          :description="text('downSampling.pleaseRefreshThePageToReloadThe')"
        />
      </section>
    </div>

    <div v-else-if="!filterState.dimension" class="metric-chart-wrapper">
      <section class="metric-chart">
        <div class="subplot-placeholder">
          <v-icon class="subplot-placeholder__icon" icon="$mdi-information-outline" size="28" />
          <p class="subplot-placeholder__text">{{ emptyHintText }}</p>
        </div>
      </section>
    </div>

    <div v-else-if="selectionErrorMessage" class="metric-chart-wrapper">
      <section class="metric-chart">
        <div class="data-empty-card data-empty-card--inline">
          <v-icon size="48" color="primary" class="data-empty-card__icon" icon="$mdi-table-off" />
          <p class="data-empty-card__title">{{ selectionErrorMessage }}</p>
        </div>
      </section>
    </div>

    <div v-else-if="isBarMode && barRows.length === 0" class="metric-chart-wrapper">
      <section class="metric-chart">
        <div class="subplot-placeholder">
          <v-icon class="subplot-placeholder__icon" icon="$mdi-information-outline" size="28" />
          <p class="subplot-placeholder__text">{{ text('downSampling.noValidDataForTheSelectedDown') }}</p>
        </div>
      </section>
    </div>

    <div v-else-if="!isBarMode && series.length === 0" class="metric-chart-wrapper">
      <section class="metric-chart">
        <div class="subplot-placeholder">
          <v-icon class="subplot-placeholder__icon" icon="$mdi-information-outline" size="28" />
          <p class="subplot-placeholder__text">{{ text('downSampling.noValidDataForTheSelectedDown2') }}</p>
        </div>
      </section>
    </div>

    <div v-else class="metric-chart-wrapper">
      <section class="metric-chart">
        <DownSamplingBarChart
          v-if="isBarMode"
          :rows="barRows"
          :x-axis-name="datasetAxisTitle"
          @error="handleChartError"
        />

        <EfficiencyLineChart
          v-else
          ref="lineChartRef"
          :x-axis-labels="xAxisLabels"
          :x-axis-name="datasetAxisTitle"
          :series="series"
          @error="handleChartError"
          :decimals="3"
          :y-axis-name="'Example score'"
          :y-axis-scale="true"
        />

        <p v-if="noteText" class="metric-ps-note"><LocalizedText message="downSampling.metricPsNote" :values="{ value1: String(noteText) }" />
        </p>

        <p
          v-if="!isBarMode && missingRatioWarning"
          class="metric-ps-note metric-ps-note--warning"
        ><LocalizedText message="downSampling.metricPsNote" :values="{ value1: String(missingRatioWarning) }" />
        </p>

        <p
          v-if="missingToolsWarning"
          class="metric-ps-note metric-ps-note--warning"
        ><LocalizedText message="downSampling.metricPsNote" :values="{ value1: String(missingToolsWarning) }" />
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
import { getRealDatasetLabel } from '@/constants/datasets'
import type { DownSamplingToolName } from '@/constants/down-sampling'
import StatusMessage from '@/components/common/StatusMessage.vue'
import EfficiencyLegend from '@/components/measurements/EfficiencyLegend.vue'
import EfficiencyLineChart from '@/components/measurements/EfficiencyLineChart.vue'
import DownSamplingBarChart from '@/components/measurements/DownSamplingBarChart.vue'
import DownSamplingFilter from '@/components/measurements/DownSamplingFilter.vue'
import { useDownSamplingMetric } from '@/composables/useDownSamplingMetric'

type EfficiencyLineChartHandle = {
  startExternalHold: (toolName: DownSamplingToolName) => void
  endExternalHold: () => void
}

const metricInfo = getMetricById('down-sampling')!

const componentId = useId()
const heroTitleId = `${componentId}-metric-title`
const heroDescriptionId = `${componentId}-metric-description`
const lineChartRef = ref<EfficiencyLineChartHandle | null>(null)
const legendHeldToolName = ref<DownSamplingToolName | null>(null)
const chartErrorMessage = ref('')

const {
  filterState,
  isLoading,
  errorMessage,
  xAxisLabels,
  series,
  barRows,
  noteText,
  referenceDatasetId,
  selectionErrorMessage,
  isRatioDisabled,
  missingToolsWarning,
  missingRatioWarning,
  emptyHintText
} = useDownSamplingMetric()

const isBarMode = computed(() => Boolean(filterState.dimension && filterState.ratio))
const shouldShowLegend = computed(() => Boolean(filterState.dimension && !filterState.ratio))
const datasetAxisTitle = computed(() => filterState.modality === 'ATAC'
  ? `${getRealDatasetLabel(referenceDatasetId.value)} · r${filterState.replicate}`
  : getRealDatasetLabel(referenceDatasetId.value))

function releaseLegendHold() {
  if (!legendHeldToolName.value) return
  legendHeldToolName.value = null
  lineChartRef.value?.endExternalHold()
}

function handleLegendHoldStart(toolName: DownSamplingToolName) {
  if (isBarMode.value) return
  legendHeldToolName.value = toolName
  lineChartRef.value?.startExternalHold(toolName)
}

const handleChartError = (message: string) => {
  chartErrorMessage.value = message
  console.warn('[down-sampling] Failed to render chart:', message)
}

watch(
  () => [filterState.modality, filterState.dimension, filterState.replicate, filterState.ratio, series.value],
  () => {
    chartErrorMessage.value = ''
    releaseLegendHold()
  },
  { deep: true }
)

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
