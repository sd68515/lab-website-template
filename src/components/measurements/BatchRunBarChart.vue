<!--
  BatchRunBarChart
  用于 Batch-run 指标的 ECharts 柱状图组件
  展示各深度学习工具的批次运行稳定性评分（Mean）
-->
<template>
  <div class="batch-run-bar-chart__wrapper">
    <div
      ref="chartEl"
      class="batch-run-bar-chart"
      role="img"
      :aria-label="ariaLabel"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ECharts } from 'echarts/core'
import {
  getBatchRunToolColor,
  normalizeBatchRunToolName
} from '@/constants/batch-run'
import { getToolPublicName } from '@/constants/tools'
import { useChartAppearance } from '@/composables/useChartAppearance'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { formatNumber, text } from '@/utils/locale'

type DatasetKey = 'Dataset A' | 'Dataset B'

type BatchRunRow = {
  method: string
  avg: number | null
  values: Record<DatasetKey, number | null>
}

type BatchRunTooltipData = {
  method?: string
  value?: number | null
  values?: Record<DatasetKey, number | null>
}

type BatchRunTooltipParam = {
  data?: BatchRunTooltipData
  value?: number | null
}

const props = defineProps<{
  rows: BatchRunRow[]
}>()

const DATASET_LABELS: Record<DatasetKey, string> = {
  'Dataset A': 'Dataset A',
  'Dataset B': 'Dataset B'
}

const emit = defineEmits<{
  error: [message: string]
}>()

const chartEl = ref<HTMLDivElement | null>(null)
const reducedMotion = useReducedMotion()
const appearance = useChartAppearance(chartEl, () => { void renderChart(false) })
let chart: ECharts | null = null
let resizeObserver: ResizeObserver | null = null
let disposed = false

const ariaLabel = computed(() => text('chart.batchCaption', { metric: text('chart.mean') }))

const loadECharts = async () => {
  const echarts = await import('echarts/core')
  const { BarChart } = await import('echarts/charts')
  const { GridComponent, TooltipComponent } = await import('echarts/components')
  const { CanvasRenderer } = await import('echarts/renderers')

  echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer])
  return echarts
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function formatToolLabel(method: string): string {
  return getToolPublicName(method)
}

function formatNumeric(value: number | null): string {
  if (value === null) return 'NA'
  return formatNumber(value, { minimumFractionDigits: 3, maximumFractionDigits: 3 })
}

function getToolColor(method: string): string {
  const normalized = normalizeBatchRunToolName(method)
  return normalized ? getBatchRunToolColor(normalized) : '#9aa3af'
}

