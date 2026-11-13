<!--
  EfficiencyExtraLargeChart
  用于 Running time / Memory efficiency 的 extra-large 专用横向对比图：
  - 每个工具一行
  - 两个数据点时用水平线连接
  - 只有一个有效值时只显示单点，不强行连线
-->
<template>
  <div class="efficiency-extra-large-chart">
    <div
      v-if="datasetLegendItems.length"
      class="efficiency-extra-large-chart__dataset-legend"
      aria-label="Extra-large datasets"
    >
      <span class="efficiency-extra-large-chart__dataset-legend-title">{{ text('chart.datasets') }}</span>
      <span
        v-for="item in datasetLegendItems"
        :key="item.label"
        class="efficiency-extra-large-chart__dataset-chip"
      >
        <span
          class="efficiency-extra-large-chart__dataset-marker"
          :class="`efficiency-extra-large-chart__dataset-marker--${item.symbol}`"
        />
        <span translate="no">{{ item.label }}</span>
      </span>
    </div>

    <div
      ref="chartEl"
      class="efficiency-extra-large-chart__canvas"
      :style="{ height: `${chartHeight}px` }"
      role="img"
      :aria-label="ariaLabel"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ECharts } from 'echarts/core'
import {
  getEfficiencyToolLabel,
  type EfficiencyToolName
} from '@/constants/efficiency-tools'
import { useChartAppearance } from '@/composables/useChartAppearance'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { formatNumber, text } from '@/utils/locale'

type SeriesInput = {
  name: EfficiencyToolName
  color: string
  values: Array<number | null>
}

type ChartRow = {
  name: EfficiencyToolName
  label: string
  color: string
  values: Array<number | null>
  sortValue: number
  validCount: number
}

type EfficiencyExtraLargeTooltipParam = {
  seriesName?: EfficiencyToolName
}

const props = defineProps<{
  xAxisLabels: string[]
  series: SeriesInput[]
  unit?: string
  decimals: number
  xAxisName: string
  xAxisType?: 'value' | 'log'
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

const datasetLabels = computed(() => props.xAxisLabels.slice(0, 2))

const datasetLegendItems = computed(() =>
  datasetLabels.value.map((label, index) => ({
    label,
    symbol: index === 0 ? 'circle' : 'square'
  }))
)

const rows = computed<ChartRow[]>(() => {
  return props.series
    .map((item) => {
      const values = datasetLabels.value.map((_, index) => item.values[index] ?? null)
      const validValues = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
      const sortValue = validValues.length ? Math.max(...validValues) : Number.NEGATIVE_INFINITY

      return {
        name: item.name,
        label: getEfficiencyToolLabel(item.name),
        color: item.color,
        values,
        sortValue,
        validCount: validValues.length
      }
    })
    .filter((item) => item.validCount > 0)
    .sort((a, b) => b.sortValue - a.sortValue)
})

const chartHeight = computed(() => {
  const base = 120
  const perRow = 42
  const minHeight = 280
  const maxHeight = 960
  return Math.min(maxHeight, Math.max(minHeight, base + rows.value.length * perRow))
})

const ariaLabel = computed(() => text('chart.extraLargeCaption', { metric: props.xAxisName }))

const loadECharts = async () => {
  const echarts = await import('echarts/core')
  const { LineChart } = await import('echarts/charts')
  const { GridComponent, TooltipComponent } = await import('echarts/components')
  const { CanvasRenderer } = await import('echarts/renderers')

  echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer])
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

function formatMetricValue(value: number | null): string {
  if (value === null) return 'NA'
  const number = formatNumber(value, { minimumFractionDigits: props.decimals, maximumFractionDigits: props.decimals })
  if (!props.unit) return number
  return `${number} ${props.unit}`
}

function formatAxisValue(value: number): string {
  const maximumFractionDigits = props.xAxisType === 'log' ? 3 : Math.min(3, props.decimals)
  return formatNumber(Number(value), { maximumFractionDigits })
}

function buildDatasetSymbol(symbol: 'circle' | 'square'): string {
  if (symbol === 'square') {
    return `
      <span style="
        display:inline-block;
        width:14px;
        height:14px;
        background:#5f6b7a;
        border-radius:3px;
        flex-shrink:0;
      "></span>
    `
  }

  return `
    <span style="
      display:inline-block;
      width:14px;
      height:14px;
      background:#5f6b7a;
      border-radius:50%;
      flex-shrink:0;
    "></span>
  `
}

function computeExtent() {
  const validValues = rows.value.flatMap((row) =>
    row.values.filter((value): value is number => {
      if (typeof value !== 'number' || !Number.isFinite(value)) return false
      if (props.xAxisType === 'log' && value <= 0) return false
      return true
    })
  )

  if (!validValues.length) return null

  let min = Math.min(...validValues)
  let max = Math.max(...validValues)

  if (props.xAxisType === 'log') {
    const minLog = Math.log10(min)
    const maxLog = Math.log10(max)
    const padding = min === max ? 0.3 : 0.12
    return {
      min: Math.pow(10, minLog - padding),
      max: Math.pow(10, maxLog + padding)
    }
  }

  if (min === max) {
    const delta = min === 0 ? 1 : Math.abs(min) * 0.3
    min = Math.max(0, min - delta)
    max += delta
  } else {
    const span = max - min
    min = Math.max(0, min - span * 0.1)
    max += span * 0.14
  }

  return { min, max }
}

