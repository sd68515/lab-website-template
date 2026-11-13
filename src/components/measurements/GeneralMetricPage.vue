<template>
  <div class="metric-detail-page cross-metric-page" :class="pageClass">
    <header class="metric-hero" role="banner" :aria-labelledby="heroTitleId" :aria-describedby="heroDescriptionId">
      <div class="metric-hero__titles">
        <h1 :id="heroTitleId" class="metric-title">{{ displayText(getMetricDisplayName(metricInfo.name)) }}</h1>
        <p :id="heroDescriptionId" class="metric-description">
          {{ displayText(metricInfo.description) }}
        </p>
      </div>
    </header>

    <section
      v-if="hasHeatmapSection"
      class="metric-heatmaps"
      role="region"
      :aria-labelledby="heatmapHeadingId"
    >
      <h2 class="sr-only" :id="heatmapHeadingId"><LocalizedText message="generalMetricPage.srOnly" :values="{ value1: displayText(getMetricDisplayName(metricInfo.name)) }" /></h2>

      <GeneralHeatmapCard :metric-id="metricId" />
    </section>

    <section
      v-if="metricInfo.hasDataAggregateSubplot"
      class="metric-subplots metric-subplots--aggregate"
      role="region"
      :aria-labelledby="aggregateHeadingId"
    >
      <div class="subplot-card">
        <header class="subplot-card__header">
          <div class="subplot-card__titles">
            <h2 class="subplot-card__title" :id="aggregateHeadingId"> {{ text('generalMetricPage.datasetSpecificResults') }} </h2>
          </div>
          <div class="subplot-card__controls">
            <DatasetFilter
              :key="`aggregate-filter-${aggregateResetKey}`"
              v-model:data-type="aggregateDataType"
              v-model:dataset-id="aggregateDatasetId"
              :real-datasets="aggregateRealOptions"
              :simulation-datasets="aggregateSimulationOptions"
              @selection-state="aggregateSelectionState = $event"
            />
            <v-btn
              class="subplot-card__clear"
              variant="text"
              color="primary"
              :disabled="aggregateClearDisabled"
              @click="resetAggregateFilters"
              :aria-label="text('generalMetricPage.resetDatasetFilters')"
            > {{ text('common.clear') }} </v-btn>
          </div>
        </header>

        <p v-if="aggregateExcludesDatasets" class="subplot-card__scope-note">
          {{ text('generalMetricPage.inapplicableDatasetsExcluded') }}
        </p>

        <div
          class="subplot-display"
          :class="{
            'subplot-display--has-figure': Boolean(aggregateSubplotPath),
            'subplot-display--aggregate': true,
            'subplot-display--real': aggregateDataType === 'real',
            'subplot-display--simulated': aggregateDataType === 'simulated'
          }"
        >
          <MissingMetricPlaceholder
            v-if="aggregateMetricMissing.missing"
            v-bind="aggregateMissingPlaceholderProps"
            :title="text('generalMetricPage.datasetValue1', { value1: String(aggregateDatasetId) })"
            :description="aggregateMetricMissing.reason === 'Out of metric'
              ? text('generalMetricPage.thisDatasetDoesNotProvideAggregatedResults')
              : text('generalMetricPage.aggregatedResultsAreCurrentlyUnavailableForThis')"
          />
          <HeatmapDisplay
            v-else-if="aggregateDatasetId"
            upload-pending
            :alt="text('generalMetricPage.aggregatedScoresForDatasetValue1', { value1: String(aggregateDatasetId) })"
          />
          <div v-else class="subplot-placeholder">
            <v-icon class="subplot-placeholder__icon" icon="$mdi-information-outline" size="28" />
            <p class="subplot-placeholder__text"> {{ text('generalMetricPage.selectASpecificDatasetToViewResults') }} </p>
          </div>
        </div>
      </div>
    </section>

    <section
      v-if="metricInfo.hasToolDataSubplot && toolPlotConfig"
      class="metric-subplots metric-subplots--detail"
      role="region"
      :aria-labelledby="toolHeadingId"
    >
      <div class="subplot-card">
        <header class="subplot-card__header">
          <div class="subplot-card__titles">
            <h2 class="subplot-card__title" :id="toolHeadingId"> {{ text('generalMetricPage.toolDatasetSpecificResults') }} </h2>
          </div>
          <div class="subplot-card__controls">
            <DatasetFilter
              :key="`tool-filter-${toolResetKey}`"
              v-model:data-type="toolDataType"
              v-model:dataset-id="toolDatasetId"
              v-model:tool="selectedTool"
              :real-datasets="realOptions"
              :simulation-datasets="simulationOptions"
              :tools="toolOptions"
              :show-tool-filter="true"
              @selection-state="toolSelectionState = $event"
            />
            <v-btn
              class="subplot-card__clear"
              variant="text"
              color="primary"
              :disabled="toolClearDisabled"
              @click="resetToolFilters"
              :aria-label="text('generalMetricPage.resetToolFilters')"
            > {{ text('common.clear') }} </v-btn>
          </div>
        </header>

        <p v-if="toolDataType === 'real' && excludedRealDatasetCount" class="subplot-card__scope-note">
          {{ text('generalMetricPage.inapplicableDatasetsExcluded') }}
        </p>

        <div
          class="subplot-display"
          :class="{
            'subplot-display--has-figure': hasToolHeatmap,
            'subplot-display--tool': true,
            'subplot-display--real': toolDataType === 'real',
            'subplot-display--simulated': toolDataType === 'simulated'
          }"
        >
          <div v-if="!hasToolSelection" class="subplot-placeholder">
            <v-icon class="subplot-placeholder__icon" icon="$mdi-information-outline" size="28" />
            <p class="subplot-placeholder__text"> {{ text('generalMetricPage.selectADatasetAndAToolTo') }} </p>
          </div>
          <MissingMetricPlaceholder
            v-else-if="toolMetricMissing.missing"
            v-bind="toolMissingPlaceholderProps"
            :title="text('generalMetricPage.value1DatasetValue2', { value1: String(selectedTool), value2: String(toolDatasetId) })"
            :description="toolMetricMissing.reason === 'Out of metric'
              ? text('generalMetricPage.thisDatasetToolIsNotApplicableFor')
              : text('generalMetricPage.resultsAreUnavailableForThisToolDataset')"
          />
          <HeatmapDisplay
            v-else-if="hasToolSelection"
            upload-pending
            :alt="text('generalMetricPage.value1OnDatasetValue2', { value1: String(selectedTool), value2: String(toolDatasetId) })"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { text, displayText } from '@/utils/locale'
