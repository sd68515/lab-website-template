<!--
  DownSamplingFilter
  用于 Down-sampling 指标页的筛选器：
  - scRNA / ATAC（ATAC 仅 Cell，r1/r2 独立展示）
  - Down-sampling target（Cell / Gene）
  - Down-sampling ratio（60 / 70 / 80 / 90 / 95）
-->
<template>
  <div :class="['efficiency-metric-filter', { 'efficiency-metric-filter--disabled': disabled }]">
    <div class="efficiency-metric-filter__group efficiency-metric-filter__group--modality">
      <v-select
        :id="fieldIds.modality"
        name="down-sampling-modality"
        :aria-label="text('common.dataModality')"
        :model-value="modality"
        @update:model-value="emit('update:modality', $event)"
        class="efficiency-metric-filter__select"
        :label="text('common.dataModality')"
        :items="modalityOptions"
        :item-title="item => localizedItemTitle(item, 'label')"
        item-value="value"
        density="comfortable"
        variant="outlined"
        color="primary"
        hide-details
        :disabled="disabled"
      />
    </div>

    <div class="efficiency-metric-filter__group">
      <v-select
        :id="fieldIds.dimension"
        name="down-sampling-dimension"
        :aria-label="text('downSamplingFilter.downSamplingTarget')"
        :model-value="dimension"
        @update:model-value="updateDimension"
        class="efficiency-metric-filter__select efficiency-metric-filter__select--scale"
        :label="text('downSamplingFilter.downSamplingTarget')"
        placeholder=""
        :items="dimensionOptions"
        :item-title="item => localizedItemTitle(item, 'label')"
        item-value="value"
        density="comfortable"
        variant="outlined"
        color="primary"
        hide-details
        :disabled="disabled"
        :clearable="modality === 'scRNA' && Boolean(dimension)"
      />
    </div>

    <div class="efficiency-metric-filter__group">
      <v-select
        :id="fieldIds.ratio"
        name="down-sampling-ratio"
        :aria-label="text('downSamplingFilter.downSamplingRatio')"
        :model-value="ratio"
        @update:model-value="updateRatio"
        class="efficiency-metric-filter__select efficiency-metric-filter__select--topology"
        :label="text('downSamplingFilter.downSamplingRatio')"
        placeholder=""
        :items="ratioOptions"
        :item-title="item => localizedItemTitle(item, 'label')"
        item-value="value"
        density="comfortable"
        variant="outlined"
        color="primary"
        hide-details
        :disabled="disabled || !dimension || ratioDisabled"
        :clearable="Boolean(ratio)"
      />
    </div>

    <div v-if="modality === 'ATAC'" class="efficiency-metric-filter__group">
      <v-select
        :id="fieldIds.replicate"
        name="down-sampling-replicate"
        :aria-label="text('downSamplingFilter.replicate')"
        :model-value="replicate"
        @update:model-value="emit('update:replicate', $event)"
        class="efficiency-metric-filter__select"
        :label="text('downSamplingFilter.replicate')"
        :items="DOWN_SAMPLING_REPLICATE_OPTIONS"
        :item-title="item => localizedItemTitle(item, 'label')"
        item-value="value"
        density="comfortable"
        variant="outlined"
        color="primary"
        hide-details
        :disabled="disabled"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatNumber, text, localizedItemTitle } from '@/utils/locale'
import { computed, useId } from 'vue'
import { getResultScopeLabel } from '@/constants/catalogueLabels'
import {
  DOWN_SAMPLING_DIMENSION_OPTIONS,
  DOWN_SAMPLING_MODALITY_OPTIONS,
  DOWN_SAMPLING_RATIO_OPTIONS,
  DOWN_SAMPLING_REPLICATE_OPTIONS,
  type DownSamplingDimension,
  type DownSamplingModality,
  type DownSamplingRatio,
  type DownSamplingReplicate
} from '@/constants/down-sampling'

const props = withDefaults(
  defineProps<{
    modality: DownSamplingModality
    dimension: DownSamplingDimension | null
    ratio: DownSamplingRatio | null
    replicate: DownSamplingReplicate
    ratioDisabled?: boolean
    disabled?: boolean
  }>(),
  {
    ratioDisabled: false,
    disabled: false
  }
)

const emit = defineEmits<{
  (e: 'update:modality', value: DownSamplingModality): void
  (e: 'update:dimension', value: DownSamplingDimension | null): void
  (e: 'update:ratio', value: DownSamplingRatio | null): void
  (e: 'update:replicate', value: DownSamplingReplicate): void
}>()

const modalityOptions = computed(() => DOWN_SAMPLING_MODALITY_OPTIONS.map(({ value }) => ({
  value,
  label: getResultScopeLabel(value)
})))

const dimensionOptions = computed(() => DOWN_SAMPLING_DIMENSION_OPTIONS.filter(
  option => props.modality === 'scRNA' || option.value === 'cell'
).map(option => ({ value: option.value, label: text(`downSampling.dimension.${option.value}`) })))

const ratioOptions = computed(() => DOWN_SAMPLING_RATIO_OPTIONS.map(option => ({
  value: option.value,
  label: formatNumber(Number(option.value) / 100, { style: 'percent', maximumFractionDigits: 0 })
})))

const componentId = useId()
const fieldIds = {
  modality: `${componentId}-modality`,
  dimension: `${componentId}-dimension`,
  ratio: `${componentId}-ratio`,
  replicate: `${componentId}-replicate`
}

const updateDimension = (value: DownSamplingDimension | null) => {
  emit('update:dimension', value ?? null)
}

const updateRatio = (value: DownSamplingRatio | null) => {
  emit('update:ratio', value ?? null)
}
</script>

<style lang="scss">
@use '@/styles/components/efficiency-metric.scss';
</style>
