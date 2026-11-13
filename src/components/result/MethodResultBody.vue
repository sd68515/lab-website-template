<template>
  <section class="method-result-body">
    <div v-if="sectionsLoading" class="method-result-status-block">
      <StatusMessage
        state="loading"
        :title="text('methodResultBody.loadingResults')"
        :description="text('methodResultBody.pleaseWaitWhileWeRetrieveTheAnalysis')"
      />
    </div>

    <div v-else-if="loadError" class="method-result-status-block">
      <StatusMessage
        state="error"
        :title="text('methodResultBody.unableToLoadResults')"
        :description="loadErrorMessage || text('methodResultBody.pleaseTryAgainOrContactSupportIf')"
      >
        <button type="button" class="method-result-retry-btn" @click="retryLoad"> {{ text('methodResultBody.retryLoading') }} </button>
      </StatusMessage>
    </div>

      <template v-else>
        <template v-for="item in renderedSections" :key="item.section.key">
          <article
            :id="item.section.anchorId"
            class="dataset-result-tool-section method-result-dataset-section"
            :class="{
              'method-result-dataset-section--simulation': item.section.type !== 'real'
            }"
          >
            <div class="method-result-dataset-card-header">
              <h2 class="method-result-dataset-title" translate="no">{{ item.section.title }}</h2>
              <p
                v-if="item.section.type === 'real' && item.section.navigationLabel && item.section.navigationLabel !== item.section.title"
                class="method-result-dataset-subtitle"
              >
                {{ item.section.navigationLabel }}
              </p>
            </div>

            <div class="dataset-result-tool-content">
              <ViewportLazyMount :min-height="resolveSectionPlaceholderHeight(item)">
                <div v-if="item.noResultPlaceholder" class="method-result-noresult-wrapper">
                  <ResultImagePlaceholder :placeholder="item.noResultPlaceholder" />
                </div>

                <template v-if="!item.section.noResultReason && (item.summaryRows.length || item.detailRows.length)">
                  <div class="method-result-metadata-summary">
                    <div class="dataset-result-info-table">
                      <div
                        v-for="(row, rowIndex) in item.summaryRows"
                        :key="`summary-${item.section.key}-${rowIndex}`"
                        class="dataset-result-info-row method-result-info-row"
                        :class="{
                          'method-result-info-row--pair': row.entries.length === 2,
                          'method-result-info-row--triple': row.entries.length === 3
                        }"
                      >
                        <div
                          v-for="entry in row.entries"
                          :key="entry.type === 'image' ? infoImageKey(item.section.key, entry) : entry.key"
                          class="method-result-info-pair"
                        >
                          <div class="dataset-result-info-key">{{ displayText(entry.label) }}</div>
                          <div class="dataset-result-info-value">
                            <template v-if="entry.type === 'image' && entry.imageUrl && !imageErrorKeys.has(infoImageKey(item.section.key, entry))">
                              <button
                                type="button"
                                class="dataset-result-info-image-trigger"
                                :disabled="!isPreviewableInfoImage(item.section.key, entry)"
                                :aria-label="text('methodResultBody.openPreviewForValue1', { value1: String(entry.imageAlt || entry.label) })"
                                @click="handleInfoImageClick(item.section.key, entry)"
                              >
                                <v-img
                                  :key="infoImageKey(item.section.key, entry)"
                                  :src="entry.imageUrl"
                                  :alt="entry.imageAlt || entry.label"
                                  :class="[
                                    'dataset-result-info-image',
                                    { 'dataset-result-info-image--clickable': isPreviewableInfoImage(item.section.key, entry) },
                                    { 'dataset-result-info-image--error': imageErrorKeys.has(infoImageKey(item.section.key, entry)) }
                                  ]"
                                  :cover="false"
                                  aspect-ratio="1"
                                  @error="markImageError(infoImageKey(item.section.key, entry))"
                                  @load="markImageLoaded(infoImageKey(item.section.key, entry))"
                                >
                                  <template #placeholder><ImageLoadingSkeleton /></template>
                                </v-img>
                              </button>
                            </template>
                            <template v-else-if="entry.type === 'image' && imageErrorKeys.has(infoImageKey(item.section.key, entry))">
                              <div class="dataset-result-section-message dataset-result-section-message--inline dataset-result-placeholder--alert">
                                {{ text('preview.loadFailed') }}
                              </div>
                            </template>
                            <template v-else-if="entry.message">
                              <span :class="messageClass(entry)">
                                {{ displayText(entry.message) }}
                              </span>
                            </template>
                            <template v-else-if="entry.links && entry.links.length">
                              <span
                                v-for="(segment, segIndex) in entry.links"
                                :key="segIndex"
                              >
                                <template v-if="segment.link">
                                  <a
                                    :href="segment.link"
                                    class="dataset-result-info-link"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    {{ segment.text }}
                                  </a>
                                </template>
                                <template v-else>
                                  {{ segment.text }}
                                </template>
                              </span>
                            </template>
                            <template v-else-if="entry.link">
                              <a
                                :href="entry.link"
                                :class="[
                                  'dataset-result-info-link',
                                  { 'dataset-result-info-link--with-icon': Boolean(entry.icon) }
                                ]"
                                :data-tooltip="entry.tooltip ? displayText(entry.tooltip) : undefined"
                                :aria-label="entry.tooltip ? displayText(entry.tooltip) : undefined"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <span :class="{ 'dataset-result-info-link-text': Boolean(entry.icon) }">{{ displayInfoValue(entry) }}</span>
                                <v-icon
                                  v-if="entry.icon"
                                  :icon="entry.icon"
                                  size="20"
                                  class="dataset-result-info-link-icon"
                                />
                              </a>
                            </template>
                            <template v-else-if="entry.icon && entry.value">
                              <span
                                :class="['dataset-result-info-link', 'dataset-result-info-link--with-icon', 'dataset-result-info-link--disabled']"
                                :data-tooltip="entry.tooltip ? displayText(entry.tooltip) : undefined"
                                :aria-label="entry.tooltip ? displayText(entry.tooltip) : undefined"
                                tabindex="0"
                                aria-disabled="true"
                              >
                                <span class="dataset-result-info-link-text">{{ displayInfoValue(entry) }}</span>
                                <v-icon
                                  :icon="entry.icon"
                                  size="20"
                                  class="dataset-result-info-link-icon"
                                />
                              </span>
                            </template>
                            <template v-else>
                              {{ displayInfoValue(entry) || 'NA' }}
                            </template>
                          </div>
                        </div>
                      </div>
                    </div>

                    <v-expand-transition :disabled="metadataTransitionDisabled">
                      <div
                        v-if="item.detailRows.length && isMetadataExpanded(item.section.key)"
                        class="method-result-metadata-details"
                      >
                        <div class="method-result-metadata-details-table">
                          <div
                            v-for="(row, rowIndex) in item.detailRows"
                            :key="`detail-${item.section.key}-${rowIndex}`"
                            class="dataset-result-info-row method-result-info-row"
                            :class="{
                              'method-result-info-row--pair': row.entries.length === 2,
                              'method-result-info-row--triple': row.entries.length === 3
                            }"
                          >
                            <div
                              v-for="entry in row.entries"
                              :key="entry.type === 'image' ? infoImageKey(item.section.key, entry) : entry.key"
                              class="method-result-info-pair"
                            >
                              <div class="dataset-result-info-key">{{ displayText(entry.label) }}</div>
                              <div class="dataset-result-info-value">
                                <template v-if="entry.type === 'image' && entry.imageUrl && !imageErrorKeys.has(infoImageKey(item.section.key, entry))">
                                  <button
                                    type="button"
                                    class="dataset-result-info-image-trigger"
                                    :disabled="!isPreviewableInfoImage(item.section.key, entry)"
                                    :aria-label="text('methodResultBody.openPreviewForValue1', { value1: String(entry.imageAlt || entry.label) })"
                                    @click="handleInfoImageClick(item.section.key, entry)"
                                  >
                                    <v-img
                                      :key="infoImageKey(item.section.key, entry)"
                                      :src="entry.imageUrl"
                                      :alt="entry.imageAlt || entry.label"
                                      :class="[
                                        'dataset-result-info-image',
                                        { 'dataset-result-info-image--clickable': isPreviewableInfoImage(item.section.key, entry) },
                                        { 'dataset-result-info-image--error': imageErrorKeys.has(infoImageKey(item.section.key, entry)) }
                                      ]"
                                      :cover="false"
                                      aspect-ratio="1"
                                      @error="markImageError(infoImageKey(item.section.key, entry))"
                                      @load="markImageLoaded(infoImageKey(item.section.key, entry))"
                                    >
                                      <template #placeholder><ImageLoadingSkeleton /></template>
                                    </v-img>
                                  </button>
                                </template>
                                <template v-else-if="entry.type === 'image' && imageErrorKeys.has(infoImageKey(item.section.key, entry))">
                                  <div class="dataset-result-section-message dataset-result-section-message--inline dataset-result-placeholder--alert">
                                    {{ text('preview.loadFailed') }}
                                  </div>
                                </template>
                                <template v-else-if="entry.message">
                                  <span :class="messageClass(entry)">
                                    {{ displayText(entry.message) }}
                                  </span>
                                </template>
                                <template v-else-if="entry.links && entry.links.length">
                                  <span
                                    v-for="(segment, segIndex) in entry.links"
                                    :key="segIndex"
                                  >
                                    <template v-if="segment.link">
                                      <a
                                        :href="segment.link"
                                        class="dataset-result-info-link"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        {{ segment.text }}
                                      </a>
                                    </template>
                                    <template v-else>
                                      {{ segment.text }}
                                    </template>
                                  </span>
                                </template>
                                <template v-else-if="entry.link">
                                  <a
                                    :href="entry.link"
                                    :class="[
                                      'dataset-result-info-link',
                                      { 'dataset-result-info-link--with-icon': Boolean(entry.icon) }
                                    ]"
                                    :data-tooltip="entry.tooltip ? displayText(entry.tooltip) : undefined"
                                    :aria-label="entry.tooltip ? displayText(entry.tooltip) : undefined"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <span :class="{ 'dataset-result-info-link-text': Boolean(entry.icon) }">{{ displayInfoValue(entry) }}</span>
                                    <v-icon
                                      v-if="entry.icon"
                                      :icon="entry.icon"
                                      size="20"
                                      class="dataset-result-info-link-icon"
                                    />
                                  </a>
                                </template>
                                <template v-else-if="entry.icon && entry.value">
                                  <span
                                    :class="['dataset-result-info-link', 'dataset-result-info-link--with-icon', 'dataset-result-info-link--disabled']"
                                    :data-tooltip="entry.tooltip ? displayText(entry.tooltip) : undefined"
                                    :aria-label="entry.tooltip ? displayText(entry.tooltip) : undefined"
                                    tabindex="0"
                                    aria-disabled="true"
                                  >
                                    <span class="dataset-result-info-link-text">{{ displayInfoValue(entry) }}</span>
                                    <v-icon
                                      :icon="entry.icon"
                                      size="20"
                                      class="dataset-result-info-link-icon"
                                    />
                                  </span>
                                </template>
                                <template v-else>
                                  {{ displayInfoValue(entry) || 'NA' }}
                                </template>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </v-expand-transition>

                    <div
                      v-if="item.detailRows.length"
                      class="method-result-metadata-toggle-container"
                    >
                      <v-btn
                        variant="text"
                        color="primary"
                        size="small"
                        class="method-result-metadata-toggle"
                        @click="toggleMetadata(item.section.key)"
                      >
                        {{ displayText(isMetadataExpanded(item.section.key) ? 'Show less' : 'Show more') }}
                        <v-icon
                          end
                          size="18"
                          :icon="isMetadataExpanded(item.section.key) ? '$mdi-chevron-up' : '$mdi-chevron-down'"
                        />
                      </v-btn>
                    </div>
                  </div>
                </template>

                <template v-if="!item.section.noResultReason">
                  <VelocityResultsSection
                    v-if="shouldRenderVelocitySection(item.section)"
                    :results="item.section.velocityResults"
                    :title="text('resultScopeTabs.results')"
                    :placeholder="item.section.velocityPlaceholder"
                    :get-result-alt="velocityAltText"
                    :get-result-key="velocityResultKey"
                    @image-load="handleVelocityImageLoad"
                    @image-error="handleVelocityImageError"
                  />

                  <template v-for="group in groupMetricsForDisplay(item.section.metrics as DisplayMetric[])" :key="group.title">
                    <MetricsResultsSection
                      v-if="group.metrics.length"
                      :title="group.title"
                      :metrics="group.metrics"
                      :enable-title-links="group.title !== 'Spatial metrics'"
                      :current-tool="toolName"
                      :current-dataset-id="resolveCurrentDatasetId(item.section)"
                      :get-metric-key="metricCategoryKey"
                      :get-image-key="metricImageKey"
                      :get-image-alt="metricImageAlt"
                      @image-load="handleMetricImageLoad"
                      @image-error="handleMetricImageError"
                    />
                  </template>
                </template>
              </ViewportLazyMount>
            </div>
          </article>

          <div
            v-if="item.showDividerAfter"
            class="method-result-divider"
          />
        </template>

        <div
          v-if="!datasetSections.length && !sectionsLoading"
          class="method-result-status-block"
        >
          <StatusMessage
            state="empty"
            :title="text('methodResultBody.noResultsAvailable')"
            :description="text('results.emptyScope')"
          />
        </div>
      </template>

    <!-- Groundtruth stream 图片预览 Overlay -->
    <ResultImagePreview
      v-if="infoImagePreview"
      :src="infoImagePreview.src"
      :alt="infoImagePreview.alt"
      :placeholder="infoImagePreview.placeholder"
      @close="closeInfoImagePreview"
    />

  </section>
