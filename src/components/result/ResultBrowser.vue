<template>
  <Teleport to="body">
    <div ref="rootRef" class="result-browser">
      <section
        v-if="openState === 'panel'"
        id="result-browser-panel"
        class="result-browser__panel"
        role="dialog"
        aria-modal="false"
        aria-labelledby="result-browser-title"
        :data-mode="mode"
        :data-source="source"
      >
        <header class="result-browser__panel-header">
          <h2 id="result-browser-title" class="result-browser__title">{{ text('resultBrowser.browseResults') }}</h2>
          <nav class="result-browser__mode-tabs" :aria-label="text('resultBrowser.browseResults')">
            <button type="button" :aria-pressed="mode === 'data'" @click="selectMode('data')">{{ text('resultBrowser.data') }}</button>
            <button type="button" :aria-pressed="mode === 'tool'" @click="selectMode('tool')">{{ text('common.tools') }}</button>
          </nav>
        </header>

        <div class="result-browser__filters" :class="{ 'result-browser__filters--data': mode === 'data' }">
          <v-select
            v-model="filterScope"
            v-model:menu="scopeMenuOpen"
            class="result-browser__scope-field"
            :items="scopeOptions"
            :item-title="item => localizedItemTitle(item, 'label')"
            item-value="value"
            :label="text('common.dataModality')"
            :aria-label="text('common.dataModality')"
            variant="outlined"
            density="comfortable"
            hide-details
            :menu-props="{ contentClass: ['app-select-menu', 'result-browser__scope-menu'] }"
          />
          <nav v-if="mode === 'data'" class="result-browser__source-tabs" :aria-label="text('common.dataType')">
            <button
              v-for="nextSource in browserSources"
              :key="nextSource"
              type="button"
              :aria-pressed="source === nextSource"
              :disabled="!availableSources.includes(nextSource)"
              :title="availableSources.includes(nextSource) ? undefined : text('resultBrowser.noDatasetsForModality')"
              @click="selectSource(nextSource)"
            >{{ text(nextSource === 'real' ? 'resultBrowser.real' : 'resultBrowser.simulated') }}</button>
          </nav>
          <label class="result-browser__search-field">
            <v-icon :icon="mdiMagnify" aria-hidden="true" />
            <input
              ref="searchRef"
              v-model="search"
              type="search"
              autocomplete="off"
              :placeholder="mode === 'data' ? text('resultBrowser.searchIdPlaceholder') : text('resultBrowser.searchTools')"
              :aria-label="mode === 'data' ? text('resultBrowser.searchDatasets') : text('resultBrowser.searchTools')"
            >
          </label>
        </div>

        <div
          ref="gridRef"
          class="result-browser__grid"
          role="group"
          :aria-label="mode === 'data' ? text('resultBrowser.datasets') : text('resultBrowser.tools')"
          @keydown="onGridKeydown"
        >
          <template v-if="mode === 'data'">
            <a
              v-for="dataset in visibleDatasets"
              :key="`${dataset.type}:${dataset.id}`"
              :href="router.resolve(datasetLocation(dataset)).href"
              class="result-browser__card"
              :title="dataset.label"
              :aria-current="isCurrentDataset(dataset) ? 'page' : undefined"
              @click.left.exact.prevent="void navigate(datasetLocation(dataset))"
            >{{ displayText(dataset.label) }}</a>
            <p v-if="!visibleDatasets.length" class="result-browser__empty">{{ text('resultBrowser.noMatches') }}</p>
          </template>
          <template v-else>
            <a
              v-for="tool in visibleTools"
              :key="tool.name"
              :href="router.resolve(toolLocation(tool.name)).href"
              class="result-browser__card"
              :title="tool.label"
              :aria-current="isCurrentTool(tool.name) ? 'page' : undefined"
              @click.left.exact.prevent="void navigate(toolLocation(tool.name))"
            >{{ displayText(tool.label) }}</a>
            <p v-if="!visibleTools.length" class="result-browser__empty">{{ text('resultBrowser.noMatches') }}</p>
          </template>
        </div>
      </section>

      <nav v-if="openState === 'dial'" id="result-browser-dial" class="result-browser__dial" :aria-label="text('resultBrowser.quickActions')">
        <button type="button" @click="openPanel">
          <span>{{ text('resultBrowser.browse') }}</span><b><v-icon :icon="mdiSwapHorizontal" aria-hidden="true" /></b>
        </button>
        <button type="button" @click="goTop">
          <span>{{ text('resultBrowser.top') }}</span><b><v-icon :icon="mdiArrowUp" aria-hidden="true" /></b>
        </button>
      </nav>
      <button
        ref="triggerRef"
        type="button"
        class="result-browser__trigger"
        :aria-label="openState === 'closed' ? text('resultBrowser.quickActions') : text('resultBrowser.closeQuickActions')"
        :aria-controls="openState === 'panel' ? 'result-browser-panel' : openState === 'dial' ? 'result-browser-dial' : undefined"
        :aria-expanded="openState !== 'closed'"
        @click="toggleDial"
      >
        <v-icon :icon="openState === 'closed' ? mdiViewGridOutline : mdiClose" aria-hidden="true" />
      </button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { getResultScopeLabel } from '@/constants/catalogueLabels'
