<!--
  DatasetResult 页面
  展示单个数据集的元数据、工具结果和导航交互
-->
<template>
  <div class="dataset-result-layout">
    <LineageBanner
      :visible="showLineageBanner"
      :text="stickyLineageText"
    />

    <ResultNavigationSidebar
      ref="navigationRef"
      v-if="shouldRenderSidebar"
      :key="navigationIdentity"
      :sections="navigationSections"
      :groups="navigationGroups"
      :active-id="activeToolId"
      :top-offset="sidebarTopOffset"
      :show-back-top="true"
      :footer-offset="footerOffset"
      mode="tools"
      @select="scrollToTool"
      @backTop="scrollToTop"
    />

    <div class="dataset-result-main">
      <div
        class="dataset-result-main-content"
        :aria-busy="datasetInfoLoading || toolResultsLoading ? 'true' : undefined"
      >
        <DatasetResultHeader
          :header-ref-setter="setHeaderSectionRef"
          :title="datasetTitle"
          :description="datasetDescription"
          :loading="datasetInfoLoading"
          :entries="datasetDetailEntries"
          :image-placeholder-text="imagePlaceholderText"
          :lineage-row-ref-setter="setLineageRowRef"
          :metadata-unavailable="metadataUnavailable"
        />

        <ResultScopeTabs :scopes="availableScopes" :scope="scope" @select="selectScope" />

        <DatasetToolList
          :key="navigationIdentity"
          :tools="displayedTools"
          :loading="toolResultsLoading"
          :scope="scope"
          :dataset-identifier="currentDatasetIdentifier"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { useDisplay } from 'vuetify'
import ResultNavigationSidebar from '@/components/common/ResultNavigationSidebar.vue'
import LineageBanner from '@/components/result/LineageBanner.vue'
import DatasetResultHeader from '@/components/result/DatasetResultHeader.vue'
import DatasetToolList from '@/components/result/DatasetToolList.vue'
import ResultScopeTabs from '@/components/result/ResultScopeTabs.vue'
import { useScrollContainer } from '@/composables/useScrollContainer'
import { useResultNavigation } from '@/composables/result'
import { useResultRoute } from '@/composables/useResultRoute'
import { useResultScope } from '@/composables/result/useResultScope'
import { useResultsData } from '@/composables/useResultsData'
import { NAV_HEIGHT } from '@/constants/measurement-layout'
import { getToolPublicName, TOOL_DEFINITIONS } from '@/constants/tools'
import { getToolCategoryLabel } from '@/constants/catalogueLabels'
import { text } from '@/utils/locale'
import { getDatasetResultScopes, getResultCombinationScopes } from '@/constants/result-scope'
import { buildSimulationIdentifier } from '@/utils/formatters'
import { groupMetricsForDisplay, type MetricGroup } from '@/utils/metrics-group'
import { withImagePlaceholders } from './resourcePlaceholders'
import type { DatasetTool, MetricCategorySection } from '@/types'

type DisplayMetric = MetricCategorySection & Record<string, unknown>

type DatasetToolWithId = DatasetTool & {
  id: string
  groupedMetrics: MetricGroup<DisplayMetric>[]
}

const display = useDisplay()
const shouldRenderSidebar = computed(() => display.width.value > 768)

const scrollContainer = useScrollContainer()
const { routeState } = useResultRoute()
const { scope, selectScope } = useResultScope()

const datasetIdentity = computed(() => {
  const state = routeState.value
  if (!state || state.mode !== 'by-dataset') return null
  const dataset = state.dataset
  const id = dataset.type === 'real'
    ? dataset.id ?? ''
    : (dataset.id ?? '').trim() || buildSimulationIdentifier(dataset.shape ?? '', dataset.size ?? '')
  return { type: dataset.type, id }
})
const availableScopes = computed(() => {
  const identity = datasetIdentity.value
  return identity ? getDatasetResultScopes(identity.type, identity.id) : []
})
const navigationIdentity = computed(() => `${datasetIdentity.value?.type ?? ''}:${datasetIdentity.value?.id ?? ''}:${scope.value}`)

const currentDatasetIdentifier = computed(() => {
  const state = routeState.value
  if (!state || state.mode !== 'by-dataset') return ''
  const dataset = state.dataset
  if (dataset.type !== 'simulation') return ''
  const directId = (dataset.id ?? '').trim()
  if (directId) return directId
  if (!dataset.shape || !dataset.size) return ''
  return buildSimulationIdentifier(dataset.shape, dataset.size)
})

const {
  datasetTitle,
  datasetDescription,
  datasetDetailEntries,
  datasetInfoLoading,
  toolResults,
  toolResultsLoading,
  isRealDataset,
  lineageValue,
  imagePlaceholderText,
  metadataUnavailable,
} = useResultsData({ routeState })

const navigationRef = ref<HTMLElement | ComponentPublicInstance | null>(null)
const headerSectionRef = ref<HTMLElement | null>(null)
const lineageRowRef = ref<HTMLDivElement | null>(null)
const lineageBannerHeight = ref(0)

const activeToolId = ref('')
const BASE_TOP_OFFSET = 80

const stickyLineageText = computed(() => {
  if (!isRealDataset.value) return ''
  const value = (lineageValue.value || '').trim()
  if (!value || value === 'NA') return ''
  return value
})

const showLineageBanner = ref(false)

const setLineageRowRef = (el: HTMLDivElement | null): void => {
  lineageRowRef.value = el
}

