<template>
  <div class="usability-page">
    <header class="metric-hero">
      <div class="metric-header-row">
        <h1 class="metric-title">{{ displayText(metricInfo.displayName ?? metricInfo.name) }}</h1>
      </div>

      <p class="metric-description">
        {{ displayText(metricInfo.description) }}
      </p>
    </header>

    <StatusMessage
      v-if="loading"
      state="loading"
      :title="text('usability.loadingUsabilityData')"
      :description="text('usability.pleaseWaitWhileWeFetchTheTool')"
    />

    <div v-else-if="error" class="usability-error-state">
      <div class="data-empty-card">
        <v-icon size="64" color="primary" class="data-empty-card__icon" icon="$mdi-table-off" />
        <p class="data-empty-card__title">{{ text('usability.dataFileTemporarilyUnavailable') }}</p>
      </div>
    </div>

    <template v-else>
      <div class="card-view">
        <div v-if="shouldRenderSidebar" class="tool-selector-sidebar-slot">
          <ResultNavigationSidebar
            ref="navigationRef"
            :sections="navigationSections"
            :active-id="selectedToolId"
            :top-offset="navigationTopOffset"
            :show-back-top="true"
            :footer-offset="footerOffset"
            :collapsible="false"
            position-mode="sticky"
            mode="tools"
            @select="handleSidebarSelect"
            @backTop="handleSidebarBackTop"
          />
        </div>

        <section v-else class="tool-selector-mobile" :aria-label="text('usability.methodSelector')">
          <v-select
            :model-value="selectedToolId"
            :items="mobileToolOptions"
            :item-title="item => localizedItemTitle(item, 'label')"
            item-value="value"
            variant="outlined"
            density="comfortable"
            color="primary"
            hide-details
            menu-icon="$mdi-chevron-down"
            :label="text('usability.method')"
            class="tool-selector-mobile__select"
            :aria-label="text('usability.selectAMethod')"
            @update:model-value="handleMobileToolSelect"
          />
        </section>

        <article
          v-if="selectedTool"
          ref="detailCardRef"
          class="tool-detail-card tool-detail-card--rich"
        >
          <div class="tool-detail-header">
            <h2 class="tool-detail-title">{{ selectedTool.method }}</h2>
            <div class="tool-detail-score">
              <span class="tool-detail-score-label">{{ text('usability.overallScore') }}</span>
              <span class="tool-detail-score-value">{{ formatScore(selectedTool.overallScore) }}</span>
            </div>
          </div>

          <section v-if="selectedTool.sources.length > 0" class="tool-detail-section tool-source-panel">
            <div class="tool-source-panel__line">
              <h3 class="tool-detail-section__title tool-source-panel__title">{{ text('usability.relatedLinks') }}</h3>
              <div class="tool-source-panel__links" :aria-label="text('usability.relatedLinks2')">
                <template v-for="(source, index) in selectedTool.sources" :key="source.url">
                  <span v-if="index > 0" class="tool-source-panel__separator" aria-hidden="true">|</span>
                  <a
                    :href="source.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="tool-source-link"
                  >
                    {{ displayText(source.label) }}
                  </a>
                </template>
              </div>
            </div>
          </section>

          <div
            class="tool-category-sections"
            :class="{ 'tool-category-sections--with-divider': selectedTool.sources.length > 0 }"
          >
            <section
              v-for="category in selectedTool.categories"
              :key="category.name"
              class="tool-detail-section tool-category-section"
            >
              <h3
                class="tool-detail-section__title tool-category-section__heading"
                :class="{ 'tool-category-section__heading--collapsed': isCategoryCollapsed(category.name) }"
              >
                <button
                  type="button"
                  class="tool-category-section__trigger"
                  :aria-expanded="!isCategoryCollapsed(category.name)"
                  @click="toggleCategory(category.name)"
                >
                  <span class="tool-category-section__title-text">{{ displayText(category.name) }}</span>
                  <v-icon
                    class="tool-category-section__icon"
                    :class="{ 'tool-category-section__icon--collapsed': isCategoryCollapsed(category.name) }"
                    icon="$mdi-chevron-down"
                    aria-hidden="true"
                  />
                </button>
              </h3>

              <div v-show="!isCategoryCollapsed(category.name)" class="tool-subcategory-list">
                <article
                  v-for="item in category.items"
                  :key="`${category.name}-${item.subcategory}`"
                  class="tool-subcategory-item"
                >
                  <h4 class="tool-subcategory-item__title">{{ displayText(item.subcategory) }}</h4>
                  <p class="tool-subcategory-item__note">{{ uiLocale === 'zh-Hans' ? item.evidenceNoteZhHans : item.evidenceNote }}</p>
                </article>
              </div>
            </section>
          </div>
        </article>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { en } from '@/locales/en'