import { text, displayText, localizedItemTitle } from '@/utils/locale'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter, type LocationQueryRaw, type RouteLocationRaw } from 'vue-router'
import { mdiArrowUp, mdiClose, mdiMagnify, mdiSwapHorizontal, mdiViewGridOutline } from '@mdi/js'
import { getRealDatasetOptions } from '@/constants/datasets'
import {
  DATASET_ID_SIMULATION_DATASETS,
  STANDARD_SIMULATION_TOPOLOGY_KEYS,
  getAvailableSizesForTopology,
  topologyKeyToLabel
} from '@/constants/simulation'
import {
  RESULT_SCOPES,
  getDatasetResultScopes,
  getToolResultScopes,
  parseResultScope,
  type ResultScope
} from '@/constants/result-scope'
import { ROUTE_NAMES } from '@/constants/routes'
import { TOOL_DEFINITIONS, getToolPublicName } from '@/constants/tools'
import { buildSimulationIdentifier } from '@/utils/formatters'
import { useScrollContainer } from '@/composables/useScrollContainer'
import { useResultRoute } from '@/composables/useResultRoute'

type BrowserMode = 'data' | 'tool'
type BrowserSource = 'real' | 'simulation'
type OpenState = 'closed' | 'dial' | 'panel'
const browserSources: readonly BrowserSource[] = ['real', 'simulation']

interface BrowserDataset {
  id: string
  label: string
  type: BrowserSource
  shape?: string
  size?: string
  byId?: boolean
}

const realDatasets: BrowserDataset[] = getRealDatasetOptions().map(option => ({
  id: String(option.value), label: option.label, type: 'real'
}))
const simulatedDatasets: BrowserDataset[] = [
  ...STANDARD_SIMULATION_TOPOLOGY_KEYS.flatMap(topology =>
    getAvailableSizesForTopology(topology).map(({ cells, genes }) => {
      const shape = topologyKeyToLabel(topology)
      const size = `${cells}*${genes}`
      return {
        id: buildSimulationIdentifier(shape, size),
        label: `${topology}_cell${cells}_gene${genes}`,
        type: 'simulation' as const,
        shape,
        size
      }
    })
  ),
  ...DATASET_ID_SIMULATION_DATASETS.map(dataset => ({
    id: dataset.id,
    label: dataset.id,
    type: 'simulation' as const,
    shape: topologyKeyToLabel(dataset.topologyKey),
    byId: true,
    ...(typeof dataset.cells === 'number' && typeof dataset.genes === 'number'
      ? { size: `${dataset.cells}*${dataset.genes}` } : {})
  }))
]
const browserTools = TOOL_DEFINITIONS.map(tool => ({ name: tool.name, label: getToolPublicName(tool.name) }))