</template>

<script setup lang="ts">
import { text, displayText } from '@/utils/locale'
import { displayInfoValue } from '@/utils/result/infoDisplay'
import { computed, ref, watch } from 'vue'
import VelocityResultsSection from '@/components/common/VelocityResultsSection.vue'
import MetricsResultsSection from '@/components/common/MetricsResultsSection.vue'
import StatusMessage from '@/components/common/StatusMessage.vue'
import ResultImagePlaceholder from '@/components/common/ResultImagePlaceholder.vue'
import ImageLoadingSkeleton from '@/components/common/ImageLoadingSkeleton.vue'
import ResultImagePreview from '@/components/common/ResultImagePreview.vue'
import ViewportLazyMount from '@/components/common/ViewportLazyMount.vue'
import { groupMetricsForDisplay } from '@/utils/metrics-group'
import { getDefaultPlaceholderMessage } from '@/utils/result'
import { excludesMetricResults } from '@/constants/result-display'
import { useResultImages } from '@/composables/result'
import type { DatasetDetailEntry, DatasetSection, MetricCategorySection, MetricImageEntry, VelocityResultEntry } from '@/types/results'
import type { PlaceholderDisplay } from '@/types'
import type { ResultScope } from '@/constants/result-scope'

type DisplayMetric = MetricCategorySection & Record<string, unknown>

