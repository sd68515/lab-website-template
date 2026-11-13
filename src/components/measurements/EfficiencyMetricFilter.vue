<!--
  EfficiencyMetricFilter
  用于效率指标页（Running time / Memory efficiency）的筛选器：
  - Data modality（单选，名称与首页一致）
  - Data Scale（单选）
  - Topology（单选，extra-large 时禁用）
  - Tools（多选）
-->
<template>
  <div class="efficiency-metric-filter">
    <div class="efficiency-metric-filter__group efficiency-metric-filter__group--modality">
      <v-select
        :id="fieldIds.modality"
        name="efficiency-modality"
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
      />
    </div>
    <div
      class="efficiency-metric-filter__group"
      :class="{ 'efficiency-metric-filter__group--large-scale': modality === 'ATAC' && scale === 'large' }"
    >
      <v-select
        :id="fieldIds.scale"
        name="efficiency-scale"
        :aria-label="text('efficiencyMetricFilter.dataScale')"
        :model-value="scale"
        @update:model-value="updateScale"
        class="efficiency-metric-filter__select efficiency-metric-filter__select--scale"
        :label="text('efficiencyMetricFilter.dataScale')"
        placeholder=""
        :items="scaleOptions"
        :item-title="item => localizedItemTitle(item, 'label')"
        item-value="value"
        density="comfortable"
        variant="outlined"
        color="primary"
        hide-details
      />
    </div>

    <div v-if="modality !== 'SPATIAL' && !(modality === 'ATAC' && scale === 'large')" class="efficiency-metric-filter__group">
      <v-select
        :id="fieldIds.topology"
        name="efficiency-topology"
        :aria-label="text('efficiencyMetricFilter.topology')"
        :model-value="topology"
        @update:model-value="updateTopology"
        class="efficiency-metric-filter__select efficiency-metric-filter__select--topology"
        :label="text('efficiencyMetricFilter.topology')"
        placeholder=""
        :items="topologyOptions"
        :item-title="item => localizedItemTitle(item, 'label')"
        item-value="value"
        :disabled="isTopologyDisabled"
        :clearable="Boolean(topology)"
        density="comfortable"
        variant="outlined"
        color="primary"
        hide-details
      />
    </div>

    <div
      v-if="resourceTypeValue"
      class="efficiency-metric-filter__group efficiency-metric-filter__group--memory-source"
    >
      <span class="efficiency-metric-filter__toggle-label">{{ text('efficiencyMetricFilter.memory') }}</span>
      <div
        class="efficiency-metric-filter__memory-source"
        role="group"
        :aria-label="text('efficiencyMetricFilter.memorySource')"
      >
        <v-btn
          v-for="item in MEMORY_EFFICIENCY_RESOURCE_OPTIONS"
          :key="item.value"
          class="efficiency-metric-filter__memory-source-btn"
          :class="{ 'efficiency-metric-filter__memory-source-btn--active': resourceTypeValue === item.value }"
          variant="text"
          rounded="0"
          :aria-pressed="resourceTypeValue === item.value"
          @click="setResourceType(item.value)"
        >
          {{ displayText(item.label) }}
        </v-btn>
      </div>
    </div>

    <div class="efficiency-metric-filter__group efficiency-metric-filter__group--axis-scale">
      <span class="efficiency-metric-filter__toggle-label">{{ text('efficiencyMetricFilter.axis') }}</span>
      <div
        class="efficiency-metric-filter__axis-scale"
        role="group"
        :aria-label="text('efficiencyMetricFilter.yAxisScale')"
      >
        <v-btn
          class="efficiency-metric-filter__axis-scale-btn"
          :class="{ 'efficiency-metric-filter__axis-scale-btn--active': yAxisTypeValue === 'value' }"
          variant="text"
          rounded="0"
          :aria-pressed="yAxisTypeValue === 'value'"
          @click="setYAxisType('value')"
        > {{ text('efficiencyMetricFilter.linear') }} </v-btn>

        <v-btn
          class="efficiency-metric-filter__axis-scale-btn"
          :class="{ 'efficiency-metric-filter__axis-scale-btn--active': yAxisTypeValue === 'log' }"
          variant="text"
          rounded="0"
          :disabled="linearOnly"
          :aria-disabled="linearOnly"
          :aria-pressed="yAxisTypeValue === 'log'"
          @click="setYAxisType('log')"
        > {{ text('efficiencyMetricFilter.log10') }} </v-btn>
      </div>
    </div>

    <div class="efficiency-metric-filter__group">
      <v-select :item-title="item => localizedItemTitle(item)"
        :id="fieldIds.tools"
        name="efficiency-tools"
        :aria-label="text('efficiencyMetricFilter.tools')"
        :model-value="selectedTools"
        @update:model-value="updateSelectedTools"
        class="efficiency-metric-filter__select efficiency-metric-filter__select--tools"
        :label="text('common.tools')"
        placeholder=""
        :items="toolItems"
        multiple
        :clearable="selectedTools.length > 0"
        density="comfortable"
        variant="outlined"
        color="primary"
        hide-details
      >
        <template #selection="{ index }">
          <span
            v-if="index === 0"
            class="efficiency-metric-filter__tools-selection"
            :title="toolsSummaryText"
          >
            {{ toolsSummaryText }}
          </span>
        </template>
      </v-select>

      <v-btn
        class="efficiency-metric-filter__tools-toggle"
        variant="outlined"
        :disabled="toolItems.length === 0"
        @click="toggleAllTools"
      >
        {{ isAllToolsSelected ? text('common.clear') : text('common.all') }}
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatNumber, text, displayText, localizedItemTitle } from '@/utils/locale'
import { getResultScopeLabel, getTopologyLabel } from '@/constants/catalogueLabels'
import { computed, useId } from 'vue'
import {
  EFFICIENCY_TOOL_NAMES,
  EFFICIENCY_MODALITY_OPTIONS,
  MEMORY_EFFICIENCY_RESOURCE_OPTIONS,
  getEfficiencyToolLabel,
  getEfficiencyScaleOptions,
  getEfficiencyTopologyOptions,
  type EfficiencyModality,
  type EfficiencyMemoryResourceType,
  type EfficiencyScale,
  type EfficiencyToolName,
  type EfficiencyTopology
} from '@/constants/efficiency-tools'

