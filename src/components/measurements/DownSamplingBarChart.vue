<!--
  DownSamplingBarChart
  用于 Down-sampling 指标的 ECharts 横向柱状图组件（按得分从高到低排序）
-->
<template>
  <div class="down-sampling-bar-chart__wrapper">
    <div
      ref="chartEl"
      class="down-sampling-bar-chart"
      :style="{ height: `${chartHeight}px` }"
      role="img"
      :aria-label="ariaLabel"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ECharts } from 'echarts/core'
import type { DownSamplingToolName } from '@/constants/down-sampling'
import { getToolPublicName } from '@/constants/tools'
import { getToolColor } from '@/constants/toolColors'
import { measureChartTextWidth, wrapChartAxisTitle } from '@/utils/chartAxisTitle'
import { useChartAppearance } from '@/composables/useChartAppearance'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { formatNumber, text } from '@/utils/locale'

type BarRow = {
  method: DownSamplingToolName
  value: number
}

type DownSamplingTooltipParam = {
  data?: { method?: string; value?: number }
  value?: number
}

const props = defineProps<{
  rows: BarRow[]
  xAxisName: string
}>()

const emit = defineEmits<{
  error: [message: string]
}>()

const chartEl = ref<HTMLDivElement | null>(null)
const reducedMotion = useReducedMotion()
const appearance = useChartAppearance(chartEl, () => { void renderChart(false) })
let chart: ECharts | null = null
let resizeObserver: ResizeObserver | null = null
let disposed = false

const ariaLabel = computed(() => text('chart.downSamplingCaption', { metric: props.xAxisName }))

const chartHeight = computed(() => {
  const base = 140
  const perRow = 28
  const maxHeight = 920
  const minHeight = 420
  return Math.min(maxHeight, Math.max(minHeight, base + props.rows.length * perRow))
})

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

function buildOption() {
  const { fontFamily, textColor, borderColor, gridColor, surfaceColor, shadowColor } = appearance.value
  const yLabels = props.rows.map((row) => formatToolLabel(row.method))
  const labelWidth = Math.max(0, ...yLabels.map(label => measureChartTextWidth(label, `14px ${fontFamily}`)))
  const titleWidth = (chartEl.value?.clientWidth ?? 0) - 48 - labelWidth - 12
  const xAxisTitle = wrapChartAxisTitle(props.xAxisName, titleWidth, `16px ${fontFamily}`)

  const seriesData = props.rows.map((row) => {
    const color = getToolColor(row.method)
    return {
      value: row.value,
      method: row.method,
      itemStyle: {
        color
      }
    }
  })

  return {
    animation: !reducedMotion.value,
    grid: {
      left: 24,
      right: 24,
      top: 16,
      bottom: 52 + Math.max(0, xAxisTitle.split('\n').length - 1) * 20
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
      formatter: (params: DownSamplingTooltipParam) => {
        const data = params?.data
        const method = data?.method ?? ''
        const methodLabel = escapeHtml(formatToolLabel(method))
        const color = getToolColor(method)
        const value = typeof data?.value === 'number' && Number.isFinite(data.value) ? data.value : null
        const valueText = value === null ? 'NA' : formatNumber(value, { minimumFractionDigits: 3, maximumFractionDigits: 3 })

        return `
          <div style="min-width:220px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid ${borderColor};">
              <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};"></span>
              <span style="font-weight:600;font-size:15px;">${methodLabel}</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="flex:1;font-weight:500;color:${textColor};">${escapeHtml(text('chart.downSamplingScore'))}:</span>
              <span style="font-weight:700;font-size:15px;color:${appearance.value.accentColor};">${escapeHtml(valueText)}</span>
            </div>
          </div>
        `
      }
    },
    xAxis: {
      type: 'value',
      name: xAxisTitle,
      min: 0,
      max: 1,
      nameLocation: 'middle',
      nameGap: 34,
      nameTextStyle: {
        color: textColor,
        fontFamily: fontFamily,
        fontSize: 16,
        fontWeight: 400,
        lineHeight: 20
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
    yAxis: {
      type: 'category',
      data: yLabels,
      inverse: true,
      axisLabel: {
        interval: 0,
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
    series: [
      {
        type: 'bar',
        data: seriesData,
        barMaxWidth: 18,
        barMinHeight: 2,
        label: {
          show: true,
          position: 'right',
          fontFamily: fontFamily,
          fontSize: 13,
          fontWeight: 700,
          color: textColor,
          formatter: (params: DownSamplingTooltipParam) => {
            const value = params?.value
            return typeof value === 'number' && Number.isFinite(value)
              ? formatNumber(value, { minimumFractionDigits: 3, maximumFractionDigits: 3 })
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
        chart?.setOption(buildOption(), { notMerge: true, lazyUpdate: true })
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
  () => [props.rows, props.xAxisName],
  () => {
    void renderChart()
  },
  { deep: true }
)

watch(
  () => chartHeight.value,
  () => {
    chart?.resize()
  }
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
.down-sampling-bar-chart__wrapper {
  width: 100%;
}

.down-sampling-bar-chart {
  width: 100%;
}
</style>
