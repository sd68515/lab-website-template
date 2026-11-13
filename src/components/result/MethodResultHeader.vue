<template>
  <section class="method-result-header" :ref="headerRef" :aria-busy="loading ? 'true' : undefined">
    <div v-if="loading" class="dataset-result-status-block">
      <StatusMessage
        state="loading"
        :title="text('common.loading')"
        :description="text('methodResultHeader.pleaseWaitWhileWeRetrieveTheData')"
      />
    </div>

    <div v-else class="dataset-result-info method-result-tool-info">
      <h1 class="dataset-result-info-title" translate="no">{{ toolDisplayTitle }}</h1>

      <template v-if="toolMetadata">
        <div class="dataset-result-info-table method-result-tool-info-table">
          <div class="dataset-result-info-row">
            <div class="dataset-result-info-key">{{ text('methodResultHeader.paper') }}</div>
            <div class="dataset-result-info-value">
              <a
                v-if="toolMetadata.paperLink"
                :href="toolMetadata.paperLink"
                target="_blank"
                rel="noopener noreferrer"
                class="dataset-result-info-link"
              >
                {{ toolMetadata.paperTitle }}
              </a>
              <span v-else>{{ toolMetadata.paperTitle || 'NA' }}</span>
            </div>
          </div>

          <div class="dataset-result-info-row">
            <div class="dataset-result-info-key">{{ text('methodResultHeader.pMID') }}</div>
            <div class="dataset-result-info-value">
              <a
                v-if="toolMetadata.pmidLink"
                :href="toolMetadata.pmidLink"
                target="_blank"
                rel="noopener noreferrer"
                class="dataset-result-info-link"
              >
                {{ toolMetadata.pmid || 'NA' }}
              </a>
              <span v-else>{{ toolMetadata.pmid || 'NA' }}</span>
            </div>
          </div>

          <div class="dataset-result-info-row method-result-info-row--pair">
            <div class="method-result-info-pair">
              <div class="dataset-result-info-key">{{ text('methodResultHeader.journal') }}</div>
              <div class="dataset-result-info-value">{{ toolMetadata.journal || 'NA' }}</div>
            </div>
            <div class="method-result-info-pair">
              <div class="dataset-result-info-key">{{ text('methodResultHeader.year') }}</div>
              <div class="dataset-result-info-value">{{ toolMetadata.year || 'NA' }}</div>
            </div>
          </div>

          <div class="dataset-result-info-row method-result-info-row--pair">
            <div class="method-result-info-pair">
              <div class="dataset-result-info-key">{{ text('methodResultHeader.platform') }}</div>
              <div class="dataset-result-info-value">{{ toolMetadata.platform || 'NA' }}</div>
            </div>
            <div class="method-result-info-pair">
              <div class="dataset-result-info-key">{{ text('methodResultHeader.deepLearning') }}</div>
              <div class="dataset-result-info-value">{{ displayText(toolMetadata.deepLearning || 'NA') }}</div>
            </div>
          </div>
        </div>
      </template>

      <div v-else class="method-result-metadata-unavailable">
        <v-icon :size="22" color="textMuted" icon="$mdi-information-outline" />
        <span class="method-result-metadata-unavailable__text">{{ text('methodResultHeader.toolMetadataIsNotAvailable') }}</span>
      </div>

      <p v-if="toolNote" class="dataset-result-context-note method-result-context-note">
        {{ displayText(toolNote) }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { text, displayText } from '@/utils/locale'
import type { Ref } from 'vue'
import StatusMessage from '@/components/common/StatusMessage.vue'
import type { ToolMetadata } from '@/types'

defineProps<{
  toolDisplayTitle: string
  loading: boolean
  toolMetadata: ToolMetadata | null
  toolNote?: string | null
  headerRef?: Ref<HTMLElement | null>
}>()
</script>
