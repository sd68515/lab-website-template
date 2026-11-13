<template>
  <div
    class="dataset-result-header-section"
    :ref="props.headerRefSetter ?? undefined"
    :aria-busy="props.loading ? 'true' : undefined"
  >
    <div v-if="props.loading" class="dataset-result-status-block">
      <StatusMessage
        state="loading"
        :title="text('common.loading')"
        :description="text('datasetResultHeader.pleaseWaitWhileWeRetrieveTheData')"
      />
    </div>

    <div v-else class="dataset-result-info">
      <h1 class="dataset-result-info-title" translate="no">{{ props.title }}</h1>

      <!-- 元数据不可用时显示提示 -->
      <div v-if="props.metadataUnavailable" class="dataset-result-metadata-unavailable">
        <v-icon :size="22" color="textMuted" icon="$mdi-information-outline" />
        <span class="dataset-result-metadata-unavailable__text">{{ text('datasetResultHeader.datasetInfoIsNotAvailable') }}</span>
      </div>

      <template v-else-if="props.entries.length">
        <div class="dataset-result-info-table">
          <div
            v-for="row in displayRows"
            :key="row.key"
            class="dataset-result-info-row"
            :class="{
              'dataset-result-info-row--pair': row.type === 'pair',
              'dataset-result-info-row--image': row.type === 'single' && row.entries[0]?.type === 'image'
            }"
          >
            <template v-if="row.type === 'pair'">
              <div
                v-for="entry in row.entries"
                :key="entry.key"
                class="dataset-result-info-pair"
              >
                <div class="dataset-result-info-key">{{ displayText(entry.label) }}</div>
                <div :class="['dataset-result-info-value', { 'dataset-result-info-value--long': entry.isLong }]">
                  <template v-if="entry.type === 'image' && entry.imageUrl && !imageErrorKeys.has(infoImageKey(entry))">
                    <button
                      type="button"
                      class="dataset-result-info-image-trigger"
                      :disabled="!isPreviewableInfoImage(entry)"
                      :aria-label="text('datasetResultHeader.openPreviewForValue1', { value1: String(entry.imageAlt || entry.label) })"
                      @click="handleInfoImageClick(entry)"
                    >
                      <v-img
                        :key="infoImageKey(entry)"
                        :src="entry.imageUrl"
                        :alt="entry.imageAlt || entry.label"
                        :class="[
                          'dataset-result-info-image',
                          { 'dataset-result-info-image--clickable': isPreviewableInfoImage(entry) },
                          { 'dataset-result-info-image--error': imageErrorKeys.has(infoImageKey(entry)) }
                        ]"
                        :cover="false"
                        aspect-ratio="1"
                        @error="markImageError(infoImageKey(entry))"
                        @load="markImageLoaded(infoImageKey(entry))"
                      >
                        <template #placeholder><ImageLoadingSkeleton /></template>
                      </v-img>
                    </button>
                  </template>
                  <template v-else-if="entry.type === 'image' && imageErrorKeys.has(infoImageKey(entry))">
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
                      <span class="dataset-result-info-link-text">{{ displayInfoValue(entry) }}</span>
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
            </template>

            <template v-else>
              <div class="dataset-result-info-key">{{ displayText(row.entries[0].label) }}</div>
              <div
                :ref="(el: any) => {
                  if (row.entries[0].key === 'Lineage' && props.lineageRowRefSetter) {
                    props.lineageRowRefSetter(el as HTMLDivElement | null)
                  }
                }"
                :class="['dataset-result-info-value', { 'dataset-result-info-value--long': row.entries[0].isLong }]"
              >
                <template v-if="row.entries[0].type === 'image' && row.entries[0].imageUrl && !imageErrorKeys.has(infoImageKey(row.entries[0]))">
                  <button
                    type="button"
                    class="dataset-result-info-image-trigger"
                    :disabled="!isPreviewableInfoImage(row.entries[0])"
                    :aria-label="text('datasetResultHeader.openPreviewForValue1', { value1: String(row.entries[0].imageAlt || row.entries[0].label) })"
                    @click="handleInfoImageClick(row.entries[0])"
                  >
                    <v-img
                      :key="infoImageKey(row.entries[0])"
                      :src="row.entries[0].imageUrl"
                      :alt="row.entries[0].imageAlt || row.entries[0].label"
                      :class="[
                        'dataset-result-info-image',
                        { 'dataset-result-info-image--clickable': isPreviewableInfoImage(row.entries[0]) },
                        { 'dataset-result-info-image--error': imageErrorKeys.has(infoImageKey(row.entries[0])) }
                      ]"
                      :cover="false"
                      aspect-ratio="1"
                      @error="markImageError(infoImageKey(row.entries[0]))"
                      @load="markImageLoaded(infoImageKey(row.entries[0]))"
                    >
                      <template #placeholder><ImageLoadingSkeleton /></template>
                    </v-img>
                  </button>
                </template>
                <template v-else-if="row.entries[0].type === 'image' && imageErrorKeys.has(infoImageKey(row.entries[0]))">
                  <div class="dataset-result-section-message dataset-result-section-message--inline dataset-result-placeholder--alert">
                    {{ text('preview.loadFailed') }}
                  </div>
                </template>
                <template v-else-if="row.entries[0].message">
                  <span :class="messageClass(row.entries[0])">
                    {{ displayText(row.entries[0].message) }}
                  </span>
                </template>
                <template v-else-if="row.entries[0].links && row.entries[0].links.length">
                  <span
                    v-for="(segment, segIndex) in row.entries[0].links"
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
                <template v-else-if="row.entries[0].link">
                  <a
                    :href="row.entries[0].link"
                    :class="[
                      'dataset-result-info-link',
                      { 'dataset-result-info-link--with-icon': Boolean(row.entries[0].icon) }
                    ]"
                    :data-tooltip="row.entries[0].tooltip ? displayText(row.entries[0].tooltip) : undefined"
                    :aria-label="row.entries[0].tooltip ? displayText(row.entries[0].tooltip) : undefined"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span class="dataset-result-info-link-text">{{ displayInfoValue(row.entries[0]) }}</span>
                    <v-icon
                      v-if="row.entries[0].icon"
                      :icon="row.entries[0].icon"
                      size="20"
                      class="dataset-result-info-link-icon"
                    />
                  </a>
                </template>
                <template v-else-if="row.entries[0].icon && row.entries[0].value">
                  <span
                    :class="['dataset-result-info-link', 'dataset-result-info-link--with-icon', 'dataset-result-info-link--disabled']"
                    :data-tooltip="row.entries[0].tooltip ? displayText(row.entries[0].tooltip) : undefined"
                    :aria-label="row.entries[0].tooltip ? displayText(row.entries[0].tooltip) : undefined"
                    tabindex="0"
                    aria-disabled="true"
                  >
                    <span class="dataset-result-info-link-text">{{ displayInfoValue(row.entries[0]) }}</span>
                    <v-icon
                      :icon="row.entries[0].icon"
                      size="20"
                      class="dataset-result-info-link-icon"
                    />
                  </span>
                </template>
                <template v-else>
                  {{ displayInfoValue(row.entries[0]) || 'NA' }}
                </template>
              </div>
            </template>
          </div>
        </div>
      </template>

      <p v-else-if="props.description" class="dataset-result-info-text">
        {{ displayText(props.description) }}
      </p>
    </div>

    <!-- 图片预览 Overlay -->
    <ResultImagePreview
      v-if="infoImagePreview"
      :src="infoImagePreview.src"
      :alt="infoImagePreview.alt"
      :placeholder="null"
      @close="closeInfoImagePreview"
    />

  </div>
