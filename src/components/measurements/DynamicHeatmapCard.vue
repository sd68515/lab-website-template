<template>
  <article class="heatmap-card heatmap-card--overview general-heatmap-card dynamic-heatmap"
    :aria-label="text('dynamicHeatmapCard.overallHeatmap')" :data-source="source" :data-scope="scope">
    <div ref="controlsRef" class="dynamic-heatmap__toolbar"
      :class="{ 'dynamic-heatmap__toolbar--picture': showOriginal, 'dynamic-heatmap__toolbar--simulation': simulationOnly }">
      <h3 class="heatmap-card__title">{{ text('dynamicHeatmapCard.overallHeatmap') }}</h3>
      <v-select :model-value="scope" @update:model-value="selectScope" :items="scopeOptions"
        :item-title="item => localizedItemTitle(item, 'label')" item-value="value" :label="text('common.dataModality')" :aria-label="text('common.dataModality')"
        class="general-heatmap-card__select general-heatmap-card__select--scope dynamic-heatmap__scope"
        density="comfortable" variant="outlined" color="primary" hide-details />
      <div v-if="!simulationOnly" class="general-heatmap-card__source dynamic-heatmap__source" role="group" :aria-label="text('common.dataType')">
        <v-btn v-for="option in sources" :key="option.value" type="button"
          class="general-heatmap-card__source-button" variant="text" rounded="0"
          :disabled="option.disabled" :title="option.disabled ? text('common.dataTypeUnavailable') : undefined"
          :aria-pressed="source === option.value" @click="selectSource(option.value)">{{ displayText(option.label) }}</v-btn>
      </div>
      <v-select v-if="!showOriginal" v-model="selectedCategory" :items="categoryOptions" :item-title="item => localizedItemTitle(item, 'label')" item-value="value"
        :label="text('dynamicHeatmapCard.toolCategory')" :aria-label="text('dynamicHeatmapCard.toolCategory')" density="comfortable" variant="outlined"
        color="primary" hide-details class="general-heatmap-card__select dynamic-heatmap__category"
        :disabled="!matrix || loading" />
      <div class="general-heatmap-card__source dynamic-heatmap__view" role="group" :aria-label="text('dynamicHeatmapCard.heatmapView')">
        <v-btn type="button" class="general-heatmap-card__source-button" variant="text" rounded="0"
          :aria-pressed="showOriginal" @click="showOriginal = true">{{ text('dynamicHeatmapCard.picture') }}</v-btn>
        <v-btn type="button" class="general-heatmap-card__source-button" variant="text" rounded="0"
          :aria-pressed="!showOriginal" @click="showOriginal = false">{{ text('dynamicHeatmapCard.explore') }}</v-btn>
      </div>
    </div>

    <div v-if="showOriginal" class="heatmap-card__body dynamic-heatmap__original">
      <template v-if="asset.status === 'ready'">
        <HeatmapDisplay :key="`${metricId}-${scope}-${source}`" :src="asset.src" :alt="asset.alt"
          :image-width="asset.width" :image-height="asset.height" />
      </template>
      <HeatmapDisplay v-else upload-pending />
    </div>

    <div v-else class="dynamic-heatmap__dynamic">
      <StatusMessage v-if="loading" state="loading" :title="text('dynamicHeatmapCard.loadingHeatmap')" />
      <div v-else-if="error" class="dynamic-heatmap__status" role="alert"> {{ text('dynamicHeatmapCard.unableToLoadHeatmap') }} {{ error }}
        <v-btn variant="text" color="primary" @click="load">{{ text('dynamicHeatmapCard.retry') }}</v-btn>
      </div>
      <template v-else-if="matrix">
        <p v-if="matrix.stats.min === null" class="dynamic-heatmap__status">{{ text('dynamicHeatmapCard.noNumericValuesAvailable') }}</p>
        <div v-if="visibleTools.length" class="dynamic-heatmap__matrix"
          :style="{ '--dynamic-tool-count': visibleTools.length }">
          <div ref="headerScrollRef" class="dynamic-heatmap__header"
            :class="{ 'dynamic-heatmap__header--timeline': timelineSync }">
            <table class="dynamic-heatmap__table">
              <thead><tr><th class="dynamic-heatmap__corner" scope="col">{{ text('dynamicHeatmapCard.datasetTool') }}</th>
                <th v-for="tool in visibleTools" :key="tool.id" scope="col" :data-tool-id="tool.id">
                  <v-tooltip location="top" :text="toolMeanSummary(tool.index)" :eager="false">
                    <template #activator="{ props: tooltipProps }">
                      <button v-bind="tooltipProps" type="button" class="dynamic-heatmap__tool-label"
                        :aria-label="`${tool.label}. ${toolMeanSummary(tool.index)}`"
                        @focus="revealToolColumn">{{ tool.label }}</button>
                    </template>
                  </v-tooltip>
                </th></tr></thead>
            </table>
          </div>
          <div ref="matrixScrollRef" class="dynamic-heatmap__scroll" role="region" tabindex="0"
            :aria-label="text('dynamicHeatmapCard.dynamicHeatmapMatrixScrollHorizontally')" @scroll="syncHeaderScroll">
            <table class="dynamic-heatmap__table" :aria-label="text('dynamicHeatmapCard.dynamicHeatmapScores')"
              @focusin="activateCell" @mouseover="activateCell" @click="activateCell" @keydown="navigateCell">
              <tbody><tr v-for="(dataset, rowIndex) in visibleDatasets" :key="dataset.id"
                v-memo="[dataset, visibleTools, matrix, uiLocale, activeDatasetId === dataset.id ? activeToolId : null]">
                <th scope="row" :title="`${dataset.label} · ${dataset.id}`">{{ dataset.label }}</th>
                <td v-for="(tool, columnIndex) in visibleTools" :key="tool.id"
                  :class="{ 'dynamic-heatmap__cell--na': cellRaw(tool.index, dataset.index) === null }"
                  :style="cellStyle(tool.index, dataset.index)">
                  <button type="button" class="dynamic-heatmap__cell-button"
                    :tabindex="activeDatasetId === dataset.id && activeToolId === tool.id ? 0 : -1"
                    :data-row="rowIndex" :data-column="columnIndex"
                    :aria-label="`${dataset.label}, ${tool.label}: ${cellValue(tool.index, dataset.index)}`"
                    :title="`${dataset.label} (${dataset.id}) · ${tool.label}: ${cellRaw(tool.index, dataset.index) ?? text('dynamicHeatmapCard.nA')}`">
                    {{ cellValue(tool.index, dataset.index) }}
                  </button>
                </td>
              </tr></tbody>
            </table>
          </div>
        </div>
        <p v-else class="dynamic-heatmap__status">{{ text('dynamicHeatmapCard.noToolsInThisCategory') }}</p>
      </template>
    </div>
  </article>
