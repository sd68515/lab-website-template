<template>
  <section class="scalene-entry-section" aria-labelledby="scalene-entry-section-title">
    <div class="scalene-entry-section__intro">
        <div class="scalene-entry-section__heading">
          <h2 id="scalene-entry-section-title" class="scalene-entry-section__title"> {{ text('scaleneEntryCard.scaleneReportsAndFallbackMonitoringSummaries') }} </h2>
        <p v-if="selectionSummary" class="scalene-entry-section__selection"><LocalizedText message="scaleneEntryCard.scaleneEntrySectionSelection" :values="{ value1: String(selectionSummary) }" /></p>
      </div>
      <p class="scalene-entry-section__description">
        {{ displayText(sectionDescription) }}
      </p>
    </div>

    <div
      v-if="!isSelectionReady"
      class="scalene-entry-section__state scalene-entry-section__state--selection-hint"
    >
      <v-icon
        class="scalene-entry-section__state-icon"
        icon="$mdi-filter-variant"
        size="22"
      />
      <span>{{ text('scaleneEntryCard.selectDataScaleAndTopologyAboveTo') }}</span>
    </div>
    <div
      v-else-if="entries.length === 0"
      class="scalene-entry-section__state scalene-entry-section__state--empty"
    >
      <v-icon
        class="scalene-entry-section__state-icon"
        icon="$mdi-folder-open-outline"
        size="22"
      /> {{ text('scaleneEntryCard.noScaleneReportsOrFallbackMonitoringSummaries') }} </div>

    <div v-else class="scalene-entry-section__list">
      <article
        v-for="entry in entries"
        :key="`${entry.tool}-${entry.reportDataType}`"
        class="scalene-entry-section__card"
      >
        <div class="scalene-entry-section__content">
          <div class="scalene-entry-section__card-header">
            <h3 class="scalene-entry-section__card-title">{{ entry.toolLabel }}</h3>
            <v-btn
              :href="getAnalysisPageHref(entry)"
              target="_blank"
              rel="noopener noreferrer"
              color="primary"
              variant="flat"
              class="scalene-entry-section__button"
            > {{ text('scaleneEntryCard.openAnalysis') }} </v-btn>
          </div>
          <p
            :class="[
              'scalene-entry-section__type-label',
              `scalene-entry-section__type-label--${entry.reportKind}`
            ]"
          >
            {{ displayText(getEntryKindLabel(entry)) }}
          </p>
          <div class="scalene-entry-section__chips" :aria-label="text('scaleneEntryCard.includedDatasets')">
            <span
              v-for="datasetId in entry.matchedDatasetIds"
              :key="`${entry.tool}-${datasetId}`"
              class="scalene-entry-section__chip"
            >
              {{ formatDatasetChip(datasetId) }}
            </span>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { displayText, formatNumber, text } from '@/utils/locale'
import LocalizedText from '@/components/common/LocalizedText.vue'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  type EfficiencyScale,
  type EfficiencyToolName,
  type EfficiencyTopology
} from '@/constants/efficiency-tools'
import {
  getScaleneEfficiencyEntries,
  type ResolvedScaleneEfficiencyEntry
} from '@/constants/scalene'
import { getTopologyLabel } from '@/constants/catalogueLabels'
import { ROUTE_NAMES } from '@/constants/routes'

const props = withDefaults(defineProps<{
  scale: EfficiencyScale | null
  topology: EfficiencyTopology | null
  selectedTools?: EfficiencyToolName[]
}>(), {
  selectedTools: () => [],
})

const router = useRouter()




const isSelectionReady = computed(() => {
  if (!props.scale) return false
  if (props.scale === 'extra-large') return true
  return Boolean(props.topology)
})

const selectionSummary = computed(() => {
  if (!props.scale) return ''
  const scaleLabel = props.scale === 'extra-large' ? text('efficiency.scale.extraLarge') : text(props.scale === 'cell1000' ? 'efficiency.scale.cells' : 'efficiency.scale.genes', { count: formatNumber(1000, { useGrouping: true }) })
  if (props.scale === 'extra-large') return scaleLabel
  const topologyLabel = props.topology ? (props.topology === 'disconnected' ? text('efficiency.topology.disconnected') : getTopologyLabel(props.topology)) : ''
  return topologyLabel ? `${scaleLabel} · ${topologyLabel}` : scaleLabel
})