type MetadataRow = {
  entries: DatasetDetailEntry[]
}

const props = defineProps<{
  sectionsLoading: boolean
  loadError: boolean
  loadErrorMessage: string
  retryLoad: () => void
  datasetSections: DatasetSection[]
  scope: ResultScope
  toolName: string
  imagePlaceholderText: string
  isMetadataExpanded: (key: string) => boolean
  toggleMetadata: (key: string) => void
  metadataTransitionDisabled: boolean
}>()

const { handleVelocityImageLoad, handleVelocityImageError, handleMetricImageLoad, handleMetricImageError } = useResultImages()
const imageErrorKeys = ref<Set<string>>(new Set())
const loadedImageKeys = ref<Set<string>>(new Set())

// Groundtruth stream 图片预览状态
const infoImagePreview = ref<{
  src: string
  alt: string
  placeholder: PlaceholderDisplay | null
} | null>(null)

function infoImageKey(sectionKey: string, entry: DatasetDetailEntry): string {
  return JSON.stringify([props.toolName, props.scope, sectionKey, entry.key, entry.imageUrl])
}

function isPreviewableInfoImage(sectionKey: string, entry: DatasetDetailEntry): boolean {
  const key = infoImageKey(sectionKey, entry)
  return Boolean(entry.imageUrl && loadedImageKeys.value.has(key) && !imageErrorKeys.value.has(key))
}