</template>

<script setup lang="ts">
import { getResultScopeLabel, getToolCategoryLabel } from '@/constants/catalogueLabels'
import { text, displayText, localizedItemTitle, uiLocale } from '@/utils/locale'
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import HeatmapDisplay from '@/components/common/HeatmapDisplay.vue'
import StatusMessage from '@/components/common/StatusMessage.vue'
import { getGeneralHeatmapAsset, type GeneralHeatmapAsset, type GeneralHeatmapScope } from '@/constants/general-heatmap-assets'
import { isMetricSupportedInScope } from '@/constants/metric-scope-policy'
import { formatHeatmapValue, heatmapColor, loadDynamicMatrix, type DynamicMatrix, type DynamicMetric, type DynamicSource } from '@/constants/dynamic-heatmap'
import { getRealDatasetLabel } from '@/constants/datasets'
import { excludesMetricResults } from '@/constants/result-display'
import { getToolPublicName, TOOL_DEFINITIONS, type ToolCategory, type ToolDefinition } from '@/constants/tools'
import { useScrollContainer } from '@/composables/useScrollContainer'

const toolCategoryByName = new Map(TOOL_DEFINITIONS.map(tool => [tool.name, tool.category]))
const toolCategoryLabels: readonly ToolCategory[] = ['Category A', 'Category C']
const props = defineProps<{ metricId: DynamicMetric; simulationOnly?: boolean }>()
const source = ref<DynamicSource>(props.simulationOnly ? 'simulation' : 'real')
const scopeOptions = computed(() => {
  const options = [
    { label: getResultScopeLabel('scRNA'), value: 'scRNA' as const },
    { label: getResultScopeLabel('ATAC'), value: 'ATAC' as const },
    ...props.simulationOnly ? [] : [
      { label: getResultScopeLabel('SPATIAL'), value: 'SPATIAL' as const },
      { label: getResultScopeLabel('LINEAGE'), value: 'LINEAGE' as const }
    ]
  ]
  return options.filter(option => isMetricSupportedInScope(props.metricId, option.value))
})
const scope = ref<GeneralHeatmapScope>('scRNA')
const supportsSource = (value: DynamicSource) =>
  (!props.simulationOnly || value === 'simulation') && (scope.value !== 'LINEAGE' || value === 'real')
