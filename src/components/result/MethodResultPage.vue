<template>
  <div class="method-result-layout">
    <div class="method-result-main">
      <ResultNavigationSidebar
        v-if="shouldRenderSidebar"
        :key="navigationIdentity"
        ref="navigationRef"
        :sections="navigationSectionsFlat"
        :groups="navigationSectionsGrouped"
        :active-id="activeNavItemKey"
        :top-offset="navigationTopOffset"
        :show-back-top="true"
        :footer-offset="footerOffset"
        mode="data"
        @select="handleSelect"
        @backTop="handleBackTop"
      />
      <div class="method-result-content" :aria-busy="sectionsLoading ? 'true' : undefined">
        <MethodResultHeader
          :tool-display-title="toolDisplayTitle"
          :loading="sectionsLoading"
          :tool-metadata="toolMetadata"
          :tool-note="toolContextNote"
        />
        <ResultScopeTabs
          :scopes="availableScopes"
          :scope="scope"
          :spatial-baseline="isSpatialBaseline"
          @select="selectScope"
        />
        <MethodResultBody
          :key="navigationIdentity"
          :sections-loading="sectionsLoading"
          :load-error="!!loadError"
          :load-error-message="loadError || ''"
          :retry-load="retryLoad"
          :dataset-sections="visibleSections"
          :scope="scope"
          :tool-name="toolName"
          :image-placeholder-text="imagePlaceholderText"
          :is-metadata-expanded="isMetadataExpanded"
          :toggle-metadata="toggleMetadata"
          :metadata-transition-disabled="metadataTransitionDisabled"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch, onBeforeUnmount, type ComponentPublicInstance } from 'vue'
import { useDisplay } from 'vuetify'
import ResultNavigationSidebar from '@/components/common/ResultNavigationSidebar.vue'
import MethodResultHeader from '@/components/result/MethodResultHeader.vue'
import MethodResultBody from '@/components/result/MethodResultBody.vue'
import ResultScopeTabs from '@/components/result/ResultScopeTabs.vue'
import { useResultNavigation } from '@/composables/result'
import { useResultRoute } from '@/composables/useResultRoute'
import { useResultScope } from '@/composables/result/useResultScope'
import { useResultsData } from '@/composables/useResultsData'
import { getToolPublicName } from '@/constants/tools'
import { getResultCombinationScopes, getToolResultScopes } from '@/constants/result-scope'
import { buildMethodNavigationGroups } from '@/utils/result/methodNavigation'
import { flattenNavigationGroups } from '@/types/resultNavigation'
import { withImagePlaceholders } from './resourcePlaceholders'

const display = useDisplay()
const shouldRenderSidebar = computed(() => display.width.value > 768)

const navigationTopOffset = 80
const { routeState } = useResultRoute()
const { scope, selectScope } = useResultScope()

const { datasetSections, sectionsLoading, toolMetadata, loadError, refresh, imagePlaceholderText } =
  useResultsData({ routeState })

const toolName = computed(() => routeState.value?.method?.tool ?? '')
const navigationIdentity = computed(() => `${toolName.value}:${scope.value}`)
const availableScopes = computed(() => getToolResultScopes(toolName.value))
const isSpatialBaseline = computed(() => false)
const filteredSections = computed(() => {
  const sections = scope.value === 'all'
    ? datasetSections.value
    : datasetSections.value.filter((section) => {
      const datasetId = section.key.replace(/^(real|simulation)-/, '')
      return getResultCombinationScopes(toolName.value, section.type, datasetId).some((item) => item === scope.value)
    })
  return [...new Map(sections.map((section) => [section.key, section])).values()].map(section => ({
    ...section,
    velocityResults: withImagePlaceholders(section.velocityResults),
    metrics: section.metrics.map(metric => ({ ...metric, images: withImagePlaceholders(metric.images) }))
  }))
})
const toolDisplayTitle = computed(() => getToolPublicName(toolName.value))
const toolContextNote = computed(() => null)

const navigationRef = ref<HTMLElement | ComponentPublicInstance | null>(null)
const activeNavItemKey = ref('')
const metadataTransitionDisabled = ref(false)
const navigationSectionsGrouped = computed(() =>
  buildMethodNavigationGroups(filteredSections.value, toolName.value, isSpatialBaseline.value)
)
const navigationSectionsFlat = computed(() => flattenNavigationGroups(navigationSectionsGrouped.value))
const visibleSections = computed(() => {
  const byAnchor = new Map(filteredSections.value.map(section => [section.anchorId, section]))
  return navigationSectionsFlat.value.flatMap(item => {
    const section = byAnchor.get(item.id)
    return section ? [section] : []
  })
})

const expandedMetadataKeys = ref<Set<string>>(new Set())

function isMetadataExpanded(key: string): boolean {
  return expandedMetadataKeys.value.has(key)
}

function toggleMetadata(key: string) {
  const nextSet = new Set(expandedMetadataKeys.value)
  if (nextSet.has(key)) {
    nextSet.delete(key)
  } else {
    nextSet.add(key)
  }
  expandedMetadataKeys.value = nextSet
}

function collapseAllMetadata() {
  expandedMetadataKeys.value = new Set()
}

function resetMetadataTransition() {
  metadataTransitionDisabled.value = false
}

async function collapseMetadataBeforeNavigation() {
  if (!expandedMetadataKeys.value.size) return

  metadataTransitionDisabled.value = true
  collapseAllMetadata()
  await nextTick()
  scheduleFooterOffsetRefresh()
}

const { footerOffset, refreshFooterOffset, scrollToSection, scrollToTop } = useResultNavigation({
  sections: navigationSectionsFlat,
  activeId: activeNavItemKey,
  identity: navigationIdentity,
  topOffset: navigationTopOffset,
  footerSelector: '.app-footer',
  navigationRef,
  autoCenterActive: true,
  syncActiveOnScroll: true
})

const scheduleFooterOffsetRefresh = () => {
  refreshFooterOffset()
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(() => refreshFooterOffset())
  }
}

async function handleSelect(id: string) {
  await collapseMetadataBeforeNavigation()
  scrollToSection(id, 'auto')
  nextTick(() => resetMetadataTransition())
}

async function handleBackTop() {
  await collapseMetadataBeforeNavigation()
  scrollToTop('auto')
  nextTick(() => resetMetadataTransition())
}

function retryLoad() {
  refresh()
}

watch(
  [sectionsLoading, () => visibleSections.value.length],
  ([loading]) => {
    if (loading) return
    scheduleFooterOffsetRefresh()
  },
  { flush: 'post' }
)

watch(
  [toolName, scope],
  async () => {
    activeNavItemKey.value = ''
    await collapseMetadataBeforeNavigation()
    scrollToTop('auto')
    nextTick(() => {
      resetMetadataTransition()
      scheduleFooterOffsetRefresh()
    })
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  resetMetadataTransition()
})
</script>

<style lang="scss">
@use '@/styles/pages/method-result.scss';
</style>