function handleInfoImageClick(sectionKey: string, entry: DatasetDetailEntry) {
  if (!entry.imageUrl || !isPreviewableInfoImage(sectionKey, entry)) return
  infoImagePreview.value = {
    src: entry.imageUrl,
    alt: entry.imageAlt || entry.label,
    placeholder: null
  }
}

// Drop removed/replaced images so returning to a source starts with fresh state.
watch(
  () => props.datasetSections.flatMap(section =>
    section.metadataEntries.filter(entry => entry.type === 'image' && entry.imageUrl)
      .map(entry => infoImageKey(section.key, entry))
  ),
  keys => {
    const activeKeys = new Set(keys)
    imageErrorKeys.value = new Set([...imageErrorKeys.value].filter(key => activeKeys.has(key)))
    loadedImageKeys.value = new Set([...loadedImageKeys.value].filter(key => activeKeys.has(key)))
  }
)

function markImageError(key: string) {
  const errorKeys = new Set(imageErrorKeys.value)
  errorKeys.add(key)
  imageErrorKeys.value = errorKeys

  if (!loadedImageKeys.value.has(key)) return
  const loadedKeys = new Set(loadedImageKeys.value)
  loadedKeys.delete(key)
  loadedImageKeys.value = loadedKeys
}

function markImageLoaded(key: string) {
  if (imageErrorKeys.value.has(key)) {
    const errorKeys = new Set(imageErrorKeys.value)
    errorKeys.delete(key)
    imageErrorKeys.value = errorKeys
  }

  const loadedKeys = new Set(loadedImageKeys.value)
  loadedKeys.add(key)
  loadedImageKeys.value = loadedKeys
}