import { formatNumber, text, displayText, localizedItemTitle, uiLocale } from '@/utils/locale'
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick, type ComponentPublicInstance } from 'vue'
import { type LocationQueryRaw, useRoute, useRouter } from 'vue-router'
import Papa from 'papaparse'
import { resolvePublicAsset } from '@/utils/path'
import { useDisplay } from 'vuetify'
import { getMetricById } from '@/constants/metrics'
import StatusMessage from '@/components/common/StatusMessage.vue'
import ResultNavigationSidebar from '@/components/common/ResultNavigationSidebar.vue'
import { useScrollContainer } from '@/composables/useScrollContainer'
import { useResultNavigation, type ResultNavigationSection } from '@/composables/result'

const metricInfo = getMetricById('usability')!
const route = useRoute()
const router = useRouter()
const scrollContainer = useScrollContainer()

const USABILITY_AUTO_SCROLL_STORAGE_KEY = 'lab-template:usability:autoScroll'
const USABILITY_SESSION_VISITED_KEY = 'lab-template:usability:sessionVisited'
const AUTO_SCROLL_INTENT_TTL_MS = 30_000

interface UsabilityDetailRow {
  method: string
  overallScore: number | null
  category: string
  subcategory: string
  evidenceNote: string
  evidenceNoteZhHans: string
  sourceUrls: string[]
}

interface UsabilityCategoryDetail {
  name: string
  items: Array<{
    subcategory: string
    evidenceNote: string
    evidenceNoteZhHans: string
  }>
}

interface UsabilityTool {
  method: string
  overallScore: number | null
  categories: UsabilityCategoryDetail[]
  sources: Array<{
    label: string
    url: string
  }>
}

const loading = ref(true)
const error = ref(false)
const errorMessage = ref('')
const toolsData = ref<UsabilityTool[]>([])
const selectedToolId = ref('ExampleShared')
const detailCardRef = ref<HTMLElement | null>(null)
const navigationRef = ref<HTMLElement | ComponentPublicInstance | null>(null)
const suppressAutoScroll = ref(false)
const isInitialLoad = ref(true)

const display = useDisplay()
const isStackedLayout = computed(() => display.width.value <= 768)
const shouldRenderSidebar = computed(() => !isStackedLayout.value)
const DEFAULT_NAVIGATION_TOP_OFFSET = 112
const navigationTopOffset = ref(DEFAULT_NAVIGATION_TOP_OFFSET)

const asLocationQueryRaw = (query: Record<string, unknown>): LocationQueryRaw => {
  return query as LocationQueryRaw
}

const CATEGORY_ORDER = ['Installability', 'Code quality', 'Usage guidance', 'Maintenance', 'Publication quality']

const SUBCATEGORY_ORDER: Record<string, string[]> = {
  'Installability': [
    'Repository access / open source',
    'Version control / release tags',
    'Packaging support',
    'Dependency/environment complexity',
    'License clarity',
    'Runnable interface'
  ],
  'Code quality': [
    'Code modularity',
    'API / convention / interoperability',
    'Robustness / error handling',
    'Plotting / downstream analysis support',
    'Code style / duplication / variable clarity / conciseness'
  ],
  'Usage guidance': [
    'Installation guide',
    'Quick-start / minimal workflow',
    'Tutorials / notebooks',
    'Input data format / preprocessing',
    'Parameters / output / troubleshooting'
  ],
  'Maintenance': [
    'Recent updates / release activity',
    'Dependency compatibility',
    'Issue tracking / user support',
    'Bug/error documentation',
    'Maintainer/community continuity'
  ],
  'Publication quality': [
    'Peer-reviewed publication',
    'Data scale used in publication',
    'Benchmarking against other methods'
  ]
}

