<template>
  <div class="metric-detail-page scalene-report-viewer-page">
    <header
      class="metric-hero"
      role="banner"
      :aria-labelledby="heroTitleId"
    >
      <div class="metric-hero__titles">
        <h1 :id="heroTitleId" class="metric-title">{{ displayText(pageTitle) }}</h1>
      </div>
    </header>

    <div v-if="!dataset" class="metric-chart-wrapper">
      <section class="metric-chart">
        <div class="data-empty-card" role="status" aria-live="polite">
          <v-icon size="64" color="primary" class="data-empty-card__icon" icon="$mdi-table-off" />
          <p class="data-empty-card__title">{{ text('scaleneReportViewer.temporarilyUnavailable') }}</p>
        </div>
      </section>
    </div>

    <div v-else-if="errorMessage" class="metric-chart-wrapper">
      <section class="metric-chart">
        <div class="data-empty-card" role="status" aria-live="polite">
          <v-icon size="64" color="primary" class="data-empty-card__icon" icon="$mdi-table-off" />
          <p class="data-empty-card__title">{{ text('scaleneReportViewer.temporarilyUnavailable') }}</p>
        </div>
      </section>
    </div>

    <div
      v-else
      class="scalene-report-viewer-page__frame-card"
      :aria-busy="isLoading || !isReportReady ? 'true' : 'false'"
    >
      <StatusMessage
        v-show="isLoading || !isReportReady"
        class="scalene-report-viewer-page__loading"
        state="loading"
        centered
        :title="loadingText"
      />
      <iframe
        v-if="sanitizedHtml"
        ref="reportFrame"
        class="scalene-report-viewer-page__frame"
        :srcdoc="sanitizedHtml"
        sandbox="allow-scripts"
        :title="text('scaleneReportViewer.sanitizedScaleneInteractiveReport')"
        @load="handleFrameLoad"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { text, displayText } from '@/utils/locale'
import StatusMessage from '@/components/common/StatusMessage.vue'
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getScaleneReportByToolAndDatasetId } from '@/constants/scalene'
import { resolvePublicAsset } from '@/utils/path'
import {
  isScaleneHtmlReport
} from '@/utils/scalene'

const route = useRoute()
const RAW_REPORT_UNAVAILABLE_MESSAGE = 'Scalene raw report file is temporarily unavailable on the web server.'
const RAW_REPORT_RENDER_TIMEOUT_MESSAGE = 'Scalene raw report did not finish rendering.'

const componentId = useId()
const heroTitleId = `${componentId}-scalene-viewer-title`

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

const tool = computed(() => {
  return typeof route.params.tool === 'string' ? route.params.tool : ''
})

const datasetId = computed(() => {
  return typeof route.params.dataset === 'string' ? route.params.dataset : ''
})

const report = computed(() => {
  return getScaleneReportByToolAndDatasetId(tool.value, datasetId.value)
})

const dataset = computed(() => {
  if (!datasetId.value || !report.value) return undefined
  return report.value.datasets.find((item) => item.id === datasetId.value)
})

const pageTitle = computed(() => {
  if (!dataset.value || !report.value) return 'Scalene raw report'
  return `${report.value.toolLabel} · ${dataset.value.title} · ${displayText('Scalene raw report')}`
})

const isLoading = ref(false)
const isReportReady = ref(false)
const errorMessage = ref('')
const sanitizedHtml = ref('')
const reportFrame = ref<HTMLIFrameElement | null>(null)
let renderHealthTimer: number | null = null
let loadRevision = 0

const loadingText = computed(() => {
  return text(isLoading.value ? 'interface.loading-scalene-raw-report' : 'interface.preparing-scalene-raw-report')
})

function handleWindowMessage(event: MessageEvent): void {
  if (event.source !== reportFrame.value?.contentWindow) return

  const payload = event.data
  if (!payload || typeof payload !== 'object') return
  if (typeof (payload as { reportPath?: string }).reportPath !== 'string') return
  if ((payload as { reportPath?: string }).reportPath !== dataset.value?.rawHtmlPath) return

  if ((payload as { type?: string }).type === 'scalene-report-ready') {
    if (renderHealthTimer !== null) {
      window.clearTimeout(renderHealthTimer)
      renderHealthTimer = null
    }
    isReportReady.value = true
  }

  if ((payload as { type?: string; reason?: string }).type === 'scalene-report-error') {
    if (renderHealthTimer !== null) {
      window.clearTimeout(renderHealthTimer)
      renderHealthTimer = null
    }
    const reason = (payload as { reason?: string }).reason
    console.warn('Scalene report render failed', {
      rawHtmlPath: dataset.value?.rawHtmlPath,
      reason
    })
    errorMessage.value = RAW_REPORT_RENDER_TIMEOUT_MESSAGE
    isReportReady.value = false
  }

  if ((payload as { type?: string; href?: string }).type === 'scalene-open-external') {
    const href = (payload as { href?: string }).href
    if (typeof href === 'string' && /^https?:\/\//i.test(href)) {
      window.open(href, '_blank', 'noopener,noreferrer')
    }
  }
}