const route = useRoute()
const router = useRouter()
const { routeState } = useResultRoute()
const scrollContainer = useScrollContainer()
const rootRef = ref<HTMLElement | null>(null)
const gridRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)
const searchRef = ref<HTMLInputElement | null>(null)
const openState = ref<OpenState>('closed')
const mode = ref<BrowserMode>('data')
const source = ref<BrowserSource>('real')
const filterScope = ref<ResultScope>('all')
const scopeMenuOpen = ref(false)
const search = ref('')
let returnFocus: HTMLElement | null = null

const datasetsForSource = computed(() => source.value === 'real' ? realDatasets : simulatedDatasets)
const availableScopes = computed(() => RESULT_SCOPES.filter(scope => mode.value === 'data'
  ? [...realDatasets, ...simulatedDatasets].some(dataset => getDatasetResultScopes(dataset.type, dataset.id).includes(scope))
  : browserTools.some(tool => getToolResultScopes(tool.name).includes(scope))
))
const availableSources = computed(() => browserSources.filter(datasetSource => {
  const datasets = datasetSource === 'real' ? realDatasets : simulatedDatasets
  return datasets.some(dataset => filterScope.value === 'all' || getDatasetResultScopes(dataset.type, dataset.id).includes(filterScope.value))
}))
const scopeOptions = computed<{ label: string; value: ResultScope }[]>(() => [
  { label: text('resultBrowser.all'), value: 'all' },
  ...availableScopes.value.map(value => ({ label: getResultScopeLabel(value), value }))
])
const searchTerm = computed(() => search.value.trim().toLocaleLowerCase())
const visibleDatasets = computed(() => datasetsForSource.value.filter(dataset =>
  (filterScope.value === 'all' || getDatasetResultScopes(dataset.type, dataset.id).includes(filterScope.value)) &&
  `${dataset.id} ${dataset.label}`.toLocaleLowerCase().includes(searchTerm.value)
))
const visibleTools = computed(() => browserTools.filter(tool =>
  (filterScope.value === 'all' || getToolResultScopes(tool.name).includes(filterScope.value)) &&
  `${tool.name} ${tool.label}`.toLocaleLowerCase().includes(searchTerm.value)
))

function currentDatasetId(): string | null {
  const state = routeState.value
  if (!state || state.mode !== 'by-dataset') return null
  return state.dataset.type === 'real'
    ? state.dataset.id ?? null
    : state.dataset.id ?? buildSimulationIdentifier(state.dataset.shape, state.dataset.size)
}

function isCurrentDataset(dataset: BrowserDataset): boolean {
  const state = routeState.value
  return state?.mode === 'by-dataset' && state.dataset.type === dataset.type && currentDatasetId() === dataset.id
}

function isCurrentTool(name: string): boolean {
  const state = routeState.value
  return state?.mode === 'by-method' && state.method.tool === name
}

function syncFromRoute(): void {
  const state = routeState.value
  if (!state) return
  mode.value = state.mode === 'by-dataset' ? 'data' : 'tool'
  source.value = state.mode === 'by-dataset' ? state.dataset.type : 'real'
  const explicitScope = route.query.scope === undefined ? null : parseResultScope(route.query.scope)
  if (explicitScope && (explicitScope === 'all' || availableScopes.value.includes(explicitScope))) {
    filterScope.value = explicitScope
  } else if (state.mode === 'by-dataset') {
    const id = currentDatasetId()
    filterScope.value = id ? getDatasetResultScopes(state.dataset.type, id)[0] ?? 'all' : 'all'
  } else {
    const toolScopes = getToolResultScopes(state.method.tool ?? '')
    filterScope.value = toolScopes.length === 1 ? toolScopes[0] ?? 'all' : 'all'
  }
  search.value = ''
}

function selectMode(nextMode: BrowserMode): void {
  if (mode.value === nextMode) return
  mode.value = nextMode
  search.value = ''
  if (filterScope.value !== 'all' && !availableScopes.value.includes(filterScope.value)) filterScope.value = 'all'
  gridRef.value?.scrollTo({ top: 0 })
}

function selectSource(nextSource: BrowserSource): void {
  if (source.value === nextSource || !availableSources.value.includes(nextSource)) return
  source.value = nextSource
  search.value = ''
  gridRef.value?.scrollTo({ top: 0 })
}