const entries = computed(() => {
  return getScaleneEfficiencyEntries({
    scale: props.scale,
    topology: props.topology,
    selectedTools: props.selectedTools
  })
})

const sectionDescription = computed(() => {
  if (props.scale === 'extra-large') {
    return 'This section lists available resource-analysis pages for the current extra-large benchmarks. Each dataset is shown either as a standard Scalene report or, when Scalene output could not be produced, as a fallback summary from automated resource monitoring.'
  }

  return 'This section lists available resource-analysis pages for the current data scale and topology. Each dataset is shown either as a standard Scalene report or, when Scalene output could not be produced, as a fallback summary from automated resource monitoring.'
})

function getAnalysisPageHref(entry: ResolvedScaleneEfficiencyEntry): string {
  return router.resolve({
    name: ROUTE_NAMES.SCALENE_ANALYSIS,
    params: {
      tool: entry.reportTool,
      dataType: entry.reportDataType
    }
  }).href
}

function getEntryKindLabel(entry: ResolvedScaleneEfficiencyEntry): string {
  if (entry.reportKind === 'manual-log') {
    return 'Fallback monitoring summary'
  }

  return 'Standard Scalene report'
}

function formatDatasetChip(datasetId: string): string {
  const match = datasetId.match(/^.+_cell(\d+)_gene(\d+)$/)
  if (!match) return datasetId

  const cells = Number.parseInt(match[1] ?? '', 10)
  const genes = Number.parseInt(match[2] ?? '', 10)
  const cellLabel = Number.isFinite(cells) ? formatNumber(cells, { useGrouping: true }) : match[1]
  const geneLabel = Number.isFinite(genes) ? formatNumber(genes, { useGrouping: true }) : match[2]

  if (props.scale === 'cell1000') return text('efficiency.scale.genes', { count: String(geneLabel) })
  if (props.scale === 'gene1000') return text('efficiency.scale.cells', { count: String(cellLabel) })
  return text('scalene.cellsGenes', { cells: String(cellLabel), genes: String(geneLabel) })
}

</script>

<style scoped lang="scss">
@use '@/styles/mixins.scss' as mixins;
@use '@/styles/variables.scss' as vars;

.scalene-entry-section {
  --scalene-surface: var(--color-surface);
  --scalene-surface-hint: var(--color-surface-muted-strong);
  --scalene-surface-empty: var(--color-surface-muted);
  --scalene-surface-chip: var(--color-surface-muted-strong);
  --scalene-border-soft: var(--color-border);
  --scalene-border-soft-strong: var(--color-primary);
  --scalene-accent: #{vars.$accent-color};
  --scalene-accent-hover: var(--color-accent-hover);
  --scalene-accent-active: #{vars.$accent-color-dark};
  --scalene-copy-secondary: var(--text-muted-color);
  --scalene-copy-muted: var(--text-muted-color);
  --scalene-copy-subtle: var(--text-muted-color);
  --scalene-button-text: var(--color-on-accent);
  --scalene-warning: var(--warning-text-color);
  --scalene-warning-border: var(--warning-border-color);
  width: 100%;
  margin-top: 24px;
  padding: 28px 32px;
  border: 1px solid var(--scalene-border-soft);
  border-radius: vars.$control-border-radius;
  background: var(--scalene-surface);
}

.scalene-entry-section__intro {
  min-width: 0;
}

.scalene-entry-section__heading {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 10px;
}

.scalene-entry-section__title {
  margin: 0;
  color: var(--scalene-accent);
  font-size: 1.85rem;
  line-height: 1.25;
  font-weight: 700;
}

.scalene-entry-section__description,
.scalene-entry-section__selection {
  margin: 12px 0 0;
  color: var(--scalene-copy-secondary);
  font-size: 1.1rem;
  line-height: 1.75;
}

.scalene-entry-section__selection {
  margin: 0;
  font-weight: 600;
  color: var(--scalene-accent);
}

.scalene-entry-section__state {
  margin-top: 18px;
  padding: 18px 20px;
  border: 1px solid var(--scalene-border-soft);
  border-radius: vars.$control-border-radius;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--scalene-copy-secondary);
  font-size: 1.04rem;
  line-height: 1.7;
  text-align: center;
  background: var(--scalene-surface);
}