function handleFrameLoad(): void {
  if (renderHealthTimer !== null) {
    window.clearTimeout(renderHealthTimer)
  }

  renderHealthTimer = window.setTimeout(() => {
    console.warn('Scalene report render timed out', {
      rawHtmlPath: dataset.value?.rawHtmlPath
    })
    errorMessage.value = RAW_REPORT_RENDER_TIMEOUT_MESSAGE
    isReportReady.value = false
    renderHealthTimer = null
  }, 5000)
}

async function loadReport() {
  const revision = ++loadRevision

  if (!dataset.value) {
    sanitizedHtml.value = ''
    errorMessage.value = ''
    isLoading.value = false
    isReportReady.value = false
    return
  }

  isLoading.value = true
  isReportReady.value = false
  errorMessage.value = ''
  sanitizedHtml.value = ''
  if (renderHealthTimer !== null) {
    window.clearTimeout(renderHealthTimer)
    renderHealthTimer = null
  }

  try {
    if (!dataset.value.selfContainedHtml) {
      throw new Error(RAW_REPORT_UNAVAILABLE_MESSAGE)
    }

    const response = await fetch(resolvePublicAsset(dataset.value.rawHtmlPath))
    if (!response.ok) {
      throw new Error(RAW_REPORT_UNAVAILABLE_MESSAGE)
    }

    if (revision !== loadRevision) return
    let html = await response.text()
    if (revision !== loadRevision) return
    if (!isScaleneHtmlReport(html)) {
      throw new Error(RAW_REPORT_UNAVAILABLE_MESSAGE)
    }

    sanitizedHtml.value = html.replace(
      /<script data-scalene-report-path="[^"]*">/,
      `<script data-scalene-report-path="${escapeHtmlAttribute(dataset.value.rawHtmlPath)}">`
    )
  } catch (error) {
    if (revision !== loadRevision) return
    const message = error instanceof Error
      ? error.message
      : RAW_REPORT_UNAVAILABLE_MESSAGE
    errorMessage.value = message
  } finally {
    if (revision === loadRevision) {
      isLoading.value = false
    }
  }
}

watch(dataset, () => {
  void loadReport()
})

onMounted(() => {
  window.addEventListener('message', handleWindowMessage)
  void loadReport()
})

onBeforeUnmount(() => {
  loadRevision += 1
  if (renderHealthTimer !== null) {
    window.clearTimeout(renderHealthTimer)
    renderHealthTimer = null
  }
  window.removeEventListener('message', handleWindowMessage)
})
</script>

<style scoped lang="scss">
@use '@/styles/variables.scss' as vars;

.scalene-report-viewer-page {
  --scalene-surface: var(--color-surface);
  --scalene-border: var(--color-border-subtle);
  --scalene-accent: #{vars.$accent-color};
}

.scalene-report-viewer-page .metric-chart-wrapper {
  margin-top: 32px;
}

.scalene-report-viewer-page .metric-chart {
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.scalene-report-viewer-page .data-empty-card {
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

.scalene-report-viewer-page .data-empty-card__icon {
  opacity: 0.5;
  margin-bottom: 20px;
}

.scalene-report-viewer-page .data-empty-card__title {
  margin: 0;
  color: var(--scalene-accent);
  font-size: 22px;
  font-weight: 600;
  text-align: center;
}

.scalene-report-viewer-page__frame-card {
  position: relative;
  width: 100%;
  min-height: calc(100vh - 280px);
  margin-top: 32px;
  overflow: hidden;
  border: 1px solid var(--scalene-border);
  border-radius: vars.$control-border-radius;
  background: var(--scalene-surface);
}

.scalene-report-viewer-page__loading {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: rgba(var(--v-theme-surface), 0.92);
}

.scalene-report-viewer-page__frame {
  display: block;
  width: 100%;
  min-height: calc(100vh - 280px);
  border: none;
  background: #ffffff;
  color-scheme: light;
}

@media (max-width: 900px) {
  .scalene-report-viewer-page .metric-chart {
    padding: 0;
  }
}
</style>
