<template>
  <div class="efficiency-topology-chart">
    <div class="efficiency-topology-chart__legend" :aria-label="text('efficiencyMetricFilter.topology')">
      <span v-for="(label, index) in xAxisLabels" :key="label" class="efficiency-topology-chart__legend-item">
        <span class="efficiency-topology-chart__symbol" :class="`efficiency-topology-chart__symbol--${symbols[index]}`" aria-hidden="true" />
        {{ label }}
      </span>
      <span class="efficiency-topology-chart__legend-item">
        <span class="efficiency-topology-chart__symbol efficiency-topology-chart__symbol--diamond" aria-hidden="true" />
        {{ text('efficiency.topologyMean') }}
      </span>
    </div>

    <div
      ref="chartEl"
      class="efficiency-topology-chart__canvas"
      :style="{ height: `${chartHeight}px` }"
      role="img"
      :aria-label="text('chart.pointCaption', { metric: xAxisName })"
      :aria-describedby="dataHintId"
    />
    <p :id="dataHintId" class="visually-hidden">{{ text('chart.dataTableHint') }}</p>

    <details class="efficiency-topology-chart__data">
      <summary>{{ text('chart.dataTable') }}</summary>
      <div role="region" tabindex="0" :aria-label="text('chart.filteredData')" class="efficiency-topology-chart__table-scroll">
        <table>
          <caption class="visually-hidden">{{ text('chart.filteredData') }}</caption>
          <thead>
            <tr>
              <th scope="col">{{ text('chart.method') }}</th>
              <th v-for="label in xAxisLabels" :key="label" scope="col">{{ label }}</th>
              <th scope="col">{{ text('efficiency.topologyMean') }}</th>
              <th scope="col">{{ text('chart.unit') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.name">
              <th scope="row" translate="no">{{ row.label }}</th>
              <td v-for="(value, index) in row.values" :key="index">{{ formatValue(value) }}</td>
              <td>{{ formatValue(row.mean) }}</td>
              <td translate="no">{{ unit }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import type { ECharts } from 'echarts/core'
import { getEfficiencyToolLabel, type EfficiencyToolName } from '@/constants/efficiency-tools'
import { useChartAppearance } from '@/composables/useChartAppearance'
import { measureChartTextWidth } from '@/utils/chartAxisTitle'
import { formatNumber, text } from '@/utils/locale'

const props = defineProps<{
  xAxisLabels: string[]
  series: Array<{ name: EfficiencyToolName; color: string; values: Array<number | null> }>
  unit: string
  decimals: number
  xAxisName: string
  highlightedToolName?: EfficiencyToolName | null
}>()
const emit = defineEmits<{ error: [message: string] }>()
const symbols = ['circle', 'rect', 'triangle'] as const
const chartEl = ref<HTMLElement | null>(null)
const dataHintId = `${useId()}-data-hint`
const appearance = useChartAppearance(chartEl, () => { void renderChart() })
let chart: ECharts | null = null
let resizeObserver: ResizeObserver | null = null
let disposed = false

const rows = computed(() => props.series.flatMap(item => {
  const values = props.xAxisLabels.map((_, index) => item.values[index] ?? null)
  const valid = values.filter((value): value is number => value !== null && Number.isFinite(value))
  if (!valid.length) return []
  return [{ ...item, label: getEfficiencyToolLabel(item.name), values,
    mean: valid.reduce((sum, value) => sum + value, 0) / valid.length }]
}).sort((a, b) => a.mean - b.mean))

const chartHeight = computed(() => Math.max(240, rows.value.length * 64 + 88))

function formatValue(value: number | null): string {
  return value === null ? 'NA' : formatNumber(value, {
    minimumFractionDigits: props.decimals, maximumFractionDigits: props.decimals
  })
}

function formatMetricValue(value: number | null): string {
  return value === null ? 'NA' : `${formatValue(value)} ${props.unit}`
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[character] ?? character)
}

function buildOption() {
  const { fontFamily, textColor, mutedColor, surfaceColor, borderColor, gridColor, highlightColor, shadowColor } = appearance.value
  const isVisible = (value: number | null): value is number => value !== null && Number.isFinite(value)
  const values = rows.value.flatMap(row => [...row.values, row.mean]).filter(isVisible)
  const min = values.length ? Math.min(...values) : 0
  const max = values.length ? Math.max(...values) : 1
  const span = Math.max(max - min, Math.abs(max) * 0.1, 0.001)
  const extent = { min: Math.min(0, min), max: max + span * 0.18 }
  const rowMap = new Map(rows.value.map(row => [row.name, row]))
  const left = Math.max(104, ...rows.value.map(row => measureChartTextWidth(row.label, `500 14px ${fontFamily}`) + 24))

  return {
    animation: false,
    grid: { left, right: 96, top: 14, bottom: 58 },
    tooltip: {
      trigger: 'axis',
      show: !props.highlightedToolName,
      triggerOn: 'mousemove',
      showDelay: 0,
      hideDelay: 0,
      transitionDuration: 0,
      axisPointer: { type: 'shadow', axis: 'y', shadowStyle: { color: highlightColor } },
      confine: true,
      backgroundColor: surfaceColor,
      borderColor,
      borderWidth: 1,
      padding: [10, 14],
      textStyle: { fontFamily, fontSize: 14, color: textColor },
      extraCssText: `border-radius: var(--app-border-radius); box-shadow: 0 4px 12px ${shadowColor};`,
      formatter: (params: Array<{ seriesName?: string }> | { seriesName?: string }) => {
        const name = (Array.isArray(params) ? params[0] : params)?.seriesName
        const row = name ? rowMap.get(name as EfficiencyToolName) : null
        if (!row) return ''
        const lines = props.xAxisLabels.map((label, index) =>
          `<div style="display:flex;align-items:center;gap:8px;margin:4px 0;"><span style="flex:1;color:${mutedColor};font-size:13px;">${escapeHtml(label)}:</span><span style="font-weight:600;font-size:13px;">${escapeHtml(formatMetricValue(row.values[index] ?? null))}</span></div>`
        ).join('')
        return `<div style="min-width:280px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid ${borderColor};">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${row.color};"></span>
            <span style="font-weight:600;font-size:15px;">${escapeHtml(row.label)}</span>
          </div>${lines}
          <div style="display:flex;align-items:center;gap:8px;margin-top:8px;padding-top:8px;border-top:1px solid ${borderColor};">
            <span style="flex:1;font-weight:500;color:${textColor};">${escapeHtml(text('chart.mean'))}:</span>
            <span style="font-weight:700;font-size:15px;color:${appearance.value.accentColor};">${escapeHtml(formatMetricValue(row.mean))}</span>
          </div></div>`
      }
    },
    xAxis: {
      type: 'value',
      ...extent,
      name: props.xAxisName,
      nameLocation: 'middle',
      nameGap: 36,
      nameTextStyle: { color: textColor, fontFamily, fontSize: 16 },
      axisLabel: { color: textColor, fontFamily, fontSize: 13, formatter: (value: number) => formatNumber(value, { maximumFractionDigits: 3 }) },
      axisLine: { show: true },
      splitLine: { lineStyle: { color: gridColor, type: 'dashed' } }
    },
    yAxis: {
      type: 'category',
      data: rows.value.map(row => row.label),
      inverse: true,
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { interval: 0, color: textColor, fontFamily, fontSize: 14, fontWeight: 500, margin: 16 }
    },
    series: rows.value.map(row => ({
      name: row.name,
      type: 'scatter',
      emphasis: { disabled: true },
      labelLayout: (params: { rect: { y: number; height: number } }) => ({
        x: (chart?.getWidth() ?? 0) - 8, y: params.rect.y + params.rect.height / 2,
        align: 'right', verticalAlign: 'middle'
      }),
      data: [
        ...(isVisible(row.mean) ? [{
          value: [row.mean, row.label], kind: 'mean', symbol: 'diamond', symbolSize: 19,
          itemStyle: { color: row.color, borderColor: textColor, borderWidth: 1, opacity: props.highlightedToolName && props.highlightedToolName !== row.name ? 0.2 : 1 },
          label: { show: !props.highlightedToolName || props.highlightedToolName === row.name, position: 'right', distance: 12, color: textColor, fontFamily, fontSize: 13,
            fontWeight: 600, formatter: () => formatValue(row.mean) }
        }] : []),
        ...row.values.flatMap((value, index) => isVisible(value) ? [{
          value: [value, row.label], kind: 'topology', topologyIndex: index,
          symbol: symbols[index] ?? 'circle', symbolSize: 6,
          itemStyle: { color: row.color, borderColor: row.color, borderWidth: 1, opacity: props.highlightedToolName && props.highlightedToolName !== row.name ? 0.15 : 0.55 }
        }] : [])
      ]
    }))
  }
}

async function renderChart() {
  if (disposed || !chartEl.value) return
  try {
    const echarts = await import('echarts/core')
    const { ScatterChart } = await import('echarts/charts')
    const { GridComponent, TooltipComponent } = await import('echarts/components')
    const { LabelLayout } = await import('echarts/features')
    const { CanvasRenderer } = await import('echarts/renderers')
    if (disposed || !chartEl.value) return
    echarts.use([ScatterChart, GridComponent, TooltipComponent, LabelLayout, CanvasRenderer])
    if (!chart) {
      chart = echarts.init(chartEl.value)
      resizeObserver = new ResizeObserver(() => chart?.resize())
      resizeObserver.observe(chartEl.value)
    }
    chart.setOption(buildOption(), { notMerge: true })
    chart.resize()
  } catch (error) {
    if (!disposed) emit('error', error instanceof Error ? error.message : 'Failed to render topology chart')
  }
}

watch(() => [props.series, props.xAxisLabels, props.xAxisName, props.highlightedToolName], () => { void renderChart() }, { deep: true })
onMounted(() => { void renderChart() })
onBeforeUnmount(() => {
  disposed = true
  resizeObserver?.disconnect()
  chart?.dispose()
  chart = null
})
</script>

<style lang="scss">
.efficiency-topology-chart__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
  margin-bottom: 12px;
  color: var(--text-body-color);
  font-family: var(--font-family-ui);
  font-size: 14px;
}

.efficiency-topology-chart__legend-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.efficiency-topology-chart__symbol {
  display: inline-block;
  width: 8px;
  height: 8px;
  border: 1.5px solid var(--text-muted-color);

  &--circle { border-radius: 50%; }
  &--triangle { clip-path: polygon(50% 0, 100% 100%, 0 100%); background: var(--text-muted-color); border: 0; }
  &--diamond { width: 12px; height: 12px; transform: rotate(45deg); background: var(--color-accent); border-color: var(--text-body-color); }
}

.efficiency-topology-chart__data {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border-subtle);
  font-family: var(--font-family-ui);
  font-size: 14px;

  summary { color: var(--color-accent); cursor: pointer; font-weight: 600; }

  table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
  th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--color-border-subtle); white-space: nowrap; }
}

.efficiency-topology-chart__table-scroll { overflow-x: auto; margin-top: 12px; }
</style>