const getToolSources = (rows: UsabilityDetailRow[]): UsabilityTool['sources'] => {
  let repositories = 0
  return Array.from(new Set(rows.flatMap(row => row.sourceUrls))).map(url => {
    const { hostname } = new URL(url)
    let label: string = en['usability.publication']
    if (hostname === 'github.com') {
      label = repositories++ === 0 ? en['usability.gitHubRepository'] : en['usability.exampleCode']
    } else if (hostname === 'pypi.org') {
      label = en['usability.package']
    } else if (hostname === 'zenodo.org') {
      label = en['usability.softwareRelease']
    } else if (url.includes('10.1101/') || url.includes('10.64898/') || hostname.endsWith('biorxiv.org')) {
      label = en['usability.preprint']
    } else if (hostname.includes('readthedocs') || hostname.startsWith('docs.') ||
               hostname === 'MethodA.org' || url.includes('ExampleMethod05_website')) {
      label = en['usability.guide']
    }
    return { label, url }
  })
}

const getSubcategoryOrder = (category: string, subcategory: string): number => {
  const order = SUBCATEGORY_ORDER[category]
  if (!order) {
    return 999
  }
  const index = order.indexOf(subcategory)
  return index === -1 ? 999 : index
}

const selectedTool = computed(() => {
  const current = toolsData.value.find((tool) => tool.method === selectedToolId.value)
  return current ?? toolsData.value[0]
})

const collapsedCategories = ref<Record<string, boolean>>({})

const syncCollapsedCategories = (categories: UsabilityCategoryDetail[]) => {
  const nextState: Record<string, boolean> = {}
  categories.forEach(({ name }) => {
    nextState[name] = false
  })
  collapsedCategories.value = nextState
}

const isCategoryCollapsed = (categoryName: string) => collapsedCategories.value[categoryName] ?? false

const toggleCategory = (categoryName: string) => {
  collapsedCategories.value = {
    ...collapsedCategories.value,
    [categoryName]: !isCategoryCollapsed(categoryName)
  }
}

const navigationSections = computed<ResultNavigationSection[]>(() =>
  toolsData.value.map((tool) => ({
    id: tool.method,
    label: tool.method
  }))
)

const mobileToolOptions = computed(() =>
  toolsData.value.map((tool) => ({
    label: tool.method,
    value: tool.method
  }))
)

watch(
  selectedTool,
  (tool) => {
    syncCollapsedCategories(tool?.categories ?? [])
  },
  { immediate: true }
)

const { footerOffset, refreshFooterOffset } = useResultNavigation({
  sections: navigationSections,
  activeId: selectedToolId,
  topOffset: navigationTopOffset,
  footerSelector: '.app-footer',
  navigationRef,
  autoCenterActive: true,
  syncActiveOnScroll: false,
  listenToScroll: false
})

const TOOL_DETAIL_SCROLL_GAP = 8
const DEFAULT_FIXED_STACK_OFFSET = 64 + 52
const SCROLL_RETRY_DELAYS = [0, 180, 360, 540, 720]
const SCROLL_THRESHOLD = 6

const getToolDetailScrollOffset = (containerRectTop: number) => {
  const bar =
    document.querySelector<HTMLElement>('.metric-sub-nav__bar') ||
    document.querySelector<HTMLElement>('.metric-sub-nav')
  if (bar) {
    const rect = bar.getBoundingClientRect()
    return rect.bottom - containerRectTop + TOOL_DETAIL_SCROLL_GAP
  }
  return DEFAULT_FIXED_STACK_OFFSET + TOOL_DETAIL_SCROLL_GAP
}

const normalizeToolName = (value: unknown): string => String(value ?? '').trim()

const isFirstVisitInSession = (tool: string): boolean => {
  try {
    const visited = sessionStorage.getItem(USABILITY_SESSION_VISITED_KEY)
    if (!visited) {
      return true
    }
    const visitedTools = JSON.parse(visited) as string[]
    return !visitedTools.includes(tool.toLowerCase())
  } catch {
    return true
  }
}

const markVisitedInSession = (tool: string) => {
  try {
    const visited = sessionStorage.getItem(USABILITY_SESSION_VISITED_KEY)
    const visitedTools: string[] = visited ? JSON.parse(visited) : []
    const normalizedTool = tool.toLowerCase()
    if (!visitedTools.includes(normalizedTool)) {
      visitedTools.push(normalizedTool)
      sessionStorage.setItem(USABILITY_SESSION_VISITED_KEY, JSON.stringify(visitedTools))
    }
  } catch {
    // ignore
  }
}