type EfficiencyYAxisType = 'value' | 'log'

const props = withDefaults(
  defineProps<{
  modality?: EfficiencyModality
  scale: EfficiencyScale | null
  topology: EfficiencyTopology | null
  selectedTools: EfficiencyToolName[]
  yAxisType?: EfficiencyYAxisType
  linearOnly?: boolean
  resourceType?: EfficiencyMemoryResourceType
  toolOptions?: EfficiencyToolName[]
  }>(),
  {
    modality: 'scRNA',
    toolOptions: () => [...EFFICIENCY_TOOL_NAMES]
  }
)

const emit = defineEmits<{
  (e: 'update:modality', value: EfficiencyModality): void
  (e: 'update:scale', value: EfficiencyScale | null): void
  (e: 'update:topology', value: EfficiencyTopology | null): void
  (e: 'update:selectedTools', value: EfficiencyToolName[]): void
  (e: 'update:yAxisType', value: EfficiencyYAxisType): void
  (e: 'update:resourceType', value: EfficiencyMemoryResourceType): void
}>()

const componentId = useId()
const fieldIds = {
  modality: `${componentId}-modality`,
  scale: `${componentId}-scale`,
  topology: `${componentId}-topology`,
  tools: `${componentId}-tools`
}

const isTopologyDisabled = computed(() => !props.scale || props.scale === 'extra-large')

const modalityOptions = computed(() => EFFICIENCY_MODALITY_OPTIONS.map(({ value }) => ({
  value,
  label: getResultScopeLabel(value)
})))

const scaleOptions = computed(() => getEfficiencyScaleOptions(props.modality).map(option => ({
  value: option.value,
  label: option.value === 'extra-large'
    ? text('efficiency.scale.extraLarge')
    : option.value === 'large'
      ? `${text('efficiency.scale.cells', { count: formatNumber(240) })} · ${text('efficiency.scale.genes', { count: formatNumber(320) })}`
      : text(option.value.startsWith('cell') ? 'efficiency.scale.cells' : 'efficiency.scale.genes', {
        count: formatNumber(({ cell1000: 120, gene1000: 80, cell1967: 180, gene9836: 160 } as Record<string, number>)[option.value] ?? 0, { useGrouping: true })
      })
})))
const topologyOptions = computed(() => getEfficiencyTopologyOptions(props.modality).map(option => ({
  value: option.value,
  label: option.value === 'disconnected'
    ? text('efficiency.topology.disconnected')
    : getTopologyLabel(option.value)
})))

const yAxisTypeValue = computed<EfficiencyYAxisType>(() => props.yAxisType ?? 'log')

const resourceTypeValue = computed<EfficiencyMemoryResourceType | null>(() => props.resourceType ?? null)

const toolValues = computed<EfficiencyToolName[]>(() =>
  [...props.toolOptions]
)

const toolItems = computed(() =>
  toolValues.value.map((tool) => ({ title: getEfficiencyToolLabel(tool), value: tool }))
)

const toolsSummaryText = computed(() => {
  const selectedCount = props.selectedTools.length
  if (!selectedCount) return ''

  if (selectedCount === 1) {
    const [firstSelectedTool] = props.selectedTools
    return firstSelectedTool ? getEfficiencyToolLabel(firstSelectedTool) : ''
  }

  const totalCount = toolValues.value.length
  if (totalCount && selectedCount >= totalCount) {
    return text('common.all')
  }
  return text('common.selected', { count: formatNumber(selectedCount) })
})

const isAllToolsSelected = computed(() => {
  if (!toolValues.value.length) return false
  if (props.selectedTools.length !== toolValues.value.length) return false
  const selectedSet = new Set(props.selectedTools)
  return toolValues.value.every((tool) => selectedSet.has(tool))
})

const toggleAllTools = () => {
  if (isAllToolsSelected.value) {
    emit('update:selectedTools', [])
  } else {
    emit('update:selectedTools', [...toolValues.value])
  }
}

const updateScale = (value: EfficiencyScale | null) => {
  emit('update:scale', value ?? null)
}

const updateTopology = (value: EfficiencyTopology | null) => {
  emit('update:topology', value ?? null)
}

const updateSelectedTools = (value: unknown) => {
  const normalized = Array.isArray(value) ? value : []
  const selected = normalized
    .filter((item): item is string => typeof item === 'string')
    .filter((item): item is EfficiencyToolName =>
      (EFFICIENCY_TOOL_NAMES as readonly string[]).includes(item)
    )
  emit('update:selectedTools', selected)
}

const setYAxisType = (value: EfficiencyYAxisType) => {
  if (value === 'log' && props.linearOnly) return
  if (yAxisTypeValue.value === value) return
  emit('update:yAxisType', value)
}

const setResourceType = (value: EfficiencyMemoryResourceType) => {
  if (resourceTypeValue.value === value) return
  emit('update:resourceType', value)
}
</script>

<style lang="scss">
@use '@/styles/components/efficiency-metric.scss';
</style>