import LocalizedText from '@/components/common/LocalizedText.vue'
import { computed, ref, watch, useId } from 'vue'
import DatasetFilter from '@/components/common/DatasetFilter.vue'
import GeneralHeatmapCard from '@/components/measurements/GeneralHeatmapCard.vue'
import HeatmapDisplay from '@/components/common/HeatmapDisplay.vue'
import MissingMetricPlaceholder from '@/components/common/MissingMetricPlaceholder.vue'
import { getMetricById, getMetricDisplayName } from '@/constants/metrics'
import { useMetricDatasets } from '@/composables/useMetricDatasets'
import { useMetricTools } from '@/composables/useMetricTools'
import { isMetricMissing } from '@/constants/measurement-missing'
import { DEFAULT_NO_RESULT_CONFIG } from '@/constants/results/noResultConfig'
import type { GeneralHeatmapMetric } from '@/constants/general-heatmap-assets'
import { getBenchmarkCombinationState } from '@/constants/benchmark-results'

type DataType = 'real' | 'simulated'

const CROSS_DATASET_TOOL_SUBPLOTS: Record<
  string,
  { folder: string; suffix: string; missingMetricName: string }
> = {
  'angle-consistency': {
    folder: 'angle_consistency',
    suffix: '_angle_consistency.png',
    missingMetricName: 'Angle consistency'
  },
  'consistency-score': {
    folder: 'consistency_score_detailed',
    suffix: '_consistency_score_detailed.png',
    missingMetricName: 'Consistency score detailed'
  }
}

const props = defineProps<{
  metricId: GeneralHeatmapMetric
}>()

const pageClass = computed(() => `metric-detail-page--${props.metricId}`)

const metricInfo = computed(() => {
  const record = getMetricById(props.metricId)
  if (!record) {
    throw new Error(`Unknown general metric id: ${props.metricId}`)
  }
  return record
})

const hasHeatmapSection = computed(() => metricInfo.value.hasRealHeatmap || metricInfo.value.hasSimHeatmap)

const {
  realOptions, aggregateRealOptions, simulationOptions, aggregateSimulationOptions,
  excludedRealDatasetCount, aggregateExcludedRealDatasetCount, isOutOfMetric, isUnableToCompute
} = useMetricDatasets(props.metricId)
const aggregateDataType = ref<DataType>('real')
const aggregateDatasetId = ref<string | number | null | undefined>(undefined)
const aggregateResetKey = ref(0)
const aggregateSelectionState = ref({ hasSelection: false, hasDatasetId: false })

const aggregateDatasets = computed(() =>
  aggregateDataType.value === 'real' ? aggregateRealOptions.value : aggregateSimulationOptions.value
)
const aggregateExcludesDatasets = computed(() => aggregateDataType.value === 'real'
  ? aggregateExcludedRealDatasetCount.value > 0
  : aggregateSimulationOptions.value.length < simulationOptions.value.length)

watch(
  aggregateDatasets,
  options => {
    ensureDatasetSelection(options, aggregateDatasetId)
  },
  { immediate: true }
)

const aggregateClearDisabled = computed(() => !aggregateSelectionState.value.hasSelection)