const consumeAutoScrollIntent = (expectedTool: string): boolean => {
  const normalizedExpected = normalizeToolName(expectedTool).toLowerCase()

  try {
    const raw = localStorage.getItem(USABILITY_AUTO_SCROLL_STORAGE_KEY)
    if (raw) {
      localStorage.removeItem(USABILITY_AUTO_SCROLL_STORAGE_KEY)
      const parsed = JSON.parse(raw) as { tool?: unknown; ts?: unknown; source?: unknown }
      if (parsed.source === 'tool-card') {
        const normalizedTool = normalizeToolName(parsed.tool).toLowerCase()
        if (normalizedTool && normalizedTool === normalizedExpected) {
          if (typeof parsed.ts === 'number' && Date.now() - parsed.ts <= AUTO_SCROLL_INTENT_TTL_MS) {
            markVisitedInSession(expectedTool)
            return true
          }
        }
      }
    }
  } catch {
    try {
      localStorage.removeItem(USABILITY_AUTO_SCROLL_STORAGE_KEY)
    } catch {
      // ignore
    }
  }

  if (isFirstVisitInSession(expectedTool)) {
    markVisitedInSession(expectedTool)
    return true
  }

  return false
}

const selectTool = async (toolName: string) => {
  const isSameTool = selectedToolId.value === toolName
  selectedToolId.value = toolName

  if (isSameTool) {
    return
  }

  suppressAutoScroll.value = true
  await router.replace({
    path: route.path,
    query: {
      ...route.query,
      tool: toolName
    }
  })
}

const handleSidebarSelect = async (toolName: string) => {
  const isSameTool = selectedToolId.value === toolName
  await selectTool(toolName)
  if (isSameTool) {
    await scrollToToolDetail()
    return
  }
  await scrollToToolDetail()
}

const handleMobileToolSelect = async (toolName: string | null) => {
  if (!toolName) {
    return
  }
  await handleSidebarSelect(toolName)
}

const handleSidebarBackTop = () => {
  scrollContainer.scrollToTop('auto')
}

const updateNavigationTopOffset = () => {
  if (typeof window === 'undefined') {
    navigationTopOffset.value = DEFAULT_NAVIGATION_TOP_OFFSET
    return
  }

  const bar =
    document.querySelector<HTMLElement>('.metric-sub-nav__bar') ||
    document.querySelector<HTMLElement>('.metric-sub-nav')

  navigationTopOffset.value = bar
    ? Math.ceil(bar.getBoundingClientRect().bottom)
    : DEFAULT_NAVIGATION_TOP_OFFSET
}