function closeInfoImagePreview() {
  infoImagePreview.value = null
}

function messageClass(entry: DatasetDetailEntry): Array<string | Record<string, boolean>> {
  if (entry.messageDisplay === 'placeholder') {
    return [
      'dataset-result-section-message',
      'dataset-result-section-message--inline',
      entry.messageType === 'alert' ? 'dataset-result-placeholder--alert' : 'dataset-result-placeholder--muted'
    ]
  }

  return [
    'dataset-result-info-message',
    entry.messageType ? `dataset-result-info-message--${entry.messageType}` : ''
  ]
}

function shouldRenderVelocitySection(section: DatasetSection): boolean {
  return section.velocityResults.length > 0 || !!section.velocityPlaceholder
}

function resolveCurrentDatasetId(section: DatasetSection): string {
  if (section.type !== 'simulation') return ''
  const key = section.key || ''
  if (key.startsWith('simulation-')) {
    return key.slice('simulation-'.length)
  }
  return section.simulation?.additionalId ?? ''
}

function velocityResultKey(result: VelocityResultEntry, index: number): string | number {
  return `${result.type}-${result.imageUrl || index}`
}

function velocityAltText(result: VelocityResultEntry): string {
  return `${result.label} result`
}

function metricCategoryKey(metric: MetricCategorySection, index: number): string | number {
  return `${metric.category}-${index}`
}

function metricImageKey(image: MetricImageEntry, index: number, metric: MetricCategorySection): string {
  return `${metric.category}-${index}-${image.imageUrl}`
}

function metricImageAlt(image: MetricImageEntry): string {
  return image.name
}

function resolveMetricPlaceholderHeight(metrics: DisplayMetric[]): number {
  if (metrics.length <= 0) return 0

  return metrics.reduce((total, metric) => {
    if (metric.placeholder) return total + 180
    if (metric.category === 'Usability') return total + 56

    const images = Array.isArray(metric.images) ? metric.images : []
    const imageCount = images.filter((image) => !image.placeholder).length
    const fallbackImageCount = images.length ? Math.max(imageCount, 1) : 0
    const imageHeight = metric.category === 'Consistency score' ? 480 : 450
    return total + 86 + (fallbackImageCount * imageHeight)
  }, 180)
}