const resetAggregateFilters = () => {
  aggregateDatasetId.value = undefined
  aggregateResetKey.value += 1
}

const aggregateMetricMissing = computed(() => {
  const datasetId = aggregateDatasetId.value
  if (!datasetId) {
    return { missing: false }
  }

  if (aggregateDataType.value === 'real') {
    if (isOutOfMetric(datasetId)) {
      return { missing: true, reason: 'Out of metric' as const }
    }
    if (isUnableToCompute(datasetId)) {
      return { missing: true, reason: 'Unable to compute' as const }
    }
  }

  return isMetricMissing(
    metricInfo.value.name,
    '*',
    datasetId,
    aggregateDataType.value
  )
})

const aggregateSubplotPath = computed(() => '')

const aggregateMissingPlaceholderProps = computed(() =>
  aggregateMetricMissing.value.reason
    ? { reason: aggregateMetricMissing.value.reason }
    : {}
)

const toolDataType = ref<DataType>('real')
const toolDatasetId = ref<string | number | null | undefined>(undefined)
const selectedTool = ref('')
const toolResetKey = ref(0)
const toolSelectionState = ref({ hasSelection: false, hasDatasetId: false })
const toolDatasetIdForMetricTools = computed<string | number>(() => toolDatasetId.value ?? '')

const toolDatasets = computed(() =>
  toolDataType.value === 'real' ? realOptions.value : simulationOptions.value
)

watch(
  toolDatasets,
  options => {
    ensureDatasetSelection(options, toolDatasetId)
  },
  { immediate: true }
)

const { options: toolOptions } = useMetricTools({
  datasetType: toolDataType,
  datasetId: toolDatasetIdForMetricTools
})

watch(
  toolOptions,
  options => {
    if (!options.length) {
      selectedTool.value = ''
      return
    }
    const exists = options.some(option => option.value === selectedTool.value)
    if (!exists) {
      selectedTool.value = ''
    }
  },
  { immediate: true }
)

const hasToolSelection = computed(
  () => Boolean(toolDatasetId.value) && Boolean(selectedTool.value)
)

const toolPlotConfig = computed(() => CROSS_DATASET_TOOL_SUBPLOTS[props.metricId])

const toolSubplotPath = computed(() => '')

const toolMetricMissing = computed(() => {
  const datasetId = toolDatasetId.value
  if (!toolPlotConfig.value || !hasToolSelection.value || datasetId == null) {
    return { missing: false }
  }

  // 优先使用指标级配置（Out of metric / Unable to compute）
  // 例如：ExampleMethod20 的 Consistency score 对真实/模拟均为 Out of metric，应覆盖整卡 Unable 的兜底。
  const metricMissing = isMetricMissing(
    toolPlotConfig.value.missingMetricName,
    selectedTool.value,
    datasetId,
    toolDataType.value
  )
  if (metricMissing.missing) {
    return metricMissing
  }

  // 若该 tool + dataset 在结果页属于“整卡缺失（Unable to compute）”，则指标子图也应直接显示 Unable to compute，
  // 避免落到 HeatmapDisplay 的 “Picture not uploaded”。
  const baseConfigKey = `${selectedTool.value}_${toolDatasetId.value}`
  const deliveredState = getBenchmarkCombinationState(
    selectedTool.value, String(datasetId), toolDataType.value === 'real' ? 'real' : 'simulation'
  )
  const baseConfig = deliveredState === 'ready' ? undefined : DEFAULT_NO_RESULT_CONFIG[baseConfigKey]
  if (baseConfig && baseConfig.type === 'full') {
    return { missing: true, reason: 'Unable to compute' as const }
  }

  return { missing: false }
})

const toolMissingPlaceholderProps = computed(() =>
  toolMetricMissing.value.reason
    ? { reason: toolMetricMissing.value.reason }
    : {}
)

const hasToolHeatmap = computed(
  () => Boolean(toolSubplotPath.value) && !toolMetricMissing.value.missing
)

const toolClearDisabled = computed(() => !toolSelectionState.value.hasSelection && !selectedTool.value)

const resetToolFilters = () => {
  toolDatasetId.value = undefined
  selectedTool.value = ''
  toolResetKey.value += 1
}

const componentId = useId()
const heroTitleId = `${componentId}-metric-title`
const heroDescriptionId = `${componentId}-metric-description`
const heatmapHeadingId = `${componentId}-heatmaps`
const aggregateHeadingId = `${componentId}-aggregate`
const toolHeadingId = `${componentId}-tool`

function ensureDatasetSelection(
  options: Array<{ value: string | number }>,
  target: { value: string | number | null | undefined }
) {
  if (!options.length) {
    target.value = null
    return
  }
  // 允许空值，使 Clear 后的选择保持为空。
  const exists = options.some(option => String(option.value) === String(target.value))
  if (!exists && target.value) {
    target.value = null
  }
}
</script>