</template>

<script setup lang="ts">
import { text, displayText } from '@/utils/locale'
import { displayInfoValue } from '@/utils/result/infoDisplay'
import { computed, ref, watch, type ComponentPublicInstance } from 'vue'
import StatusMessage from '@/components/common/StatusMessage.vue'
import ImageLoadingSkeleton from '@/components/common/ImageLoadingSkeleton.vue'
import ResultImagePreview from '@/components/common/ResultImagePreview.vue'

import type { DatasetDetailEntry } from '@/types/results'
export type { DatasetDetailEntry as DatasetResultHeaderEntry, InfoLinkSegment } from '@/types/results'

type SingleHeaderRow = {
  key: string
  type: 'single'
  entries: [DatasetDetailEntry]
}

type PairHeaderRow = {
  key: string
  type: 'pair'
  entries: [DatasetDetailEntry, DatasetDetailEntry]
}

type HeaderRow = SingleHeaderRow | PairHeaderRow

const imageErrorKeys = ref<Set<string>>(new Set())
const loadedImageKeys = ref<Set<string>>(new Set())

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

// 图片预览状态
const infoImagePreview = ref<{
  src: string
  alt: string
} | null>(null)

function openInfoImagePreview(entry: DatasetDetailEntry) {
  if (!entry.imageUrl || !loadedImageKeys.value.has(infoImageKey(entry)) || imageErrorKeys.value.has(infoImageKey(entry))) return
  infoImagePreview.value = {
    src: entry.imageUrl,
    alt: entry.imageAlt || entry.label
  }
}

function isPreviewableInfoImage(entry: DatasetDetailEntry): boolean {
  return Boolean(entry.imageUrl && loadedImageKeys.value.has(infoImageKey(entry)) && !imageErrorKeys.value.has(infoImageKey(entry)))
}

function handleInfoImageClick(entry: DatasetDetailEntry) {
  if (!isPreviewableInfoImage(entry)) return
  openInfoImagePreview(entry)
}

function closeInfoImagePreview() {
  infoImagePreview.value = null
}

function messageClass(entry: DatasetDetailEntry): Array<string> {
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

const props = defineProps<{
  title: string
  description: string
  loading: boolean
  entries: DatasetDetailEntry[]
  imagePlaceholderText: string
  headerRefSetter?: ((el: Element | ComponentPublicInstance | null) => void) | null
  lineageRowRefSetter?: ((el: HTMLDivElement | null) => void) | null
  metadataUnavailable?: boolean
}>()

function infoImageKey(entry: DatasetDetailEntry): string {
  return JSON.stringify([props.title, entry.key, entry.imageUrl])
}

watch(() => props.entries.filter(entry => entry.type === 'image').map(infoImageKey), keys => {
  const activeKeys = new Set(keys)
  imageErrorKeys.value = new Set([...imageErrorKeys.value].filter(key => activeKeys.has(key)))
  loadedImageKeys.value = new Set([...loadedImageKeys.value].filter(key => activeKeys.has(key)))
})

const displayRows = computed<HeaderRow[]>(() => {
  const entries = props.entries ?? []
  const rows: HeaderRow[] = []

  for (let index = 0; index < entries.length; index += 1) {
    const current = entries[index]
    if (!current) {
      continue
    }
    const next = entries[index + 1]

    if (
      (current.key === 'Species' && next?.key === 'Tissue') ||
      (current.key === 'Accession ID/Link' && next?.key === 'Processed data')
    ) {
      rows.push({
        key: `${current.key}+${next?.key}`,
        type: 'pair',
        entries: [current, next]
      })
      index += 1
      continue
    }

    rows.push({
      key: current.key,
      type: 'single',
      entries: [current]
    })
  }

  return rows
})
</script>