const setHeaderSectionRef = (el: Element | ComponentPublicInstance | null): void => {
  headerSectionRef.value = el instanceof HTMLElement ? el : null
}

const sidebarTopOffset = BASE_TOP_OFFSET
const navigationTopOffset = computed(() => BASE_TOP_OFFSET + (showLineageBanner.value ? lineageBannerHeight.value : 0))

const displayedTools = computed<DatasetToolWithId[]>(() =>
  toolResults.value.filter((tool) => {
    const identity = datasetIdentity.value
    return scope.value === 'all' || Boolean(identity && getResultCombinationScopes(tool.name, identity.type, identity.id).includes(scope.value))
  }).map((tool) => ({
    ...tool,
    velocityResults: withImagePlaceholders(tool.velocityResults),
    metricsResults: tool.metricsResults.map(metric => ({ ...metric, images: withImagePlaceholders(metric.images) })),
    id: `tool-${tool.name.replace(/[^a-zA-Z0-9]/g, '-')}`,
    groupedMetrics: groupMetricsForDisplay((tool.metricsResults || []).map(metric => ({
      ...metric, images: withImagePlaceholders(metric.images)
    })) as DisplayMetric[])
  }))
)

const navigationSections = computed(() =>
  displayedTools.value.map((tool) => ({
    id: tool.id,
    label: getToolPublicName(tool.name)
  }))
)

const toolCategoryMap = new Map(TOOL_DEFINITIONS.map((tool) => [tool.name, tool.category]))

const navigationGroups = computed(() => {
  const groups: Array<{ id: string; title: string; items: { id: string; label: string }[] }> = []
  const indexByCategory = new Map<string, number>()

  displayedTools.value.forEach((tool) => {
    const rawCategory = toolCategoryMap.get(tool.name) ?? 'Other'
    const title = rawCategory === 'Other' ? text('toolCategory.other') : getToolCategoryLabel(rawCategory)
    if (!indexByCategory.has(rawCategory)) {
      indexByCategory.set(rawCategory, groups.length)
      groups.push({
        id: `category-${rawCategory.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        title,
        items: []
      })
    }
    const groupIndex = indexByCategory.get(rawCategory)
    if (groupIndex === undefined) {
      return
    }
    const group = groups[groupIndex]
    if (!group) {
      return
    }
    group.items.push({ id: tool.id, label: getToolPublicName(tool.name) })
  })

  return groups
})

const { footerOffset, refreshFooterOffset, scrollToSection, scrollToTop } = useResultNavigation({
  sections: navigationSections,
  activeId: activeToolId,
  identity: navigationIdentity,
  topOffset: navigationTopOffset,
  footerSelector: '.app-footer',
  navigationRef,
  autoCenterActive: true,
  syncActiveOnScroll: true
})

let detachLineageScrollListener: (() => void) | null = null

const updateLineageBanner = (): void => {
  if (!stickyLineageText.value) {
    showLineageBanner.value = false
    return
  }

  const rowEl = lineageRowRef.value
  if (!rowEl) {
    showLineageBanner.value = false
    return
  }

  const rect = rowEl.getBoundingClientRect()
  const bannerOffset = NAV_HEIGHT

  if (rect.bottom <= bannerOffset) {
    showLineageBanner.value = true
  } else if (rect.top >= bannerOffset) {
    showLineageBanner.value = false
  }
}

const measureLineageBannerHeight = (): void => {
  if (typeof document === 'undefined') {
    lineageBannerHeight.value = 0
    return
  }
  const bannerEl = document.querySelector<HTMLElement>('.dataset-lineage-banner')
  lineageBannerHeight.value = bannerEl ? Math.ceil(bannerEl.getBoundingClientRect().height) : 0
}

const scrollToTool = (toolId: string): void => {
  scrollToSection(toolId, 'auto')
}

onMounted(() => {
  detachLineageScrollListener?.()
  detachLineageScrollListener = scrollContainer.onScroll(() => updateLineageBanner())

  scrollToTop('auto')
  nextTick(() => {
    refreshFooterOffset()
    updateLineageBanner()
    measureLineageBannerHeight()
  })
})

onUnmounted(() => {
  detachLineageScrollListener?.()
  detachLineageScrollListener = null
})

watch(stickyLineageText, () => {
  nextTick(() => {
    updateLineageBanner()
    measureLineageBannerHeight()
  })
})

watch(scope, () => {
  activeToolId.value = ''
  nextTick(() => {
    scrollToTop('auto')
    refreshFooterOffset()
  })
})

watch(showLineageBanner, (visible) => {
  nextTick(() => measureLineageBannerHeight())
  if (visible) {
    refreshFooterOffset()
  }
})

const scheduleFooterOffsetRefresh = () => {
  refreshFooterOffset()
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(() => refreshFooterOffset())
  }
}

// 当从 loading 切换为已加载时，页面高度/是否出现滚动条会变化，
// 需要主动刷新 footerOffset，避免侧栏高度卡在 loading 态的旧值。
watch(
  [datasetInfoLoading, toolResultsLoading, () => displayedTools.value.length],
  ([infoLoading, resultsLoading]) => {
    if (infoLoading || resultsLoading) return
    scheduleFooterOffsetRefresh()
  },
  { flush: 'post' }
)
</script>

<style lang="scss">
@use '@/styles/pages/dataset-result.scss';
</style>