function resolveSectionPlaceholderHeight(item: {
  section: DatasetSection
  summaryRows: MetadataRow[]
  detailRows: MetadataRow[]
  noResultPlaceholder: PlaceholderDisplay | null
}): number {
  if (item.noResultPlaceholder) return 220

  if (excludesMetricResults(props.toolName)) {
    return item.section.velocityResults.length === 1 ? 780 : 700
  }

  const velocityResultCount = item.section.velocityResults?.filter((result) => !result.placeholder).length ?? 0
  const velocityHeight = shouldRenderVelocitySection(item.section)
    ? Math.max(500, 140 + Math.ceil(Math.max(velocityResultCount, 1) / 2) * 450)
    : 0
  const metricsHeight = groupMetricsForDisplay(item.section.metrics as DisplayMetric[]).reduce((total, group) => {
    if (group.metrics.length === 0) return total
    return total + resolveMetricPlaceholderHeight(group.metrics as DisplayMetric[])
  }, 0)
  const metadataHeight = (item.summaryRows.length * 96) + (item.detailRows.length ? 72 : 0) + 56
  return Math.max(420, Math.min(6200, velocityHeight + metricsHeight + metadataHeight))
}

function buildNoResultPlaceholder(reason: string): PlaceholderDisplay {
  const trimmed = (reason || '').trim()
  if (trimmed === 'Out of metric') {
    return { mode: 'metric', message: getDefaultPlaceholderMessage('metric') }
  }
  if (trimmed === 'Unable to compute') {
    return { mode: 'compute', message: getDefaultPlaceholderMessage('compute') }
  }
  return {
    mode: 'compute',
    message: getDefaultPlaceholderMessage('compute'),
    reason: trimmed
  }
}

function createFallbackEntry(key: string, label: string, value: string): DatasetDetailEntry {
  return {
    key,
    label,
    value,
    isLong: false,
    type: 'text',
    link: null,
    links: null
  }
}

function getEntryByKey(entries: DatasetDetailEntry[], key: string): DatasetDetailEntry {
  return entries.find((entry) => entry.key === key) ?? createFallbackEntry(key, key, 'NA')
}

function buildMetadataRows(section: DatasetSection): { summaryRows: MetadataRow[]; detailRows: MetadataRow[] } {
  const entries = section.metadataEntries ?? []

  if (section.type === 'real') {
    const species = getEntryByKey(entries, 'Species')
    const tissue = getEntryByKey(entries, 'Tissue')
    const label = getEntryByKey(entries, 'Label')

    const summarySecond =
      !tissue.value || tissue.value === 'NA'
        ? label.value && label.value !== 'NA'
          ? label
          : createFallbackEntry('Dataset', 'Dataset', section.navigationLabel)
        : tissue

    const summaryRows: MetadataRow[] = [{ entries: [species, summarySecond] }]

    const detailRows: MetadataRow[] = [
      { entries: [getEntryByKey(entries, 'Sequencing type')] },
      { entries: [label] },
      { entries: [getEntryByKey(entries, 'Accession ID/Link'), getEntryByKey(entries, 'Processed data')] },
      { entries: [getEntryByKey(entries, 'PMID/DOI')] },
      { entries: [getEntryByKey(entries, 'Lineage')] },
      { entries: [getEntryByKey(entries, 'Label type')] }
    ]

    return { summaryRows, detailRows }
  }

  // 模拟数据：标题已包含拓扑和规模，直接展示可用元数据与 Processed data。
  // 本身没有 Groundtruth stream 的数据不会生成该条目。
  const summaryRows: MetadataRow[] = entries.map((entry) => ({ entries: [entry] }))
  const detailRows: MetadataRow[] = []

  return { summaryRows, detailRows }
}

const renderedSections = computed(() =>
  props.datasetSections.map((section, index) => {
    const rows = buildMetadataRows(section)
    const nextSection = props.datasetSections[index + 1]
    return {
      section,
      showDividerAfter: Boolean(nextSection && nextSection.type !== section.type),
      summaryRows: rows.summaryRows,
      detailRows: rows.detailRows,
      noResultPlaceholder: section.noResultReason
        ? { ...buildNoResultPlaceholder(section.noResultReason), ...(section.noResultDetail ? { reason: section.noResultDetail } : {}) }
        : null
    }
  })
)

</script>