function buildOption() {
  const { fontFamily, textColor, mutedColor, borderColor, gridColor, surfaceColor, shadowColor } = appearance.value
  const xLabels = props.rows.map((row) => formatToolLabel(row.method))

  const seriesData = props.rows.map((row) => {
    const color = getToolColor(row.method)
    return {
      value: row.avg,
      method: row.method,
      values: row.values,
      itemStyle: {
        color
      }
    }
  })

  return {
    animation: !reducedMotion.value,
    grid: {
      left: 56,
      right: 24,
      top: 40,
      bottom: 60,
      containLabel: false
    },
    tooltip: {
      trigger: 'item',
      confine: false,
      appendTo: 'body',
      backgroundColor: surfaceColor,
      borderColor,
      borderWidth: 1,
      padding: [10, 14],
      textStyle: {
        fontFamily: fontFamily,
        fontSize: 14,
        color: textColor
      },
      extraCssText: `box-shadow: 0 4px 12px ${shadowColor}; border-radius: var(--app-border-radius);`,
      formatter: (params: BatchRunTooltipParam) => {
        const data = params?.data
        const method = data?.method ?? ''
        const methodLabel = escapeHtml(formatToolLabel(method))
        const color = getToolColor(method)
        const avgText = formatNumeric(typeof data?.value === 'number' ? data.value : null)

        const datasetRows = Object.entries(DATASET_LABELS)
          .map(([key, label]) => {
            const v = data?.values?.[key as DatasetKey] ?? null
            return `
              <div style="display:flex;align-items:center;gap:8px;margin:4px 0;">
                <span style="flex:1;color:${mutedColor};font-size:13px;">${escapeHtml(label)}:</span>
                <span style="font-weight:600;font-size:13px;">${escapeHtml(formatNumeric(v))}</span>
              </div>
            `
          })
          .join('')

        return `
          <div style="min-width:280px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid ${borderColor};">
              <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};"></span>
              <span style="font-weight:600;font-size:15px;">${methodLabel}</span>
            </div>
            ${datasetRows}
            <div style="display:flex;align-items:center;gap:8px;margin-top:8px;padding-top:8px;border-top:1px solid ${borderColor};">
              <span style="flex:1;font-weight:500;color:${textColor};">${escapeHtml(text('chart.mean'))}:</span>
              <span style="font-weight:700;font-size:15px;color:${appearance.value.accentColor};">${escapeHtml(avgText)}</span>
            </div>
          </div>
        `
      }
    },
    xAxis: {
      type: 'category',
      data: xLabels,
      axisLabel: {
        interval: 0,
        rotate: 0,
        fontSize: 14,
        fontFamily: fontFamily,
        fontWeight: 400,
        color: textColor,
        margin: 12
      },
      axisTick: {
        alignWithLabel: true
      },
      axisLine: {
        lineStyle: {
          color: gridColor
        }
      }
    },
    yAxis: {
      type: 'value',
      name: 'Mean',
      min: 0,
      max: 1,
      nameLocation: 'middle',
      nameGap: 40,
      nameTextStyle: {
        color: textColor,
        fontFamily: fontFamily,
        fontSize: 16,
        fontWeight: 400
      },
      axisLabel: {
        formatter: (value: number) => formatNumber(Number(value), { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
        fontFamily: fontFamily,
        fontSize: 14,
        fontWeight: 400,
        color: textColor
      },
      splitLine: {
        lineStyle: {
          type: 'dashed',
          color: gridColor
        }
      }
    },
    series: [
      {
        type: 'bar',
        data: seriesData,
        barMaxWidth: 56,
        barMinHeight: 2,
        label: {
          show: true,
          position: 'top',
          fontFamily: fontFamily,
          fontSize: 14,
          fontWeight: 600,
          color: textColor,
          formatter: (params: BatchRunTooltipParam) => {
            const value = params?.value
            return typeof value === 'number' && Number.isFinite(value)
              ? formatNumeric(value)
              : ''
          }
        }
      }
    ]
  }
}

async function renderChart(animate = true) {
  if (disposed) return
  if (!chartEl.value) return

  try {
    const echarts = await loadECharts()
    if (disposed) return
    if (!chartEl.value) return

    if (!chart) {
      chart = echarts.init(chartEl.value)
      resizeObserver = new ResizeObserver(() => {
        chart?.resize()
      })
      resizeObserver.observe(chartEl.value)
    }

    chart.setOption({ ...buildOption(), animation: animate && !reducedMotion.value }, { notMerge: true, lazyUpdate: true })
  } catch (error) {
    if (disposed) return
    const message = error instanceof Error ? error.message : 'Failed to load chart library'
    emit('error', message)
  }
}

watch(
  () => props.rows,
  () => {
    void renderChart()
  },
  { deep: true }
)

watch(reducedMotion, () => { void renderChart(false) })

onMounted(() => {
  void renderChart()
})

onBeforeUnmount(() => {
  disposed = true
  resizeObserver?.disconnect()
  resizeObserver = null
  chart?.dispose()
  chart = null
})
</script>

<style lang="scss" scoped>
.batch-run-bar-chart__wrapper {
  width: 100%;
}

.batch-run-bar-chart {
  width: 100%;
  height: var(--metric-chart-height, 480px);
}

@media (max-width: 768px) {
  .batch-run-bar-chart {
    height: var(--metric-chart-height-tablet, 400px);
  }
}
</style>
