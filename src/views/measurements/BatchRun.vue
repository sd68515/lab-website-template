<!--
  Batch-run 指标详情页
  多次运行测试：重复运行的余弦相似度
-->
<template>
  <div class="metric-detail-page efficiency-metric-page batch-run-page">
    <header
      class="metric-hero"
      role="banner"
      :aria-labelledby="heroTitleId"
      :aria-describedby="heroDescriptionId"
    >
      <div class="metric-hero__titles">
        <h1 :id="heroTitleId" class="metric-title">{{ displayText(metricInfo.displayName ?? metricInfo.name) }}</h1>
        <p :id="heroDescriptionId" class="metric-description">
          {{ displayText(metricInfo.description) }}
        </p>
      </div>
    </header>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="metric-chart-wrapper">
      <section class="metric-chart">
        <StatusMessage
          state="loading"
          :title="text('batchRun.loadingBatchRunData')"
          :description="text('batchRun.pleaseWaitWhileWeFetchTheData')"
        />
      </section>
    </div>

    <!-- 错误状态：无数据 -->
    <div v-else-if="errorMessage" class="metric-chart-wrapper">
      <div class="data-empty-card">
        <v-icon size="64" color="primary" class="data-empty-card__icon" icon="$mdi-table-off" />
        <p class="data-empty-card__title">{{ text('batchRun.dataFileTemporarilyUnavailable') }}</p>
      </div>
    </div>

    <div v-else-if="chartErrorMessage" class="metric-chart-wrapper">
      <section class="metric-chart">
        <StatusMessage
          state="error"
          :title="text('batchRun.chartTemporarilyUnavailable')"
          :description="text('batchRun.pleaseRefreshThePageToReloadThe')"
        />
      </section>
    </div>

    <!-- 空数据占位符 -->
    <div v-else-if="rows.length === 0" class="metric-chart-wrapper">
      <section class="metric-chart">
        <div class="subplot-placeholder">
          <v-icon class="subplot-placeholder__icon" icon="$mdi-information-outline" size="28" />
          <p class="subplot-placeholder__text">{{ text('batchRun.noValidDataFoundInTheData') }}</p>
        </div>
      </section>
    </div>

    <!-- 图表区域 -->
    <div v-else class="metric-chart-wrapper">
      <section class="metric-chart">
        <BatchRunBarChart
          :rows="rows"
          @error="handleChartError"
        />
        <p
          v-if="missingDatasetsWarning"
          class="metric-ps-note metric-ps-note--warning"
        ><LocalizedText message="batchRun.metricPsNoteMetricPsNoteWarning" :values="{ value1: String(missingDatasetsWarning) }" />
        </p>
        <p
          v-if="missingToolsWarning"
          class="metric-ps-note metric-ps-note--warning"
        ><LocalizedText message="batchRun.metricPsNoteMetricPsNoteWarning" :values="{ value1: String(missingToolsWarning) }" />
        </p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { text, displayText } from '@/utils/locale'
import LocalizedText from '@/components/common/LocalizedText.vue'
import { onBeforeUnmount, onMounted, ref, useId } from 'vue'
import Papa from 'papaparse'
import { getMetricById } from '@/constants/metrics'
import {
  BATCH_RUN_TOOL_NAMES,
  normalizeBatchRunToolName,
  type BatchRunToolName
} from '@/constants/batch-run'
import { getToolPublicName } from '@/constants/tools'
import { resolvePublicAsset } from '@/utils/path'
import StatusMessage from '@/components/common/StatusMessage.vue'
import BatchRunBarChart from '@/components/measurements/BatchRunBarChart.vue'

const metricInfo = getMetricById('batch-run')!

type DatasetKey = 'Dataset A' | 'Dataset B'

type BatchRunRow = {
  method: BatchRunToolName
  avg: number
  values: Record<DatasetKey, number | null>
}

const componentId = useId()
const heroTitleId = `${componentId}-metric-title`
const heroDescriptionId = `${componentId}-metric-description`

// 初始设为 true，避免首帧渲染空状态后再切换到 loading 导致的跳变
const isLoading = ref(true)
const errorMessage = ref('')
const chartErrorMessage = ref('')
const rows = ref<BatchRunRow[]>([])
const missingDatasetsWarning = ref('')
const missingToolsWarning = ref('')

let abortController: AbortController | null = null

const DATASET_KEYS: DatasetKey[] = [
  'Dataset A',
  'Dataset B'
]

function isNaCell(value: string | undefined): boolean {
  const trimmed = (value ?? '').trim()
  return !trimmed || trimmed.toUpperCase() === 'NA'
}

function safeParseNumber(value: string | undefined): number | null {
  if (isNaCell(value)) return null
  const parsed = Number.parseFloat(String(value).trim())
  return Number.isFinite(parsed) ? parsed : null
}

type BatchRunCsvParseResult = {
  rows: BatchRunRow[]
  missingDatasets: DatasetKey[]
  presentTools: BatchRunToolName[]
}