const sources = computed(() => [
  { label: text('dynamicHeatmapCard.real'), value: 'real' as const, disabled: !supportsSource('real') },
  { label: text('dynamicHeatmapCard.simulated'), value: 'simulation' as const, disabled: !supportsSource('simulation') }
])
const selectedCategory = ref<ToolDefinition['category'] | 'all'>('all')
const asset = computed<GeneralHeatmapAsset>(() => isMetricSupportedInScope(props.metricId, scope.value)
  ? getGeneralHeatmapAsset(props.metricId, scope.value, source.value)
  : { status: 'pending' })
const showOriginal = ref(false)
// Loaded matrices are replaced as a whole; their cells never need deep reactivity.
const matrix = shallowRef<DynamicMatrix | null>(null)
const loading = ref(false)
const error = ref('')
const active = ref<{ toolId: string; datasetId: string } | null>(null)
const controlsRef = ref<HTMLElement | null>(null)
const headerScrollRef = ref<HTMLElement | null>(null)
const matrixScrollRef = ref<HTMLElement | null>(null)
const timelineSync = ref(false)
const scrollContainer = useScrollContainer()
let requestVersion = 0
let requestController: AbortController | null = null
let scrollFrame: number | null = null

const metricTools = computed(() => matrix.value?.tools.flatMap((tool, index) =>
  excludesMetricResults(tool.id) ? [] : [{ ...tool, index }]
) ?? [])
const categoryOptions = computed(() => {
  const present = new Set(metricTools.value.map(tool => toolCategoryByName.get(tool.id)))
  return [
    { label: text('dynamicHeatmapCard.allTools'), value: 'all' },
    ...toolCategoryLabels.filter(category => present.has(category))
      .map(category => ({ label: getToolCategoryLabel(category), value: category }))
  ]
})
const visibleTools = computed(() => {
  if (!matrix.value) return []
  const order = new Map(matrix.value.displayOrder.map((id, index) => [id, index]))
  return metricTools.value.flatMap(tool =>
    selectedCategory.value === 'all' || toolCategoryByName.get(tool.id) === selectedCategory.value
      ? [{ id: tool.id, index: tool.index, label: getToolPublicName(tool.id) }] : [])
    .sort((a, b) => (order.get(a.id) ?? Infinity) - (order.get(b.id) ?? Infinity))
})
const visibleDatasets = computed(() => matrix.value?.datasets.map((id, index) => ({
  id, index, label: getRealDatasetLabel(id)
})) ?? [])
const activeDatasetId = computed(() => active.value?.datasetId ?? visibleDatasets.value[0]?.id)
const activeToolId = computed(() => active.value?.toolId ?? visibleTools.value[0]?.id)
// Formatting and scientific colors depend on the data/locale, never on focus or view toggles.
const matrixCells = computed(() => {
  const current = matrix.value
  if (!current) return []
  const { min, max } = current.stats
  return current.values.map(values => values.map(raw => ({
    label: formatHeatmapValue(raw),
    style: raw !== null && min !== null && max !== null
      ? heatmapColor(Number(raw), min, max, props.metricId === 'cbdir') : {}
  })))
})
const toolMeans = computed(() => matrix.value?.values.map(values => {
  const valid = values.filter((value): value is string => value !== null)
  const mean = valid.length ? valid.reduce((sum, value) => sum + Number(value), 0) / valid.length : null
  return text('heatmap.meanSummary', { mean: mean === null ? 'NA' : formatHeatmapValue(String(mean)), valid: valid.length, total: values.length })
}) ?? [])