.scalene-entry-section__state--selection-hint {
  border-style: dashed;
  border-color: var(--scalene-border-soft-strong);
  background: var(--scalene-surface-hint);
}

.scalene-entry-section__state--empty {
  background: var(--scalene-surface-empty);
}

.scalene-entry-section__state-icon {
  flex: 0 0 auto;
  color: var(--scalene-accent);
}

.scalene-entry-section__list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px;
  margin-top: 22px;
}

.scalene-entry-section__card {
  display: flex;
  min-width: 0;
  height: 100%;
  padding: 24px 26px;
  border: 1px solid var(--scalene-border-soft);
  border-radius: vars.$control-border-radius;
  background: var(--scalene-surface);
}

.scalene-entry-section__content {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  width: 100%;
}

.scalene-entry-section__card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.scalene-entry-section__card-title {
  margin: 0;
  min-width: 0;
  flex: 1 1 auto;
  color: var(--scalene-accent);
  font-size: 1.5rem;
  line-height: 1.3;
  font-weight: 700;
}

.scalene-entry-section__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.scalene-entry-section__chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: var(--app-border-radius);
  background: var(--scalene-surface-chip);
  color: var(--scalene-accent);
  font-size: 1.04rem;
  font-weight: 600;
}

.scalene-entry-section__chip::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: rgba(var(--v-theme-accent), 0.78);
  flex: 0 0 auto;
}

.scalene-entry-section .scalene-entry-section__button.v-btn {
  flex: 0 0 auto;
  min-width: 0;
  min-inline-size: 148px;
  height: 42px;
  min-height: 42px;
  padding: 0 16px;
  background: transparent;
  border: 1px solid var(--scalene-border-soft-strong);
  color: var(--scalene-accent);
  box-shadow: none;
  border-radius: var(--app-border-radius);
  letter-spacing: 0;
  font-size: 0.96rem;
  font-weight: 600;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.scalene-entry-section__button :deep(.v-btn__overlay),
.scalene-entry-section__button :deep(.v-btn__underlay) {
  display: none;
}

.scalene-entry-section .scalene-entry-section__button.v-btn:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(var(--v-theme-accent), 0.12);
  background: rgba(var(--v-theme-accent), 0.04);
  border-color: rgba(var(--v-theme-accent), 0.3);
}

.scalene-entry-section .scalene-entry-section__button.v-btn:not(:disabled):active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(var(--v-theme-accent), 0.1);
  background: rgba(var(--v-theme-accent), 0.08);
  border-color: rgba(var(--v-theme-accent), 0.32);
}

.scalene-entry-section .scalene-entry-section__button.v-btn:focus-visible {
  outline: 3px solid rgba(var(--v-theme-accent), 0.55);
  outline-offset: 3px;
}

.scalene-entry-section__type-label {
  margin: 0;
  color: var(--scalene-copy-subtle);
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.4;
}

.scalene-entry-section__type-label--manual-log {
  color: var(--scalene-warning);
}

@include mixins.respond('lg') {
  .scalene-entry-section__card-header {
    gap: 14px;
  }
}

@include mixins.respond('md') {
  .scalene-entry-section__list {
    grid-template-columns: 1fr;
  }
}

@include mixins.respond('sm') {
  .scalene-entry-section {
    padding: 22px;
  }

  .scalene-entry-section__heading {
    align-items: flex-start;
    gap: 6px 10px;
  }

  .scalene-entry-section__title {
    font-size: 1.6rem;
  }

  .scalene-entry-section__description,
  .scalene-entry-section__selection {
    font-size: 1rem;
  }

  .scalene-entry-section__card {
    padding: 22px;
  }

  .scalene-entry-section__card-header {
    gap: 14px;
  }

  .scalene-entry-section__card-title {
    font-size: 1.34rem;
  }

  .scalene-entry-section__type-label,
  .scalene-entry-section__chip {
    font-size: 1rem;
  }

  .scalene-entry-section .scalene-entry-section__button.v-btn {
    min-inline-size: 136px;
    height: 40px;
    min-height: 40px;
    font-size: 0.92rem;
  }
}
</style>