const formatScore = (score: number | null) =>
  typeof score === 'number' && Number.isFinite(score) ? formatNumber(score, { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : 'NA'

const parseOverallScore = (value: string | undefined): number | null => {
  const normalized = String(value ?? '').trim()
  if (!normalized || normalized.toUpperCase() === 'NA') {
    return null
  }
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const scrollToToolDetail = async () => {
  await nextTick()

  let completed = false
  let retryCount = 0
  const MAX_RETRIES = 150

  const performScroll = () => {
    if (completed) {
      return
    }

    const target = detailCardRef.value ?? document.querySelector<HTMLElement>('.usability-page .tool-detail-card')
    if (!target) {
      if (retryCount < MAX_RETRIES) {
        retryCount += 1
        requestAnimationFrame(() => performScroll())
      }
      return
    }

    const containerEl =
      scrollContainer.containerRef.value ??
      document.querySelector<HTMLElement>('.v-main.app-shell-main') ??
      document.querySelector<HTMLElement>('.app-shell-main')
    if (!containerEl) {
      if (retryCount < MAX_RETRIES) {
        retryCount += 1
        requestAnimationFrame(() => performScroll())
      }
      return
    }

    const containerRect = containerEl.getBoundingClientRect()
    const rect = target.getBoundingClientRect()
    const offset = getToolDetailScrollOffset(containerRect.top)
    const desiredTop = Math.max(rect.top - containerRect.top + containerEl.scrollTop - offset, 0)

    if (Math.abs(containerEl.scrollTop - desiredTop) <= SCROLL_THRESHOLD) {
      completed = true
      return
    }

    containerEl.scrollTo({ top: desiredTop, left: 0, behavior: 'auto' })
    requestAnimationFrame(() => {
      if (Math.abs(containerEl.scrollTop - desiredTop) <= SCROLL_THRESHOLD) {
        completed = true
      }
    })
  }

  requestAnimationFrame(() => performScroll())
  SCROLL_RETRY_DELAYS.slice(1).forEach(delay => {
    window.setTimeout(() => performScroll(), delay)
  })
}

async function loadUsabilityData() {
  let shouldScrollToTool = false

  try {
    loading.value = true
    error.value = false

    const detailResponse = await fetch(resolvePublicAsset('sheets/tool_usability.csv').replace(/\\+/g, '/'))

    if (!detailResponse.ok) {
      throw new Error(`HTTP ${detailResponse.status}: Failed to fetch tool_usability.csv`)
    }

    const detailCsvText = await detailResponse.text()

    const parsedDetails = Papa.parse<Record<string, string>>(detailCsvText, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      transformHeader: header => header.replace(/^\uFEFF/, '').trim()
    })

    const detailRows: UsabilityDetailRow[] = parsedDetails.data
      .filter(row => row.Method && row.Category && row.Subcategory)
      .map(row => ({
        method: String(row.Method).trim(),
        overallScore: parseOverallScore(row['Overall score']),
        category: String(row.Category).trim(),
        subcategory: String(row.Subcategory).trim(),
        evidenceNote: String(row['Evidence note'] ?? '').trim(),
        evidenceNoteZhHans: String(row['Evidence note zh-Hans'] ?? '').trim(),
        sourceUrls: String(row['Source URL'] ?? '').split(';').map(url => url.trim()).filter(Boolean)
      }))

    if (parsedDetails.errors.length || !detailRows.length || detailRows.some(row =>
      !row.evidenceNote || !row.evidenceNoteZhHans || row.overallScore === null
    )) {
      throw new Error('Usability data is incomplete or malformed')
    }

    const byMethod = new Map<string, UsabilityDetailRow[]>()
    detailRows.forEach((row) => {
      const existing = byMethod.get(row.method)
      if (existing) {
        existing.push(row)
      } else {
        byMethod.set(row.method, [row])
      }
    })

    toolsData.value = Array.from(byMethod.entries()).map(([method, rows]) => {
      const categoryMap = new Map<string, UsabilityCategoryDetail['items']>()
      rows.forEach((row) => {
        const existing = categoryMap.get(row.category)
        const item = {
          subcategory: row.subcategory,
          evidenceNote: row.evidenceNote,
          evidenceNoteZhHans: row.evidenceNoteZhHans
        }
        if (existing) {
          existing.push(item)
        } else {
          categoryMap.set(row.category, [item])
        }
      })

      const categories = Array.from(categoryMap.entries())
        .sort((a, b) => CATEGORY_ORDER.indexOf(a[0]) - CATEGORY_ORDER.indexOf(b[0]))
        .map(([name, items]) => ({
          name,
          items: items.sort(
            (a, b) =>
              getSubcategoryOrder(name, a.subcategory) - getSubcategoryOrder(name, b.subcategory)
          )
        }))

      return {
        method,
        overallScore: rows[0]?.overallScore ?? null,
        categories,
        sources: getToolSources(rows)
      }
    }).sort((a, b) => {
      if ((b.overallScore ?? -Infinity) !== (a.overallScore ?? -Infinity)) {
        return (b.overallScore ?? -Infinity) - (a.overallScore ?? -Infinity)
      }
      return a.method.localeCompare(b.method)
    })

    const toolFromUrl = route.query.tool as string | undefined
    const autoScrollParam = String(route.query.autoScroll ?? '') === 'true'

    if (toolFromUrl) {
      const match = toolsData.value.find(tool => tool.method === toolFromUrl)
      if (match) {
        selectedToolId.value = match.method
        shouldScrollToTool = autoScrollParam && consumeAutoScrollIntent(match.method)
      } else {
        const [firstPrepared] = toolsData.value
        if (firstPrepared) {
          selectedToolId.value = firstPrepared.method
        }
      }
    } else {
      const [firstPrepared] = toolsData.value
      if (firstPrepared) {
        selectedToolId.value = firstPrepared.method
      }
    }
  } catch (err) {
    error.value = true
    errorMessage.value = err instanceof Error ? err.message : 'Unknown error occurred while loading data'
    console.error('Failed to load usability data:', err)
  } finally {
    loading.value = false
    await nextTick()
    refreshFooterOffset()

    if (shouldScrollToTool) {
      await scrollToToolDetail()
    }

    if (route.query.autoScroll) {
      const cleanedQuery: Record<string, unknown> = { ...route.query }
      delete cleanedQuery.autoScroll
      await router.replace({ query: asLocationQueryRaw(cleanedQuery) })
    }

    if (selectedToolId.value) {
      const currentTool = route.query.tool as string | undefined
      if (currentTool !== selectedToolId.value) {
        suppressAutoScroll.value = true
        await router.replace({
          query: {
            ...route.query,
            tool: selectedToolId.value
          }
        })
      }
    }

    isInitialLoad.value = false
  }
}

watch(
  () => route.query.tool,
  (newTool) => {
    if (isInitialLoad.value) {
      return
    }
    if (typeof newTool !== 'string' || toolsData.value.length === 0) {
      return
    }
    const match = toolsData.value.find(tool => tool.method === newTool)
    if (match) {
      selectedToolId.value = match.method
      if (suppressAutoScroll.value) {
        suppressAutoScroll.value = false
        return
      }
      nextTick(() => scrollToToolDetail())
    }
  }
)

onMounted(() => {
  updateNavigationTopOffset()
  window.addEventListener('resize', updateNavigationTopOffset, { passive: true })
  loadUsabilityData()
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateNavigationTopOffset)
  }
})