function cellRaw(toolIndex: number, datasetIndex: number): string | null {
  return matrix.value?.values[toolIndex]?.[datasetIndex] ?? null
}
function cellStyle(toolIndex: number, datasetIndex: number): Record<string, string> {
  return matrixCells.value[toolIndex]?.[datasetIndex]?.style ?? {}
}
function cellValue(toolIndex: number, datasetIndex: number): string {
  return matrixCells.value[toolIndex]?.[datasetIndex]?.label ?? 'NA'
}
function toolMeanSummary(toolIndex: number): string { return toolMeans.value[toolIndex]! }
function syncHeaderScroll(): void {
  if (!timelineSync.value && headerScrollRef.value && matrixScrollRef.value) {
    headerScrollRef.value.scrollLeft = matrixScrollRef.value.scrollLeft
  }
}

function revealToolColumn(event: Event): void {
  const target = event.currentTarget
  if (!(target instanceof HTMLElement)) return
  const cell = target.closest('th')
  const body = matrixScrollRef.value
  const corner = headerScrollRef.value?.querySelector<HTMLElement>('.dynamic-heatmap__corner')
  if (!cell || !body || !corner) return

  // The clipped header cannot scroll focused labels into view itself. Move the
  // body instead, reserving the fixed Dataset column on the left.
  const left = cell.offsetLeft
  const right = left + cell.offsetWidth
  if (left < body.scrollLeft + corner.offsetWidth) {
    body.scrollLeft = left - corner.offsetWidth
  } else if (right > body.scrollLeft + body.clientWidth) {
    body.scrollLeft = right - body.clientWidth
  }
  syncHeaderScroll()
}

