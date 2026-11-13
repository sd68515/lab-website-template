<template>
  <div class="metric-detail-page scalene-analysis-page">
    <header
      class="metric-hero"
      role="banner"
      :aria-labelledby="heroTitleId"
      :aria-describedby="heroDescriptionId"
    >
      <div class="metric-hero__titles">
        <h1 :id="heroTitleId" class="metric-title">{{ displayText(pageTitle) }}</h1>
        <p :id="heroDescriptionId" class="metric-description">
          {{ pageDescription }}
        </p>
        <p class="scalene-analysis-page__hero-note">
          {{ displayText(heroNote) }}
        </p>
      </div>
    </header>

    <div v-if="isLoadingReport" class="metric-chart-wrapper">
      <section class="metric-chart">
        <StatusMessage
          class="scalene-analysis-loading"
          state="loading"
          centered
          :title="text('scaleneAnalysis.loadingScaleneSummaries')"
        />
      </section>
    </div>

    <div v-else-if="reportLoadError || !loadedReport" class="metric-chart-wrapper">
      <section class="metric-chart">
        <div class="data-empty-card" role="status" aria-live="polite">
          <v-icon size="64" color="primary" class="data-empty-card__icon" icon="$mdi-table-off" />
          <p class="data-empty-card__title">{{ text('scaleneAnalysis.temporarilyUnavailable') }}</p>
        </div>
      </section>
    </div>

    <template v-else-if="isManualLogReport">
      <section
        v-for="dataset in manualDatasets"
        :key="dataset.id"
        class="scalene-analysis-page__dataset"
        :aria-labelledby="`${dataset.id}-title`"
      >
        <div class="scalene-analysis-page__dataset-header">
          <h2 :id="`${dataset.id}-title`" class="scalene-analysis-page__dataset-title">
            {{ dataset.title }}
          </h2>
          <div class="scalene-analysis-page__dataset-labels">
              <span
                :class="[
                  'scalene-analysis-page__status-badge',
                  `scalene-analysis-page__status-badge--${dataset.status}`
                ]"
              >
                {{ formatManualStatusBadge(dataset.status) }}
              </span>
              <span class="scalene-analysis-page__dataset-tag">{{ text('scaleneAnalysis.resourceSummary') }}</span>
          </div>
        </div>

        <div class="scalene-analysis-page__stats" :aria-label="text('scaleneAnalysis.summaryStatistics')">
          <article class="scalene-analysis-page__stat">
            <p class="scalene-analysis-page__stat-label">{{ text('scaleneAnalysis.runStatus') }}</p>
            <p class="scalene-analysis-page__stat-value">{{ formatManualStatusStat(dataset.status) }}</p>
          </article>
          <article class="scalene-analysis-page__stat">
            <p class="scalene-analysis-page__stat-label">{{ text('scaleneAnalysis.totalRuntime') }}</p>
            <p class="scalene-analysis-page__stat-value">{{ formatDuration(dataset.totalRuntimeSec) }}</p>
          </article>
          <article class="scalene-analysis-page__stat">
            <p class="scalene-analysis-page__stat-label">{{ text('scaleneAnalysis.peakRAM') }}</p>
            <p class="scalene-analysis-page__stat-value">{{ formatMbToGb(getManualPeakMemoryMb(dataset)) }}</p>
          </article>
          <article
            :class="[
              'scalene-analysis-page__stat',
              { 'scalene-analysis-page__stat--disabled': !hasManualVramSummaryValue(dataset) }
            ]"
          >
            <p class="scalene-analysis-page__stat-label">{{ text('scaleneAnalysis.peakVRAM') }}</p>
            <p
              :class="[
                'scalene-analysis-page__stat-value',
                { 'scalene-analysis-page__stat-value--disabled': !hasManualVramSummaryValue(dataset) }
              ]"
            >
              {{ formatManualVramSummary(dataset) }}
            </p>
          </article>
          <article class="scalene-analysis-page__stat">
            <p class="scalene-analysis-page__stat-label">{{ text('scaleneAnalysis.lastBlock') }}</p>
            <p
              :class="[
                'scalene-analysis-page__stat-value',
                'scalene-analysis-page__stat-value--compact'
              ]"
            >
              {{ formatBlockLabel(dataset.lastBlock) }}
            </p>
          </article>
        </div>

        <div class="scalene-analysis-page__grid">
          <section
            class="scalene-analysis-page__block scalene-analysis-page__block--full"
            :aria-label="text('scaleneAnalysis.resourceHotspots')"
          >
            <div class="scalene-analysis-page__table-wrap">
              <table class="scalene-analysis-page__table">
                <colgroup>
                  <col class="scalene-analysis-page__col scalene-analysis-page__col--primary">
                  <col class="scalene-analysis-page__col scalene-analysis-page__col--metric">
                  <col class="scalene-analysis-page__col scalene-analysis-page__col--metric">
                </colgroup>
                <thead>
                  <tr>
                    <th class="scalene-analysis-page__table-heading-primary">{{ text('scaleneAnalysis.block') }}</th>
                    <th>{{ text('scaleneAnalysis.peakRAM') }}</th>
                    <th :class="{ 'scalene-analysis-page__table-heading--disabled': !dataset.hasGpuMetrics }">{{ text('scaleneAnalysis.peakVRAM') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="buildResourceHotspots(dataset).length === 0">
                    <td :colspan="getManualHotspotColumnCount(dataset)" class="scalene-analysis-page__empty-cell"> {{ text('scaleneAnalysis.noRecordedResourceSamplesAreAvailableFor') }} </td>
                  </tr>
                  <tr
                    v-for="point in buildResourceHotspots(dataset)"
                    :key="`${dataset.id}-resource-${point.block}`"
                  >
                    <td>
                      <div class="scalene-analysis-page__table-primary">{{ point.block }}</div>
                      <div class="scalene-analysis-page__table-secondary"> {{ text('scaleneAnalysis.totalTime') }} {{ formatDuration(point.totalDurationSec) }}
                      </div>
                    </td>
                    <td>{{ formatMbToGb(point.memoryMb) }}</td>
                    <td :class="{ 'scalene-analysis-page__table-cell--disabled': !dataset.hasGpuMetrics }">
                      {{ formatMbToGb(point.gpuMb) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>
    </template>

    <template v-else>
      <section
        v-for="dataset in scaleneDatasets"
        :key="dataset.id"
        class="scalene-analysis-page__dataset"
        :aria-labelledby="`${dataset.id}-title`"
      >
        <div class="scalene-analysis-page__dataset-header">
          <div>
            <h2 :id="`${dataset.id}-title`" class="scalene-analysis-page__dataset-title">
              {{ dataset.title }}
            </h2>
          </div>
          <div class="scalene-analysis-page__dataset-actions">
            <a
              class="scalene-analysis-page__link"
              :href="dataset.viewerHref"
              target="_blank"
              rel="noopener noreferrer"
            > {{ text('scaleneAnalysis.openScaleneRawReport') }} </a>
            <span
              :class="[
                'scalene-analysis-page__download-wrap',
                { 'scalene-analysis-page__download-wrap--disabled': dataset.isJsonUnavailable }
              ]"
              :aria-describedby="dataset.isJsonUnavailable ? dataset.downloadHelpId : undefined"
              :aria-disabled="dataset.isJsonUnavailable ? 'true' : undefined"
              :tabindex="dataset.isJsonUnavailable ? 0 : undefined"
            >
              <button
                type="button"
                :class="[
                  'scalene-analysis-page__link',
                  'scalene-analysis-page__link--secondary',
                  'scalene-analysis-page__download-button',
                  { 'scalene-analysis-page__download-button--disabled': dataset.isJsonUnavailable }
                ]"
                :disabled="dataset.isJsonUnavailable"
                @click="downloadJson(dataset.id)"
              > {{ text('scaleneAnalysis.downloadSanitizedJSON') }} </button>
              <span
                v-if="dataset.isJsonUnavailable"
                :id="dataset.downloadHelpId"
                class="scalene-analysis-page__download-error"
                role="status"
              > {{ text('scaleneAnalysis.sanitizedJSONDownloadUnavailable') }} {{ dataset.downloadMessage }}
              </span>
            </span>
          </div>
        </div>

        <div class="scalene-analysis-page__stats" :aria-label="text('scaleneAnalysis.summaryStatistics')">
          <article class="scalene-analysis-page__stat">
            <p class="scalene-analysis-page__stat-label">{{ text('scaleneAnalysis.elapsedTime') }}</p>
            <p class="scalene-analysis-page__stat-value">{{ formatDuration(dataset.scaleneWallTimeSec) }}</p>
          </article>
          <article class="scalene-analysis-page__stat">
            <p class="scalene-analysis-page__stat-label">{{ text('scaleneAnalysis.peakRAM') }}</p>
            <p class="scalene-analysis-page__stat-value">{{ formatMbToGb(dataset.maxFootprintMb) }}</p>
          </article>
          <article
            :class="[
              'scalene-analysis-page__stat',
              { 'scalene-analysis-page__stat--disabled': !hasVramSummaryValue(dataset) }
            ]"
          >
            <p class="scalene-analysis-page__stat-label">{{ text('scaleneAnalysis.peakVRAM') }}</p>
            <p
              :class="[
                'scalene-analysis-page__stat-value',
                { 'scalene-analysis-page__stat-value--disabled': !hasVramSummaryValue(dataset) }
              ]"
            >
              {{ formatVramSummary(dataset) }}
            </p>
          </article>
        </div>

        <div class="scalene-analysis-page__grid">
          <section class="scalene-analysis-page__block" :aria-label="getBlockSectionLabel('files')">
            <div class="scalene-analysis-page__table-wrap">
              <table class="scalene-analysis-page__table">
                <colgroup>
                  <col class="scalene-analysis-page__col scalene-analysis-page__col--primary">
                  <col class="scalene-analysis-page__col scalene-analysis-page__col--metric">
                  <col class="scalene-analysis-page__col scalene-analysis-page__col--metric">
                  <col v-if="dataset.hasGpuMetrics" class="scalene-analysis-page__col scalene-analysis-page__col--metric">
                </colgroup>
                <thead>
                  <tr>
                    <th class="scalene-analysis-page__table-heading-primary">{{ text('scaleneAnalysis.hotspotSourceFiles') }}</th>
                    <th>{{ text('scaleneAnalysis.cPU') }}</th>
                    <th>{{ text('scaleneAnalysis.peakRAM') }}</th>
                    <th v-if="dataset.hasGpuMetrics">{{ text('scaleneAnalysis.peakVRAM') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="dataset.topFiles.length === 0">
                    <td :colspan="getTableColumnCount(dataset)" class="scalene-analysis-page__empty-cell">
                      {{ getBlockEmptyMessage('files', dataset) }}
                    </td>
                  </tr>
                  <tr v-for="file in dataset.topFiles" :key="`${dataset.id}-file-${file.file}`">
                    <td>
                      <div class="scalene-analysis-page__table-primary">
                        <code class="scalene-analysis-page__code">{{ file.file }}</code>
                      </div>
                    </td>
                    <td>{{ formatPercent(file.cpuPercent) }}</td>
                    <td>{{ formatMbToGb(file.peakMemoryMb) }}</td>
                    <td v-if="dataset.hasGpuMetrics">{{ formatMbToGb(file.gpuPeakMemoryMb) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="scalene-analysis-page__block" :aria-label="getBlockSectionLabel('cpu')">
            <div class="scalene-analysis-page__table-wrap">
              <table class="scalene-analysis-page__table">
                <colgroup>
                  <col class="scalene-analysis-page__col scalene-analysis-page__col--primary">
                  <col class="scalene-analysis-page__col scalene-analysis-page__col--metric">
                  <col class="scalene-analysis-page__col scalene-analysis-page__col--metric">
                  <col v-if="dataset.hasGpuMetrics" class="scalene-analysis-page__col scalene-analysis-page__col--metric">
                </colgroup>
                <thead>
                  <tr>
                    <th class="scalene-analysis-page__table-heading-primary">{{ text('scaleneAnalysis.topCPUHeavyFunctions') }}</th>
                    <th>{{ text('scaleneAnalysis.cPU') }}</th>
                    <th>{{ text('scaleneAnalysis.peakRAM') }}</th>
                    <th v-if="dataset.hasGpuMetrics">{{ text('scaleneAnalysis.peakVRAM') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="dataset.topCpuFunctions.length === 0">
                    <td :colspan="getTableColumnCount(dataset)" class="scalene-analysis-page__empty-cell">
                      {{ getBlockEmptyMessage('cpu', dataset) }}
                    </td>
                  </tr>
                  <tr v-for="item in dataset.topCpuFunctions" :key="`${dataset.id}-cpu-${item.file}-${item.lineno}-${item.label}`">
                    <td>
                      <div class="scalene-analysis-page__table-primary">{{ item.label }}</div>
                      <div class="scalene-analysis-page__table-secondary">
                        <code class="scalene-analysis-page__code">{{ item.file }}:{{ item.lineno }}</code>
                      </div>
                    </td>
                    <td>{{ formatPercent(item.cpuPercent) }}</td>
                    <td>{{ formatMbToGb(item.peakMemoryMb) }}</td>
                    <td v-if="dataset.hasGpuMetrics">{{ formatMbToGb(item.gpuPeakMemoryMb) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="scalene-analysis-page__block" :aria-label="getBlockSectionLabel('memory')">
            <div class="scalene-analysis-page__table-wrap">
              <table class="scalene-analysis-page__table">
                <colgroup>
                  <col class="scalene-analysis-page__col scalene-analysis-page__col--primary">
                  <col class="scalene-analysis-page__col scalene-analysis-page__col--metric">
                  <col class="scalene-analysis-page__col scalene-analysis-page__col--metric">
                  <col v-if="dataset.hasGpuMetrics" class="scalene-analysis-page__col scalene-analysis-page__col--metric">
                </colgroup>
                <thead>
                  <tr>
                    <th class="scalene-analysis-page__table-heading-primary">{{ text('scaleneAnalysis.peakMemoryLines') }}</th>
                    <th>{{ text('scaleneAnalysis.cPU') }}</th>
                    <th>{{ text('scaleneAnalysis.peakRAM') }}</th>
                    <th v-if="dataset.hasGpuMetrics">{{ text('scaleneAnalysis.peakVRAM') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="dataset.topMemoryLines.length === 0">
                    <td :colspan="getTableColumnCount(dataset)" class="scalene-analysis-page__empty-cell">
                      {{ getBlockEmptyMessage('memory', dataset) }}
                    </td>
                  </tr>
                  <tr v-for="item in dataset.topMemoryLines" :key="`${dataset.id}-memory-${item.file}-${item.lineno}-${item.label}`">
                    <td>
                      <div class="scalene-analysis-page__table-primary">{{ item.label }}</div>
                      <div class="scalene-analysis-page__table-secondary">
                        <code class="scalene-analysis-page__code">{{ item.file }}:{{ item.lineno }}</code>
                      </div>
                    </td>
                    <td>{{ formatPercent(item.cpuPercent) }}</td>
                    <td>{{ formatMbToGb(item.peakMemoryMb) }}</td>
                    <td v-if="dataset.hasGpuMetrics">{{ formatMbToGb(item.gpuPeakMemoryMb) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section
            :class="[
              'scalene-analysis-page__block',
              { 'scalene-analysis-page__block--disabled': !dataset.hasGpuMetrics }
            ]"
            :aria-label="getBlockSectionLabel('gpu')"
          >
            <div class="scalene-analysis-page__table-wrap">
              <table class="scalene-analysis-page__table">
                <colgroup>
                  <col class="scalene-analysis-page__col scalene-analysis-page__col--primary">
                  <col class="scalene-analysis-page__col scalene-analysis-page__col--metric">
                  <col class="scalene-analysis-page__col scalene-analysis-page__col--metric">
                  <col class="scalene-analysis-page__col scalene-analysis-page__col--metric">
                </colgroup>
                <thead>
                  <tr>
                    <th class="scalene-analysis-page__table-heading-primary">{{ text('scaleneAnalysis.peakVRAMLines') }}</th>
                    <th>{{ text('scaleneAnalysis.cPU') }}</th>
                    <th>{{ text('scaleneAnalysis.peakRAM') }}</th>
                    <th :class="{ 'scalene-analysis-page__table-heading--disabled': !dataset.hasGpuMetrics }">{{ text('scaleneAnalysis.peakVRAM') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!dataset.hasGpuMetrics">
                    <td>
                      <div class="scalene-analysis-page__table-primary scalene-analysis-page__table-primary--disabled"> {{ text('scaleneAnalysis.vRAMProfilingNotAvailable') }} </div>
                      <div class="scalene-analysis-page__table-secondary scalene-analysis-page__table-secondary--disabled"> {{ text('scaleneAnalysis.cPUOnlyRunOrNoUsableVRAM') }} </div>
                    </td>
                    <td class="scalene-analysis-page__table-cell--disabled">{{ text('scaleneAnalysis.nA') }}</td>
                    <td class="scalene-analysis-page__table-cell--disabled">{{ text('scaleneAnalysis.nA') }}</td>
                    <td class="scalene-analysis-page__table-cell--disabled">{{ text('scaleneAnalysis.nA') }}</td>
                  </tr>
                  <tr v-if="dataset.hasGpuMetrics && dataset.topGpuLines.length === 0">
                    <td colspan="4" class="scalene-analysis-page__empty-cell">
                      {{ getBlockEmptyMessage('gpu', dataset) }}
                    </td>
                  </tr>
                  <tr v-for="item in dataset.topGpuLines" :key="`${dataset.id}-gpu-${item.file}-${item.lineno}-${item.label}`">
                    <td>
                      <div class="scalene-analysis-page__table-primary">{{ item.label }}</div>
                      <div class="scalene-analysis-page__table-secondary">
                        <code class="scalene-analysis-page__code">{{ item.file }}:{{ item.lineno }}</code>
                      </div>
                    </td>
                    <td>{{ formatPercent(item.cpuPercent) }}</td>
                    <td>{{ formatMbToGb(item.peakMemoryMb) }}</td>
                    <td :class="{ 'scalene-analysis-page__table-cell--disabled': !dataset.hasGpuMetrics }">
                      {{ formatMbToGb(item.gpuPeakMemoryMb) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import StatusMessage from '@/components/common/StatusMessage.vue'
import { formatNumber, text, displayText } from '@/utils/locale'
import { computed, ref, useId, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getDefaultScaleneReport,
  getScaleneAnalysisReportByToolAndDataType,
  loadScaleneAnalysisReportPageData,
  type ScaleneAnalysisReportPageData,
  type ManualLogDatasetSummary,
  type ManualLogStageSummary,
  type ScaleneDatasetSummary
} from '@/constants/scalene'
import { ROUTE_NAMES } from '@/constants/routes'
import { resolvePublicAsset } from '@/utils/path'
import { fetchSanitizedScaleneJson, isScaleneJsonAccessible, triggerJsonDownload } from '@/utils/scalene'

const route = useRoute()
const router = useRouter()
const defaultReport = getDefaultScaleneReport()
const EMPTY_REPORT_TITLE = 'Scalene reports are currently unavailable.'
const EMPTY_REPORT_DESCRIPTION = 'No public Scalene report is currently registered for this deployment.'

const componentId = useId()
const heroTitleId = `${componentId}-scalene-title`
const heroDescriptionId = `${componentId}-scalene-description`
const unavailableJsonDatasetIds = ref<Record<string, boolean>>({})
const loadedReport = ref<ScaleneAnalysisReportPageData | null>(null)
const isLoadingReport = ref(false)
const reportLoadError = ref('')
let reportLoadRevision = 0

const tool = computed(() => {
  if (typeof route.params.tool === 'string') return route.params.tool
  return defaultReport?.tool ?? ''
})

const dataType = computed(() => {
  if (typeof route.params.dataType === 'string') return route.params.dataType
  return defaultReport?.dataType ?? ''
})

const resolvedReportSummary = computed(() => {
  return getScaleneAnalysisReportByToolAndDataType(tool.value, dataType.value) ?? defaultReport ?? null
})

const isManualLogReport = computed(() => {
  if (loadedReport.value) {
    return loadedReport.value.datasets.every((dataset) => dataset.reportType === 'manual-log')
  }
  return resolvedReportSummary.value?.reportType === 'manual-log'
})

const pageTitle = computed(() => {
  const report = loadedReport.value ?? resolvedReportSummary.value
  if (!report) return EMPTY_REPORT_TITLE
  if (isManualLogReport.value) {
    return text('scalene.manualTitle', { tool: report.toolLabel, scope: displayText(report.dataTypeLabel) })
  }
  return text('scalene.uiTitle', { tool: report.toolLabel, scope: displayText(report.dataType === 'extra-large' ? 'extra-large' : report.dataTypeLabel) })
})

const pageDescription = computed(() => {
  const report = loadedReport.value ?? resolvedReportSummary.value
  if (!report) return EMPTY_REPORT_DESCRIPTION
  if (isManualLogReport.value) {
    return text('scalene.manualDescription', { tool: report.toolLabel, scope: displayText(report.dataTypeLabel) })
  }
  return text('scalene.uiDescription', { tool: report.toolLabel, scope: displayText(report.dataTypeLabel) })
})

const heroNote = computed(() => {
  if (isManualLogReport.value) {
    return 'Note: These datasets are reconstructed from automated resource monitoring when standard Scalene reports could not be produced. They provide coarse block-level resource summaries rather than standard Scalene HTML hotspots or sanitized JSON downloads.'
  }

  return 'Note: All Scalene reports here are provided to inspect runtime and memory bottlenecks. Some reports end at the bottleneck before the full run completes, which is expected under the unified resource-limited Docker setup.'
})

function getJsonDownloadFilename(rawJsonPath: string): string {
  const rawFileName = rawJsonPath.split('/').pop()?.trim()
  if (!rawFileName) {
    return 'scalene_sanitized.json'
  }

  if (rawFileName.endsWith('.json')) {
    return rawFileName.replace(/\.json$/u, '_sanitized.json')
  }

  return `${rawFileName}_sanitized.json`
}

const scaleneDatasets = computed(() => {
  const report = loadedReport.value
  if (!report || isManualLogReport.value) return []

  return (report.datasets as ScaleneDatasetSummary[]).map((dataset) => ({
    ...dataset,
    isJsonUnavailable: unavailableJsonDatasetIds.value[dataset.id] === true,
    downloadMessage: unavailableJsonDatasetIds.value[dataset.id] === true ? text('scaleneAnalysis.fileTemporarilyUnavailable') : '',
    downloadHelpId: `${dataset.id}-download-help`,
    viewerHref: router.resolve({
      name: ROUTE_NAMES.SCALENE_REPORT_VIEWER,
      params: {
        tool: report.tool,
        dataset: dataset.id
      }
    }).href
  }))
})

const manualDatasets = computed(() => {
  const report = loadedReport.value
  if (!report || !isManualLogReport.value) return []

  return report.datasets as ManualLogDatasetSummary[]
})

async function loadReportPageData(): Promise<void> {
  const report = resolvedReportSummary.value
  const revision = ++reportLoadRevision

  unavailableJsonDatasetIds.value = {}
  reportLoadError.value = ''
  loadedReport.value = null

  if (!report) {
    isLoadingReport.value = false
    return
  }

  isLoadingReport.value = true

  try {
    const pageData = await loadScaleneAnalysisReportPageData(report.tool, report.dataType)
    if (revision !== reportLoadRevision) return
    loadedReport.value = pageData
    if (!pageData) {
      reportLoadError.value = EMPTY_REPORT_DESCRIPTION
    }
  } catch (error) {
    if (revision !== reportLoadRevision) return
    reportLoadError.value = error instanceof Error ? error.message : EMPTY_REPORT_DESCRIPTION
  } finally {
    if (revision === reportLoadRevision) {
      isLoadingReport.value = false
    }
  }
}

async function downloadJson(datasetId: string): Promise<void> {
  const dataset = scaleneDatasets.value.find((item) => item.id === datasetId)
  if (!dataset) return
  if (unavailableJsonDatasetIds.value[datasetId]) return

  try {
    const content = await fetchSanitizedScaleneJson(resolvePublicAsset(dataset.rawJsonPath))
    triggerJsonDownload(getJsonDownloadFilename(dataset.rawJsonPath), content)
  } catch (error) {
    console.error('Sanitized Scalene JSON download failed:', datasetId, error)
    unavailableJsonDatasetIds.value = {
      ...unavailableJsonDatasetIds.value,
      [datasetId]: true
    }
  }
}

async function refreshJsonAvailability(): Promise<void> {
  if (!loadedReport.value || isManualLogReport.value) {
    unavailableJsonDatasetIds.value = {}
    return
  }

  const entries = await Promise.all(
    scaleneDatasets.value.map(async (dataset) => {
      const available = await isScaleneJsonAccessible(resolvePublicAsset(dataset.rawJsonPath))
      return [dataset.id, !available] as const
    })
  )

  unavailableJsonDatasetIds.value = Object.fromEntries(entries)
}

watch(
  () => resolvedReportSummary.value?.id ?? '',
  () => {
    void loadReportPageData()
  },
  { immediate: true }
)

watch(
  () => loadedReport.value?.id ?? '',
  () => {
    unavailableJsonDatasetIds.value = {}
    void refreshJsonAvailability()
  }
)

function formatPercent(value: number): string {
  return `${formatNumber(value, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
}

function formatMbToGb(value: number | null | undefined): string {
  if (value === null || value === undefined || value <= 0) return 'NA'
  return `${formatNumber(value / 1024, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GB`
}

function hasVramSummaryValue(dataset: { hasGpuMetrics: boolean; maxGpuPeakMemoryMb: number }): boolean {
  return dataset.hasGpuMetrics && dataset.maxGpuPeakMemoryMb > 0
}

function formatVramSummary(dataset: { hasGpuMetrics: boolean; maxGpuPeakMemoryMb: number }): string {
  return hasVramSummaryValue(dataset) ? formatMbToGb(dataset.maxGpuPeakMemoryMb) : 'NA'
}

function hasManualVramSummaryValue(dataset: ManualLogDatasetSummary): boolean {
  return dataset.hasGpuMetrics && getManualPeakGpuMb(dataset) > 0
}

function formatManualVramSummary(dataset: ManualLogDatasetSummary): string {
  return hasManualVramSummaryValue(dataset) ? formatMbToGb(getManualPeakGpuMb(dataset)) : 'NA'
}

function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return 'NA'
  const totalMinutes = seconds / 60
  if (totalMinutes >= 60) {
    const hours = totalMinutes / 60
    return `${formatNumber(hours, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} h`
  }
  return `${formatNumber(totalMinutes, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} min`
}

function formatBlockLabel(value: string | null | undefined): string {
  if (!value || value === 'None') return 'NA'
  return value
}

function formatManualStatusBadge(status: ManualLogDatasetSummary['status']): string {
  if (status === 'completed') return 'Completed'
  return 'Limit reached'
}

function formatManualStatusStat(status: ManualLogDatasetSummary['status']): string {
  if (status === 'completed') return 'Completed'
  return 'Limit reached'
}

type ManualHotspotRow = {
  block: string
  totalDurationSec: number | null
  memoryMb: number | null
  gpuMb: number | null
}

function isMeaningfulManualBlock(block: string | null | undefined): boolean {
  return typeof block === 'string' && block.trim() !== '' && block.trim() !== 'None'
}

function getFilteredManualTimeline(dataset: ManualLogDatasetSummary) {
  return dataset.resourceSummary.timeline.filter((point) => isMeaningfulManualBlock(point.block))
}

function getManualPeakMemoryMb(dataset: ManualLogDatasetSummary): number | null {
  const peak = getFilteredManualTimeline(dataset).reduce((max, point) => {
    return Math.max(max, point.memoryMb ?? 0)
  }, 0)
  return peak > 0 ? peak : null
}

function getManualPeakGpuMb(dataset: { resourceSummary: { timeline: Array<{ block: string; gpuMb: number | null }> } }): number {
  return dataset.resourceSummary.timeline
    .filter((point) => isMeaningfulManualBlock(point.block))
    .reduce((max, point) => Math.max(max, point.gpuMb ?? 0), 0)
}

function buildResourceHotspots(dataset: ManualLogDatasetSummary): ManualHotspotRow[] {
  const rows = new Map<string, ManualHotspotRow>()

  for (const stage of dataset.blockSummary.stages as ManualLogStageSummary[]) {
    const block = stage.stage.trim()
    if (!isMeaningfulManualBlock(block)) continue

    const current = rows.get(block) ?? {
      block,
      totalDurationSec: null,
      memoryMb: null,
      gpuMb: null
    }

    current.totalDurationSec = (current.totalDurationSec ?? 0) + (stage.durationSec ?? 0)
    rows.set(block, current)
  }

  for (const point of getFilteredManualTimeline(dataset)) {
    const block = point.block.trim()
    const current = rows.get(block) ?? {
      block,
      totalDurationSec: null,
      memoryMb: null,
      gpuMb: null
    }

    current.memoryMb = Math.max(current.memoryMb ?? 0, point.memoryMb ?? 0)
    current.gpuMb = Math.max(current.gpuMb ?? 0, point.gpuMb ?? 0)
    rows.set(block, current)
  }

  return Array.from(rows.values())
    .filter((row) => row.memoryMb !== null || row.gpuMb !== null)
    .sort((left, right) => {
      return (right.totalDurationSec ?? -1) - (left.totalDurationSec ?? -1)
        || (right.memoryMb ?? 0) - (left.memoryMb ?? 0)
        || (right.gpuMb ?? 0) - (left.gpuMb ?? 0)
        || left.block.localeCompare(right.block)
    })
    .slice(0, 5)
}

function getBlockEmptyMessage(
  block: 'files' | 'cpu' | 'memory' | 'gpu',
  dataset: { hasGpuMetrics: boolean }
): string {
  if (block === 'gpu' && !dataset.hasGpuMetrics) {
    return 'Peak VRAM lines are not applicable for CPU-only or VRAM-unavailable reports.'
  }

  return 'This Scalene module is temporarily unavailable for the current report.'
}

function getTableColumnCount(dataset: { hasGpuMetrics: boolean }): number {
  return dataset.hasGpuMetrics ? 4 : 3
}

function getManualHotspotColumnCount(dataset: { hasGpuMetrics: boolean }): number {
  return dataset.hasGpuMetrics ? 3 : 3
}

function getBlockSectionLabel(block: 'files' | 'cpu' | 'memory' | 'gpu'): string {
  if (block === 'files') return 'Hotspot source files summary'
  if (block === 'cpu') return 'Top CPU-heavy functions summary'
  if (block === 'memory') return 'Peak memory lines summary'
  return 'Peak GPU lines summary'
}
</script>

<style scoped lang="scss">
@use '@/styles/variables.scss' as vars;

.scalene-analysis-page {
  --scalene-surface: var(--color-surface);
  --scalene-surface-muted: var(--color-surface-muted);
  --scalene-surface-tag: var(--color-surface-muted-strong);
  --scalene-surface-success: var(--success-surface-color);
  --scalene-surface-danger: var(--error-surface-color);
  --scalene-surface-disabled: var(--color-surface-muted);
  --scalene-surface-log: var(--color-log-surface);
  --scalene-border: var(--color-border-subtle);
  --scalene-border-strong: var(--color-border);
  --scalene-border-muted: var(--color-border);
  --scalene-border-disabled: var(--color-border);
  --scalene-divider: var(--color-border);
  --scalene-accent: #{vars.$accent-color};
  --scalene-accent-ink: var(--text-body-color);
  --scalene-copy-primary: var(--text-body-soft);
  --scalene-copy-secondary: var(--text-muted-color);
  --scalene-copy-muted: var(--text-muted-color);
  --scalene-copy-subtle: var(--text-muted-color);
  --scalene-copy-disabled: var(--text-placeholder-color);
  --scalene-copy-disabled-strong: var(--text-placeholder-color);
  --scalene-status-success: var(--success-text-color);
  --scalene-status-danger: var(--error-text-color);
  --scalene-focus-ring: rgba(var(--v-theme-accent), 0.55);
  --scalene-link-hover-bg: rgba(var(--v-theme-accent), 0.04);
}

.scalene-analysis-page__dataset {
  width: 100%;
  margin-top: 32px;
  padding: 28px 32px;
  --scalene-dataset-content-inset: 16px;
  border: 1px solid var(--scalene-border);
  border-radius: vars.$control-border-radius;
  background: var(--scalene-surface);
}

.scalene-analysis-page .metric-chart-wrapper {
  margin-top: 32px;
}

.scalene-analysis-page .metric-chart {
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.scalene-analysis-loading {
  min-height: 360px;
  border: 1px solid var(--scalene-border);
  border-radius: vars.$control-border-radius;
  background: var(--scalene-surface);
}

.scalene-analysis-page .data-empty-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 360px;
  background: var(--scalene-surface);
  border: 1px solid rgba(var(--v-theme-text), max(0.12, var(--divider-opacity-min)));
  border-radius: vars.$control-border-radius;
  text-align: center;
}

.scalene-analysis-page .data-empty-card__icon {
  opacity: 0.5;
  margin-bottom: 20px;
}

.scalene-analysis-page .data-empty-card__title {
  margin: 0;
  color: var(--scalene-accent);
  font-size: 22px;
  font-weight: 600;
  text-align: center;
}

.scalene-analysis-page__hero-note {
  margin: 0;
  color: var(--scalene-copy-subtle);
  font-size: 0.9rem;
  line-height: 1.5;
}

.scalene-analysis-page__dataset-title {
  margin: 0;
  color: var(--scalene-accent-ink);
  font-size: 1.58rem;
  line-height: 1.3;
}

.scalene-analysis-page__dataset-header {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: flex-start;
  padding-inline: var(--scalene-dataset-content-inset);
}

.scalene-analysis-page__dataset-labels {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

.scalene-analysis-page__dataset-tag,
.scalene-analysis-page__status-badge {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 12px;
  border-radius: vars.$control-border-radius;
  font-size: 0.88rem;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.scalene-analysis-page__dataset-tag {
  background: var(--scalene-surface-tag);
  color: var(--scalene-accent);
}

.scalene-analysis-page__status-badge--completed {
  background: var(--scalene-surface-success);
  color: var(--scalene-status-success);
}

.scalene-analysis-page__status-badge--resource-limit {
  background: var(--scalene-surface-danger);
  color: var(--scalene-status-danger);
}

.scalene-analysis-page__dataset-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-start;
  justify-content: flex-end;
  padding-top: 2px;
}

.scalene-analysis-page__link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 0 18px;
  border: 1px solid var(--scalene-border-strong);
  border-radius: vars.$control-border-radius;
  background: var(--scalene-surface);
  color: var(--scalene-accent);
  font-size: 1rem;
  font-weight: 700;
  line-height: 1;
  text-decoration: none;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.scalene-analysis-page__link:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 12px rgba(var(--v-theme-accent), 0.12);
  background: var(--scalene-link-hover-bg);
}

.scalene-analysis-page__link:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(var(--v-theme-accent), 0.14);
}

.scalene-analysis-page__link:focus-visible,
.scalene-analysis-page__download-wrap:focus-visible {
  outline: 3px solid var(--scalene-focus-ring);
  outline-offset: 3px;
}

.scalene-analysis-page__link--secondary {
  color: var(--scalene-copy-secondary);
  font-weight: 600;
}

.scalene-analysis-page__download-button {
  font: inherit;
}

.scalene-analysis-page__download-button--disabled {
  color: var(--scalene-copy-disabled);
  cursor: not-allowed;
}

.scalene-analysis-page__download-wrap {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.scalene-analysis-page__download-wrap--disabled {
  cursor: not-allowed;
}

.scalene-analysis-page__download-wrap--disabled .scalene-analysis-page__download-button {
  border-color: var(--scalene-border-disabled);
  background: var(--scalene-surface-disabled);
  color: var(--scalene-copy-disabled);
  pointer-events: none;
}

.scalene-analysis-page__download-error {
  max-width: 280px;
  color: var(--scalene-status-danger);
  font-size: var(--font-size-caption);
  line-height: var(--line-height-ui);
}

.scalene-analysis-page__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-top: 22px;
}

.scalene-analysis-page__stat {
  padding: 18px 16px;
  border-radius: vars.$control-border-radius;
  background: var(--scalene-surface-muted);
  border: 1px solid var(--scalene-border-muted);
}

.scalene-analysis-page__stat--disabled {
  background: var(--scalene-surface-muted);
  border-color: var(--scalene-border-muted);
}

.scalene-analysis-page__stat-label {
  margin: 0;
  color: var(--scalene-copy-secondary);
  font-size: 1rem;
  font-weight: 600;
}

.scalene-analysis-page__stat-value {
  margin: 10px 0 0;
  color: var(--scalene-accent-ink);
  font-size: 1.52rem;
  font-weight: 700;
  line-height: 1.3;
}

.scalene-analysis-page__stat-value--disabled {
  color: var(--scalene-copy-disabled-strong);
}

.scalene-analysis-page__stat-value--compact {
  font-size: 1.52rem;
  line-height: 1.55;
  word-break: break-word;
}

.scalene-analysis-page__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 24px;
}

.scalene-analysis-page__block {
  min-width: 0;
  padding: 24px var(--scalene-dataset-content-inset);
}

.scalene-analysis-page__block--disabled {
  background: var(--scalene-surface-disabled);
}

.scalene-analysis-page__block:nth-child(2n) {
  border-left: 1px solid var(--scalene-divider);
}

.scalene-analysis-page__block:nth-child(-n + 2) {
  border-bottom: 1px solid var(--scalene-divider);
}

.scalene-analysis-page__block.scalene-analysis-page__block--full {
  grid-column: 1 / -1;
  border-left: none;
  border-bottom: none;
}

.scalene-analysis-page__section-heading {
  margin-bottom: 18px;
}

.scalene-analysis-page__section-title {
  margin: 0;
  color: var(--scalene-accent-ink);
  font-size: 1.22rem;
  line-height: 1.35;
  font-weight: 800;
}

.scalene-analysis-page__section-subtitle {
  margin: 8px 0 0;
  color: var(--scalene-copy-muted);
  font-size: 0.98rem;
  line-height: 1.7;
}

.scalene-analysis-page__detail-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 18px;
}

.scalene-analysis-page__detail-list--compact {
  margin-bottom: 22px;
}

.scalene-analysis-page__detail-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  border: 1px solid var(--scalene-divider);
  border-radius: var(--app-border-radius);
  background: var(--scalene-surface-muted);
}

.scalene-analysis-page__detail-label {
  color: var(--scalene-copy-secondary);
  font-size: 0.92rem;
  font-weight: 700;
}

.scalene-analysis-page__detail-value {
  color: var(--scalene-accent-ink);
  font-size: 1rem;
  line-height: 1.65;
  word-break: break-word;
}

.scalene-analysis-page__detail-separator {
  margin: 0 6px;
  color: var(--scalene-copy-disabled-strong);
}

.scalene-analysis-page__table-wrap {
  margin-top: 0;
  overflow-x: hidden;
}

.scalene-analysis-page__table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.scalene-analysis-page__col--primary {
  width: 48%;
}

.scalene-analysis-page__col--metric {
  width: 17.333%;
}

.scalene-analysis-page__table th,
.scalene-analysis-page__table td {
  padding: 12px 10px;
  border-bottom: 1px solid var(--scalene-divider);
  text-align: left;
  vertical-align: top;
}

.scalene-analysis-page__table th:first-child,
.scalene-analysis-page__table td:first-child {
  padding-left: 0;
}

.scalene-analysis-page__table th:last-child,
.scalene-analysis-page__table td:last-child {
  padding-right: 0;
}

.scalene-analysis-page__table th {
  color: var(--scalene-copy-secondary);
  font-size: 1rem;
  font-weight: 700;
  white-space: nowrap;
}

.scalene-analysis-page__table th.scalene-analysis-page__table-heading--disabled {
  color: var(--scalene-copy-disabled);
}

.scalene-analysis-page__table th.scalene-analysis-page__table-heading-primary {
  color: var(--scalene-accent-ink);
  font-size: 1.22rem;
  font-weight: 800;
  line-height: 1.35;
  white-space: normal;
  letter-spacing: -0.01em;
}

.scalene-analysis-page__table td {
  font-size: 1rem;
}

.scalene-analysis-page__table td.scalene-analysis-page__table-cell--disabled {
  color: var(--scalene-copy-disabled);
}

.scalene-analysis-page__table-primary--disabled,
.scalene-analysis-page__table-secondary--disabled {
  color: var(--scalene-copy-disabled);
}

.scalene-analysis-page__table td:not(:first-child) {
  white-space: nowrap;
}

.scalene-analysis-page__table td.scalene-analysis-page__empty-cell {
  padding-left: 0;
  padding-right: 0;
  color: var(--scalene-copy-subtle);
  font-size: 0.98rem;
  font-style: italic;
  line-height: 1.7;
  white-space: normal;
}

.scalene-analysis-page__table-primary {
  color: var(--scalene-copy-primary);
  font-weight: 500;
  line-height: 1.55;
  font-size: 1rem;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.scalene-analysis-page__table-secondary {
  margin-top: 6px;
  color: var(--scalene-copy-muted);
  font-size: 0.96rem;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.scalene-analysis-page__code {
  display: inline-block;
  max-width: 100%;
  font-family: inherit;
  font-size: inherit;
  font-weight: inherit;
  line-height: inherit;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.scalene-analysis-page__crash-sections {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 22px;
}

.scalene-analysis-page__crash-section {
  padding: 18px 20px;
  border: 1px solid var(--scalene-divider);
  border-radius: var(--app-border-radius);
  background: var(--scalene-surface);
}

.scalene-analysis-page__crash-heading {
  margin: 0 0 10px;
  color: var(--scalene-accent-ink);
  font-size: 1rem;
  font-weight: 800;
}

.scalene-analysis-page__crash-lines {
  margin: 0;
  padding-left: 18px;
  color: var(--scalene-copy-primary);
}

.scalene-analysis-page__crash-line {
  line-height: 1.7;
}

.scalene-analysis-page__log-snippet + .scalene-analysis-page__log-snippet {
  margin-top: 18px;
}

.scalene-analysis-page__log-pre {
  margin: 0;
  padding: 16px 18px;
  border-radius: var(--app-border-radius);
  background: var(--scalene-surface-log);
  color: var(--scalene-border-muted);
  font-size: 0.92rem;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 1024px) {
  .scalene-analysis-page__grid,
  .scalene-analysis-page__detail-list,
  .scalene-analysis-page__crash-sections {
    grid-template-columns: 1fr;
  }

  .scalene-analysis-page__block:nth-child(2n) {
    border-left: none;
  }

  .scalene-analysis-page__block:nth-child(-n + 2) {
    border-bottom: none;
  }

  .scalene-analysis-page__block + .scalene-analysis-page__block {
    border-top: 1px solid var(--scalene-divider);
  }
}

@media (max-width: 768px) {
  .scalene-analysis-page__dataset {
    padding: 22px;
  }

  .scalene-analysis-page__dataset-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .scalene-analysis-page__dataset-labels {
    justify-content: flex-start;
  }

  .scalene-analysis-page__dataset-actions {
    width: 100%;
    padding-top: 0;
    justify-content: flex-start;
  }

  .scalene-analysis-page__block {
    padding: 20px 0;
  }
}
</style>