watch(
  selectedToolId,
  async () => {
    await nextTick()
    updateNavigationTopOffset()
    refreshFooterOffset()
  },
  { flush: 'post' }
)
</script>

<style scoped lang="scss">
.tool-selector-sidebar-slot {
  min-width: 280px;
}

.tool-detail-card--rich {
  padding: 28px;
}

.tool-detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.tool-source-panel {
  margin-top: 24px;
}

.tool-detail-section + .tool-detail-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px dashed var(--color-accent);
}

.tool-detail-section__title {
  margin: 0 0 14px;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.4;
  color: var(--text-body-color);
}

.tool-source-panel__line {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 10px;
  min-width: 0;
}

.tool-source-panel__title {
  margin-bottom: 0;
  flex: 0 0 auto;
}

.tool-source-panel__links {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0;
  min-width: 0;
}

.tool-source-link {
  color: var(--color-accent);
  font-size: 18px;
  font-weight: 600;
  text-decoration: underline;
  text-decoration-color: rgba(var(--v-theme-accent), 0.35);
  text-decoration-thickness: 2px;
  text-underline-offset: 2px;
  transition: color 0.2s ease, text-decoration-color 0.2s ease;
}

.tool-source-link:hover,
.tool-source-link:focus-visible {
  color: var(--color-accent-dark);
  text-decoration-color: rgba(var(--v-theme-accentDark), 0.6);
}

.tool-source-panel__separator {
  padding: 0 8px;
  color: var(--text-muted-color);
}

.tool-category-sections {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.tool-category-sections--with-divider {
  padding-top: 24px;
  border-top: 1px dashed var(--color-accent);
}

.tool-category-section {
  padding-left: 0;
}

.tool-category-section__heading {
  margin-bottom: 16px;
}

.tool-category-section__heading--collapsed {
  margin-bottom: 0;
}

.tool-category-section__trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.tool-category-section__title-text {
  flex: 1;
}

.tool-category-section__icon {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  min-height: 24px;
  font-size: 24px;
  line-height: 1;
  color: var(--color-accent);
  transition: transform 0.18s ease;
}

.tool-category-section__icon--collapsed {
  transform: rotate(90deg);
}

.tool-subcategory-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.tool-subcategory-item + .tool-subcategory-item {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(var(--v-theme-accent), 0.14);
}

.tool-subcategory-item__title {
  margin: 0 0 2px;
  font-size: 18px;
  line-height: 1.5;
  color: var(--text-body-color);
}

.tool-subcategory-item__note {
  margin: 0;
  font-size: 18px;
  line-height: 1.65;
  color: var(--text-muted-color);
}

@media (max-width: 960px) {
  .tool-detail-header {
    flex-direction: column;
  }
}
</style>