function close(restoreFocus = true): void {
  if (openState.value === 'closed') return
  scopeMenuOpen.value = false
  openState.value = 'closed'
  const focusTarget = returnFocus
  returnFocus = null
  if (restoreFocus) {
    nextTick(() => {
      if (focusTarget?.isConnected) focusTarget.focus({ preventScroll: true })
    })
  }
}

function toggleDial(): void {
  if (openState.value !== 'closed') {
    close()
    return
  }
  returnFocus = triggerRef.value
  openState.value = 'dial'
}

function openPanel(): void {
  syncFromRoute()
  openState.value = 'panel'
  void nextTick(() => searchRef.value?.focus({ preventScroll: true }))
}

function goTop(): void {
  close()
  scrollContainer.scrollToTop('auto')
}

async function navigate(location: RouteLocationRaw): Promise<void> {
  close()
  const failure = await router.push(location)
  if (!failure) scrollContainer.scrollToTop('auto')
}

function datasetLocation(dataset: BrowserDataset): RouteLocationRaw {
  const query: LocationQueryRaw = { type: dataset.type }
  if (dataset.type === 'real') {
    query.id = dataset.id
  } else {
    if (dataset.shape) query.shape = dataset.shape
    if (dataset.size) query.size = dataset.size
    if (dataset.byId) query.id = dataset.id
  }
  if (filterScope.value !== 'all' && getDatasetResultScopes(dataset.type, dataset.id).includes(filterScope.value)) {
    query.scope = filterScope.value
  }
  return { name: ROUTE_NAMES.DATASET_RESULT, query }
}

function toolLocation(name: string): RouteLocationRaw {
  const query: LocationQueryRaw = { tool: getToolPublicName(name) }
  if (filterScope.value !== 'all' && getToolResultScopes(name).includes(filterScope.value)) query.scope = filterScope.value
  return { name: ROUTE_NAMES.METHOD_RESULT, query }
}

function onGridKeydown(event: KeyboardEvent): void {
  if (!(event.target instanceof HTMLAnchorElement) || !event.target.classList.contains('result-browser__card')) return
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
  const grid = gridRef.value
  if (!grid) return
  const cards = Array.from(grid.querySelectorAll<HTMLAnchorElement>('.result-browser__card'))
  const index = cards.indexOf(event.target)
  if (index < 0) return
  const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').length
  const offsets: Record<string, number> = {
    ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns
  }
  const nextIndex = event.key === 'Home' ? 0
    : event.key === 'End' ? cards.length - 1
      : Math.max(0, Math.min(cards.length - 1, index + (offsets[event.key] ?? 0)))
  event.preventDefault()
  cards[nextIndex]?.focus({ preventScroll: true })
  cards[nextIndex]?.scrollIntoView({ block: 'nearest' })
}

function onDocumentPointerDown(event: PointerEvent): void {
  if (openState.value === 'closed') return
  const target = event.target
  if (!(target instanceof Element)) return
  // Switching appearance keeps the current browsing panel and its context open.
  if (target.closest('.theme-toggle, .language-toggle, .language-menu')) return
  if (rootRef.value?.contains(target) || target.closest('.result-browser__scope-menu')) return
  close(false)
}

function onDocumentKeydown(event: KeyboardEvent): void {
  if (openState.value === 'closed') return
  if (scopeMenuOpen.value) return
  // Yield to the header menu before Vuetify handles Escape during window bubbling.
  if (document.querySelector('.language-toggle[aria-expanded="true"]')) return
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
  }
}

watch(() => route.fullPath, () => close(false))
watch([mode, filterScope], () => {
  if (mode.value === 'data' && !availableSources.value.includes(source.value)) {
    const firstSource = availableSources.value[0]
    if (firstSource) source.value = firstSource
  }
  gridRef.value?.scrollTo({ top: 0 })
})
onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown, true)
  document.addEventListener('keydown', onDocumentKeydown, true)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown, true)
  document.removeEventListener('keydown', onDocumentKeydown, true)
})
</script>

<style lang="scss">
@use '@/styles/components/result-browser.scss';
</style>