// Keep horizontal tracking on the browser's scroll timeline rather than waiting
// for main-thread scroll events. Older browsers retain the direct sync above.
watch([headerScrollRef, matrixScrollRef, visibleTools], ([header, body], _, onCleanup) => {
  if (!header || !body) return
  if (typeof ScrollTimeline !== 'function') {
    syncHeaderScroll()
    return
  }
  const table = header.querySelector('table')
  const corner = header.querySelector<HTMLElement>('.dynamic-heatmap__corner')
  const bodyTable = body.querySelector('table')
  if (!table || !corner || !bodyTable) return

  const timeline = new ScrollTimeline({ source: body, axis: 'inline' })
  let animations: Animation[] = []
  let previousRange = -1
  const cancelAnimations = () => {
    for (const animation of animations) animation.cancel()
    animations = []
  }
  const updateRange = () => {
    const range = Math.max(0, body.scrollWidth - body.clientWidth)
    if (range === previousRange) return
    previousRange = range
    cancelAnimations()
    header.scrollLeft = 0
    if (range === 0) return
    const options = { timeline, fill: 'both' as const, easing: 'linear' }
    animations = [
      table.animate({ transform: ['translateX(0px)', `translateX(${-range}px)`] }, options),
      corner.animate({ transform: ['translateX(0px)', `translateX(${range}px)`] }, options)
    ]
  }
  timelineSync.value = true
  const observer = new ResizeObserver(updateRange)
  observer.observe(body)
  observer.observe(bodyTable)
  updateRange()
  onCleanup(() => {
    observer.disconnect()
    cancelAnimations()
    timelineSync.value = false
  })
}, { flush: 'post' })
function eventCell(event: Event): HTMLButtonElement | null {
  return event.target instanceof Element
    ? event.target.closest<HTMLButtonElement>('.dynamic-heatmap__cell-button') : null
}
function activateCell(event: Event): void {
  const button = eventCell(event)
  if (!button) return
  const datasetId = visibleDatasets.value[Number(button.dataset.row)]?.id
  const toolId = visibleTools.value[Number(button.dataset.column)]?.id
  if (!datasetId || !toolId) return
  if (active.value?.datasetId !== datasetId || active.value.toolId !== toolId) {
    active.value = { datasetId, toolId }
  }
}
function navigateCell(event: KeyboardEvent): void {
  const offset = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[event.key]
  if (!offset) return
  const button = eventCell(event)
  if (!button) return
  const row = Number(button.dataset.row) + offset[0]!
  const column = Number(button.dataset.column) + offset[1]!
  const next = button.closest('table')?.querySelector<HTMLButtonElement>(`[data-row="${row}"][data-column="${column}"]`)
  if (next) { event.preventDefault(); next.focus() }
}
async function load(): Promise<void> {
  const version = ++requestVersion
  requestController?.abort()
  requestController = null
  const selectedScope = scope.value
  matrix.value = null
  error.value = ''
  loading.value = false
  selectedCategory.value = 'all'
  active.value = null
  if (!scopeOptions.value.some(option => option.value === selectedScope) || !supportsSource(source.value)) return
  loading.value = true
  const controller = new AbortController()
  requestController = controller
  try {
    const result = await loadDynamicMatrix(props.metricId, selectedScope, source.value, controller.signal)
    if (version === requestVersion) matrix.value = result
  } catch (cause) {
    if (version === requestVersion) error.value = cause instanceof Error ? cause.message : String(cause)
  } finally {
    if (version === requestVersion) loading.value = false
  }
}
watch(() => [props.metricId, scope.value, source.value, props.simulationOnly], () => {
  if (!scopeOptions.value.some(option => option.value === scope.value)) {
    requestVersion++
    requestController?.abort()
    requestController = null
    matrix.value = null
    error.value = ''
    loading.value = false
    selectedCategory.value = 'all'
    active.value = null
    if (scope.value !== 'scRNA' && scopeOptions.value.some(option => option.value === 'scRNA')) {
      scope.value = 'scRNA'
    }
    return
  }
  if (!supportsSource(source.value)) {
    const nextSource = sources.value.find(option => !option.disabled)
    if (nextSource) source.value = nextSource.value
    return
  }
  void load()
}, { immediate: true })
watch(selectedCategory, () => { active.value = null })
async function updateSelection(update: () => void): Promise<void> {
  const controls = controlsRef.value
  const main = scrollContainer.containerRef.value
  const previousTop = controls?.getBoundingClientRect().top
  if (scrollFrame !== null) cancelAnimationFrame(scrollFrame)
  update()
  await nextTick()
  if (!controls || !main || previousTop === undefined) return
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = null
    const delta = controls.getBoundingClientRect().top - previousTop
    if (Math.abs(delta) > 1) main.scrollTop += delta
  })
}
function selectSource(value: DynamicSource): void {
  if (value === source.value || !supportsSource(value)) return
  void updateSelection(() => {
    source.value = value
  })
}
function selectScope(value: GeneralHeatmapScope): void {
  if (!scopeOptions.value.some(option => option.value === value)) return
  if (value === scope.value) return
  void updateSelection(() => {
    scope.value = value
    if (!supportsSource(source.value)) {
      const nextSource = sources.value.find(option => !option.disabled)
      if (nextSource) source.value = nextSource.value
    }
  })
}
onBeforeUnmount(() => {
  requestVersion++
  requestController?.abort()
  if (scrollFrame !== null) cancelAnimationFrame(scrollFrame)
})
</script>

<style lang="scss">
@use '@/styles/components/general-heatmap-card.scss';
@use '@/styles/components/dynamic-heatmap.scss';
</style>