function parseBatchRunCsv(text: string): BatchRunCsvParseResult {
  const cleaned = (text || '').replace(/^\uFEFF/, '')
  const parsed = Papa.parse<Record<string, string>>(cleaned, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    transformHeader: (header) => header.replace(/^\uFEFF/, '').trim()
  })

  if (parsed.errors.length > 0) {
    const fatal = parsed.errors.find((errorItem) => errorItem.type === 'Delimiter')
    if (fatal) {
      throw new Error(fatal.message || 'Failed to parse CSV')
    }
  }

  const fields = (parsed.meta.fields ?? []).map((field) => field.trim()).filter(Boolean)
  const required = ['Method', 'Mean']
  const missingRequired = required.filter((key) => !fields.includes(key))
  if (missingRequired.length > 0) {
    throw new Error(`MISSING_COLUMNS:${missingRequired.join(',')}`)
  }

  const missingDatasets = DATASET_KEYS.filter((key) => !fields.includes(key))
  const presentToolsSet = new Set<BatchRunToolName>()

  const rows = parsed.data
    .map((row) => {
      const methodRaw = (row.Method ?? '').trim()
      if (!methodRaw) return null
      const tool = normalizeBatchRunToolName(methodRaw)
      if (!tool) return null

      const avg = safeParseNumber(row.Mean)
      if (avg === null) return null

      presentToolsSet.add(tool)

      const values = Object.fromEntries(
        DATASET_KEYS.map((key) => [key, fields.includes(key) ? safeParseNumber(row[key]) : null])
      ) as Record<DatasetKey, number | null>

      return {
        method: tool,
        avg,
        values
      } satisfies BatchRunRow
    })
    .filter((item): item is BatchRunRow => Boolean(item))

  return {
    rows,
    missingDatasets,
    presentTools: Array.from(presentToolsSet)
  }
}

function resolveLoadErrorMessage(error: unknown): string {
  const fallback = 'An unexpected error occurred. Please try refreshing the page.'

  if (!(error instanceof Error)) {
    return fallback
  }

  const message = error.message

  if (message === 'FETCH_ERROR') {
    return 'Failed to load the data file. Please try refreshing the page.'
  }

  if (message === 'EMPTY_FILE') {
    return 'The data file is empty. Please contact the administrator.'
  }

  if (message.startsWith('MISSING_COLUMNS:')) {
    return 'The data file format is invalid. Please contact the administrator.'
  }

  if (message.includes('parse') || message.includes('CSV')) {
    return 'Failed to parse the data file. Please contact the administrator.'
  }

  return fallback
}

async function loadBatchRunData() {
  // 取消之前的请求
  abortController?.abort()
  abortController = new AbortController()

  isLoading.value = true
  errorMessage.value = ''
  chartErrorMessage.value = ''
  rows.value = []
  missingDatasetsWarning.value = ''
  missingToolsWarning.value = ''

  try {
    const csvUrl = resolvePublicAsset('sheets/batch-run.csv')
    const response = await fetch(csvUrl, { signal: abortController.signal })
    if (!response.ok) {
      throw new Error('FETCH_ERROR')
    }
    const csvText = await response.text()
    if (!csvText.trim()) {
      throw new Error('EMPTY_FILE')
    }
    const result = parseBatchRunCsv(csvText)
    rows.value = result.rows

    if (result.missingDatasets.length > 0) {
      missingDatasetsWarning.value = `The following datasets are missing from the current data file and are temporarily unavailable: ${result.missingDatasets.join(', ')}.`
    }

    const presentTools = new Set(result.presentTools)
    const missingTools = BATCH_RUN_TOOL_NAMES.filter((tool) => !presentTools.has(tool))
    if (missingTools.length > 0) {
      const labels = missingTools.map(getToolPublicName)
      missingToolsWarning.value = `The following tools are missing from the current data file and are temporarily unavailable: ${labels.join(', ')}.`
    }
  } catch (error) {
    // 忽略 abort 错误（可能是 Error 或 DOMException）
    if (error instanceof DOMException && error.name === 'AbortError') {
      return
    }
    if (error instanceof Error && error.name === 'AbortError') {
      return
    }

    // 用户友好的错误信息
    const detailedMessage = resolveLoadErrorMessage(error)
    errorMessage.value = detailedMessage
    console.warn('[batch-run] Failed to load data:', detailedMessage, { error })
  } finally {
    isLoading.value = false
  }
}

function handleChartError(message: string) {
  chartErrorMessage.value = message
  console.warn('[batch-run] Failed to render chart:', message)
}

onMounted(() => {
  void loadBatchRunData()
})

onBeforeUnmount(() => {
  abortController?.abort()
  abortController = null
})
</script>

<style lang="scss">
@use '@/styles/components/efficiency-metric.scss';

.batch-run-page .metric-chart-wrapper {
  margin-top: var(--metric-section-gap, 32px);
}

// 增加选择器特异性，确保优先级高于 efficiency-metric.scss
.batch-run-page.efficiency-metric-page .metric-chart {
  padding: 28px 32px;
  border-radius: var(--app-border-radius);
  border: 1px solid var(--color-border-subtle);
  border-top: 1px solid var(--color-border-subtle); // 覆盖 efficiency-metric.scss 中的 border-top: none
  background: var(--color-surface);

  @media (max-width: 768px) {
    padding: 16px;
  }
}
</style>