function buildOption() {
  const { fontFamily, textColor, mutedColor, borderColor, gridColor, surfaceColor, shadowColor } = appearance.value
  const extent = computeExtent()
  const rowMap = new Map(rows.value.map((row) => [row.name, row]))

  return {
    animation: !reducedMotion.value,
    grid: {
      left: 24,
      right: 28,
      top: 12,
      bottom: 48
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
        axis: 'y',
        shadowStyle: {
          color: appearance.value.highlightColor
        },
        label: {
          show: false
        }
      },
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
      formatter: (params: EfficiencyExtraLargeTooltipParam | EfficiencyExtraLargeTooltipParam[]) => {
        const normalizedParams = Array.isArray(params) ? params : [params]
        const firstParam = normalizedParams[0]
        const toolName = firstParam?.seriesName
        const row = toolName ? rowMap.get(toolName) : null
        if (!row) return ''

        const datasetRows = datasetLabels.value
          .map((label, index) => {
            const symbol = index === 0 ? 'circle' : 'square'
            return `
              <div style="display:flex;align-items:center;gap:8px;margin:4px 0;">
                ${buildDatasetSymbol(symbol)}
                <span style="flex:1;color:${mutedColor};font-size:13px;">${escapeHtml(label)}:</span>
                <span style="font-weight:600;font-size:13px;">${escapeHtml(formatMetricValue(row.values[index] ?? null))}</span>
              </div>
            `
          })
          .join('')

        return `
          <div style="min-width:260px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid ${borderColor};">
              <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${row.color};"></span>
              <span style="font-weight:600;font-size:15px;">${escapeHtml(row.label)}</span>
            </div>
            ${datasetRows}
          </div>
        `
      }
    },
    xAxis: {
      type: props.xAxisType === 'log' ? 'log' : 'value',
      name: props.xAxisName,
      min: extent?.min,
      max: extent?.max,
      nameLocation: 'middle',
      nameGap: 34,
      nameTextStyle: {
        color: textColor,
        fontFamily: fontFamily,
        fontSize: 16,
        fontWeight: 400
      },
      axisLabel: {
        formatter: (value: number) => formatAxisValue(value),
        fontFamily: fontFamily,
        fontSize: 13,
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
      data: rows.value.map((row) => row.label),
      inverse: true,
      axisLabel: {
        interval: 0,
        fontSize: 14,
        fontFamily: fontFamily,
        fontWeight: 500,
        color: textColor,
        margin: 12
      },
      axisTick: {
        show: false
      },
      axisLine: {
        lineStyle: {
          color: gridColor
        }
      }
    },
    series: rows.value.map((row) => {
      const data = datasetLabels.value
        .map((label, index) => {
          const value = row.values[index]
          if (typeof value !== 'number' || !Number.isFinite(value)) return null
          if (props.xAxisType === 'log' && value <= 0) return null

          return {
            value: [value, row.label],
            datasetLabel: label,
            symbol: index === 0 ? 'circle' : 'rect',
            symbolSize: index === 0 ? 17 : 17,
            itemStyle: {
              color: row.color,
              borderColor: '#ffffff',
              borderWidth: 2
            }
          }
        })
        .filter(Boolean)

      return {
        name: row.name,
        type: 'line',
        data,
        showSymbol: true,
        connectNulls: false,
        symbolKeepAspect: true,
        lineStyle: {
          color: row.color,
          width: data.length >= 2 ? 3 : 0,
          opacity: data.length >= 2 ? 0.4 : 0
        },
        emphasis: {
          focus: 'series',
          lineStyle: {
            width: data.length >= 2 ? 4 : 0,
            opacity: data.length >= 2 ? 0.75 : 0
          }
        }
      }
    })
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
  () => [props.series, props.xAxisLabels, props.xAxisType],
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

<style lang="scss">
@use '@/styles/mixins.scss' as mixins;

.efficiency-extra-large-chart {
  width: 100%;
}

.efficiency-extra-large-chart__dataset-legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: -18px;
  margin-bottom: 8px;
  font-family: var(--font-family-ui, inherit);
  color: var(--text-muted-color, #4a5565);

  @include mixins.respond('tablet') {
    margin-top: -6px;
  }
}

.efficiency-extra-large-chart__dataset-legend-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-body-color, #334155);
}

.efficiency-extra-large-chart__dataset-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  border: 1px solid var(--color-border, var(--color-border));
  border-radius: var(--app-border-radius);
  background: var(--color-surface, var(--color-surface-muted));
  font-size: 13px;
  line-height: 1.2;
}

.efficiency-extra-large-chart__dataset-marker {
  display: inline-block;
  width: 14px;
  height: 14px;
  background: #5f6b7a;
  flex-shrink: 0;

  &--circle {
    border-radius: 50%;
  }

  &--square {
    border-radius: 3px;
  }
}

.efficiency-extra-large-chart__canvas {
  width: 100%;
}
</style>
