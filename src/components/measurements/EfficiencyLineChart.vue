<!--
  EfficiencyLineChart
  渲染 ECharts 折线图（懒加载 echarts）。
-->
<template>
  <div class="efficiency-line-chart__wrapper">
    <div
      ref="chartEl"
      class="efficiency-line-chart"
      role="img"
      tabindex="0"
      :aria-label="ariaLabel"
      :aria-describedby="dataHintId"
      @keydown="handleChartKeydown"
    />
    <p :id="dataHintId" class="visually-hidden">{{ text('chart.dataTableHint') }}</p>
    <details class="efficiency-line-chart__data">
      <summary>{{ text('chart.dataTable') }}</summary>
      <div class="efficiency-line-chart__data-scroll" role="region" tabindex="0" :aria-label="text('chart.filteredData')">
        <table class="efficiency-line-chart__data-table">
          <caption>{{ text('chart.filteredData') }}</caption>
          <thead>
            <tr>
              <th scope="col">{{ text('chart.method') }}</th>
              <th scope="col">{{ displayText(xAxisName) || text('chart.xAxisValue') }}</th>
              <th scope="col">{{ text('chart.value') }}</th>
              <th scope="col">{{ text('chart.unit') }}</th>
              <th scope="col">{{ text('chart.dataStatus') }}</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="item in series" :key="item.name">
              <tr v-for="(label, index) in xAxisLabels" :key="index">
                <th scope="row" translate="no">{{ getToolPublicName(item.name) }}</th>
                <td translate="no">{{ label }}</td>
                <td>{{ formatDataValue(item.values[index]) }}</td>
                <td translate="no">{{ unit || '—' }}</td>
                <td>{{ parseNumericValue(item.values[index]) === null ? text('chart.dataMissing') : text('chart.dataAvailable') }}</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </details>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import type { ECElementEvent, ECharts } from 'echarts/core'
import { getToolPublicName } from '@/constants/tools'
import { wrapChartAxisTitle } from '@/utils/chartAxisTitle'
import { useChartAppearance } from '@/composables/useChartAppearance'
import { displayText, formatNumber, text } from '@/utils/locale'

type SeriesInput = {
  name: string
  color: string
  values: Array<number | null>
}

const props = defineProps<{
  xAxisLabels: string[]
  xAxisName?: string
  series: SeriesInput[]
  unit?: string
  decimals: number
  yAxisName: string
  yAxisScale?: boolean
  yAxisType?: 'value' | 'log'
}>()

const emit = defineEmits<{
  error: [message: string]
}>()

const chartEl = ref<HTMLDivElement | null>(null)
const dataHintId = useId()
const appearance = useChartAppearance(chartEl, () => renderChart(true))
let chart: ECharts | null = null
let resizeObserver: ResizeObserver | null = null
let disposed = false
const hoveredSeriesName = ref<string | null>(null)
const selectedSeriesName = ref<string | null>(null)
const isSelectingSeries = ref(false)
const activeXAxisLabel = ref<string | null>(null)
const yAxisVisibleExtent = ref<{ min: number; max: number } | null>(null)
const yAxisZoomTouched = ref(false)
const chartContainerWidth = ref(0)
let activeXAxisHighlightRaf = 0
let pendingActiveXAxisLabel: string | null = null
let measureContext: CanvasRenderingContext2D | null = null
type AxisExtent = { min: number; max: number }
let logFullExtent: AxisExtent | null = null
let logVisibleExtent: AxisExtent | null = null
let logDrag: { y: number; extent: AxisExtent } | null = null

const AXIS_LABEL_FONT_SIZE = 16
const AXIS_LABEL_MARGIN = 16
const Y_AXIS_NAME_FONT_SIZE = 16
const MEAN_FONT_SIZE = 18
const VALUE_FONT_SIZE = 16
const VALUE_PADDING_X = 10
const VALUE_PADDING_Y = 6
const VALUE_TRIANGLE_SIZE = 6
const OVERLAY_ZLEVEL = 10
const OVERLAY_Z = 120
const GAP_LINE_DASH: [number, number] = [14, 10]
const GRID_LEFT = 64
const GRID_RIGHT = 24
const GRID_TOP = 20
const GRID_BOTTOM = 80
const COMPACT_LAYOUT_BREAKPOINT = 1100
const COMPACT_GRID_BOTTOM = 118
const xAxisTitle = computed(() => wrapChartAxisTitle(
  props.xAxisName ?? '',
  chartContainerWidth.value - GRID_LEFT - GRID_RIGHT,
  `16px ${appearance.value.fontFamily}`
))

type TooltipRow = {
  seriesName: string
  displayName: string
  numericValue: number | null
  valueText: string
  color: string
  isHovered: boolean
}

type DataZoomBatchEntry = {
  start?: number
  end?: number
}

type DataZoomEventPayload = {
  batch?: DataZoomBatchEntry[]
}

function readZoomRange(): { start: number; end: number } {
  if (!chart) return { start: 0, end: 100 }
  const option = chart.getOption() as { dataZoom?: Array<{ start?: number; end?: number }> }
  const zoom = option.dataZoom?.[0]
  return {
    start: typeof zoom?.start === 'number' ? zoom.start : 0,
    end: typeof zoom?.end === 'number' ? zoom.end : 100
  }
}

function resetZoom() {
  if (props.yAxisType === 'log') {
    applyLogZoom(null)
    return
  }
  chart?.dispatchAction({ type: 'dataZoom', dataZoomIndex: 0, start: 0, end: 100 })
}

function changeZoom(factor: number) {
  if (!chart) return
  if (props.yAxisType === 'log') {
    zoomLogAt(factor, 0.5)
    return
  }
  const { start, end } = readZoomRange()
  const width = Math.min(100, Math.max(2, (end - start) * factor))
  const middle = (start + end) / 2
  const nextStart = clamp(middle - width / 2, 0, 100 - width)
  chart.dispatchAction({ type: 'dataZoom', dataZoomIndex: 0, start: nextStart, end: nextStart + width })
}

function panZoom(direction: -1 | 1) {
  if (!chart) return
  if (props.yAxisType === 'log') {
    if (!logVisibleExtent) return
    const width = logVisibleExtent.max - logVisibleExtent.min
    applyLogZoom({
      min: logVisibleExtent.min + direction * width * 0.2,
      max: logVisibleExtent.max + direction * width * 0.2
    })
    return
  }
  const { start, end } = readZoomRange()
  const delta = (end - start) * direction * 0.2
  const nextStart = clamp(start + delta, 0, 100 - (end - start))
  chart.dispatchAction({ type: 'dataZoom', dataZoomIndex: 0, start: nextStart, end: nextStart + end - start })
}

function handleChartKeydown(event: KeyboardEvent) {
  if (event.ctrlKey || event.metaKey || event.altKey) return
  if (event.key === '+' || event.key === '=') changeZoom(0.6)
  else if (event.key === '-' || event.key === '_') changeZoom(1.6)
  else if (event.key === 'ArrowUp') panZoom(1)
  else if (event.key === 'ArrowDown') panZoom(-1)
  else if (event.key === 'Home') resetZoom()
  else return
  event.preventDefault()
}

function readLogAxisExtent(): AxisExtent | null {
  const plot = getPlotRect()
  if (!plot || plot.height <= 0) return null
  const min = getYAxisValueFromPixel(plot.y + plot.height)
  const max = getYAxisValueFromPixel(plot.y)
  if (min === null || max === null || min <= 0 || max <= min) return null
  return { min: Math.log10(min), max: Math.log10(max) }
}

function applyLogZoom(extent: AxisExtent | null) {
  if (!chart || !logFullExtent) return
  const full = logFullExtent
  if (extent === null || extent.max - extent.min >= full.max - full.min - 1e-9) {
    logVisibleExtent = null
    yAxisZoomTouched.value = false
    yAxisVisibleExtent.value = null
    renderChart()
    return
  }
  const width = extent.max - extent.min
  if (!Number.isFinite(width) || width <= 0) return
  const min = clamp(extent.min, full.min, full.max - width)
  const next = { min, max: min + width }
  logVisibleExtent = next
  chart.setOption({
    yAxis: {
      min: 10 ** next.min,
      max: 10 ** next.max,
      axisLabel: { showMinLabel: false, showMaxLabel: false }
    }
  }, { silent: true, lazyUpdate: false })
  yAxisZoomTouched.value = true
  updateYAxisVisibleExtent()
  renderOverlayGraphics(activeXAxisLabel.value)
}

function zoomLogAt(factor: number, anchor: number) {
  const full = logFullExtent
  if (!full) return false
  const current = logVisibleExtent ?? full
  const fullWidth = full.max - full.min
  const width = clamp((current.max - current.min) * factor, fullWidth * 0.02, fullWidth)
  if (Math.abs(width - (current.max - current.min)) < fullWidth * 1e-9) return false
  const point = current.min + (current.max - current.min) * clamp(anchor, 0, 1)
  applyLogZoom({ min: point - width * anchor, max: point + width * (1 - anchor) })
  return true
}

type GraphicConfig = Record<string, unknown>

type TooltipPositionParam = {
  name?: string
}

type TooltipSeriesParam = {
  name?: string
  value?: unknown
  seriesName?: string
  color?: string
}

type TooltipPositionSize = {
  contentSize?: [number, number]
}

const loadECharts = async () => {
  const echarts = await import('echarts/core')
  const { LineChart } = await import('echarts/charts')
  const { GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, GraphicComponent } = await import('echarts/components')
  const { CanvasRenderer } = await import('echarts/renderers')

  echarts.use([LineChart, GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, GraphicComponent, CanvasRenderer])
  return echarts
}

function formatToolLabel(value: unknown): string {
  return typeof value === 'string' ? getToolPublicName(value) : ''
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function parseNumericValue(raw: unknown): number | null {
  if (typeof raw !== 'number') return null
  if (!Number.isFinite(raw)) return null
  return raw
}

function formatDataValue(raw: unknown): string {
  const value = parseNumericValue(raw)
  return value === null ? 'NA' : formatNumber(value, { minimumFractionDigits: props.decimals, maximumFractionDigits: props.decimals })
}

function formatMetricValue(value: number): string {
  const number = formatDataValue(value)
  if (!props.unit) return number
  return `${number} ${props.unit}`
}

function normalizeExtent(extent: { min: number; max: number }) {
  return extent.min <= extent.max ? extent : { min: extent.max, max: extent.min }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function currentGridBottom(): number {
  const width = chartContainerWidth.value
  const base = width > 0 && width <= COMPACT_LAYOUT_BREAKPOINT ? COMPACT_GRID_BOTTOM : GRID_BOTTOM
  return base + Math.max(0, xAxisTitle.value.split('\n').length - 2) * 20
}

const ariaLabel = computed(() => text('chart.lineCaption', { metric: displayText(props.yAxisName) }))
const isSingleSeriesMode = computed(() => props.series.length === 1)

function isDataZoomResetEvent(event: DataZoomEventPayload): boolean | null {
  const batch = event?.batch
  if (!Array.isArray(batch)) return null
  const entry = batch.find((item) => typeof item?.start === 'number' && typeof item?.end === 'number')
  if (!entry) return null
  const { start, end } = entry
  if (typeof start !== 'number' || typeof end !== 'number') return null
  return start <= 0 && end >= 100
}

function computeSeriesDataExtent(yAxisType: 'value' | 'log'): { min: number; max: number } | null {
  const values: number[] = []
  props.series.forEach((series) => {
    series.values.forEach((value) => {
      if (typeof value !== 'number' || !Number.isFinite(value)) return
      if (yAxisType === 'log' && value <= 0) return
      values.push(value)
    })
  })
  if (values.length === 0) return null
  const [firstValue] = values
  if (firstValue === undefined) return null
  let min = firstValue
  let max = firstValue
  for (const v of values) {
    if (v < min) min = v
    if (v > max) max = v
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null
  return normalizeExtent({ min, max })
}

function getPlotRect() {
  if (!chart) return null
  // ECharts may recalculate the grid after a responsive resize, so read its
  // rendered rectangle instead of inferring it from the option margins.
  const modelApi = chart as unknown as {
    getModel: () => {
      getComponent: (name: string) => {
        coordinateSystem?: { getRect: () => { x: number; y: number; width: number; height: number } }
      } | undefined
    } | undefined
  }
  const rect = modelApi.getModel()?.getComponent('grid')?.coordinateSystem?.getRect()
  if (rect && [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite)) {
    return rect
  }
  return {
    x: GRID_LEFT,
    y: GRID_TOP,
    width: Math.max(0, chart.getWidth() - GRID_LEFT - GRID_RIGHT),
    height: Math.max(0, chart.getHeight() - GRID_TOP - currentGridBottom())
  }
}

function getYAxisValueFromPixel(pixel: number): number | null {
  if (!chart) return null
  const value = chart.convertFromPixel({ yAxisIndex: 0 }, pixel)
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function hasNumericValue(row: TooltipRow): row is TooltipRow & { numericValue: number } {
  return row.numericValue !== null
}

function isExtentEffectivelyFull(
  visible: { min: number; max: number },
  full: { min: number; max: number },
  yAxisType: 'value' | 'log'
): boolean {
  const a = normalizeExtent(visible)
  const b = normalizeExtent(full)
  if (yAxisType === 'log') {
    if (a.min <= 0 || a.max <= 0 || b.min <= 0 || b.max <= 0) return false
    const logAmin = Math.log10(a.min)
    const logAmax = Math.log10(a.max)
    const logBmin = Math.log10(b.min)
    const logBmax = Math.log10(b.max)
    const eps = 1e-3
    return Math.abs(logAmin - logBmin) <= eps && Math.abs(logAmax - logBmax) <= eps
  }

  const span = Math.max(1e-9, b.max - b.min)
  const eps = span * 1e-6
  return Math.abs(a.min - b.min) <= eps && Math.abs(a.max - b.max) <= eps
}

/**
 * 调度 x 轴高亮更新，避免频繁重绘。
 */
function scheduleActiveXAxisHighlight(nextLabel: string | null) {
  pendingActiveXAxisLabel = nextLabel
  if (activeXAxisHighlightRaf) return
  activeXAxisHighlightRaf = window.requestAnimationFrame(() => {
    activeXAxisHighlightRaf = 0
    renderOverlayGraphics(pendingActiveXAxisLabel)
  })
}

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (measureContext) return measureContext
  const canvas = document.createElement('canvas')
  measureContext = canvas.getContext('2d')
  return measureContext
}

function formatXAxisTick(label: string, activeLabel: string | null): string {
  return `{${label === activeLabel ? 'active' : 'normal'}|${label}}`
}

function computeMean(values: Array<number | null>): number | null {
  const valid = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  if (valid.length === 0) return null
  const sum = valid.reduce((a, b) => a + b, 0)
  return sum / valid.length
}

/**
 * 构建按住选中时的均值与点位卡片叠层。
 */
function buildSelectedSeriesGraphics(): GraphicConfig[] {
  if (!chart || !isSelectingSeries.value) return []
  const selectedName = selectedSeriesName.value
  if (!selectedName) return []
  const seriesItem = props.series.find((item) => item.name === selectedName)
  if (!seriesItem) return []

  const values = seriesItem.values
  const labels = props.xAxisLabels
  const chartWidth = typeof chart.getWidth === 'function' ? chart.getWidth() : 0
  const chartHeight = typeof chart.getHeight === 'function' ? chart.getHeight() : 0
  const fontSize = VALUE_FONT_SIZE
  const paddingX = VALUE_PADDING_X
  const paddingY = VALUE_PADDING_Y
  const triangleSize = VALUE_TRIANGLE_SIZE
  const ctx = getMeasureContext()
  if (ctx) {
    ctx.font = `400 ${fontSize}px ${appearance.value.fontFamily}`
  }

  const meanValue = computeMean(values)
  const graphics: GraphicConfig[] = []

  if (meanValue !== null) {
    const toolLabel = formatToolLabel(selectedName)
    const meanSuffix = props.unit ? ` ${props.unit}` : ''
    const meanText = `${toolLabel} ${text('chart.mean')}: ${formatNumber(meanValue, { minimumFractionDigits: props.decimals, maximumFractionDigits: props.decimals })}${meanSuffix}`
    const plotRect = getPlotRect()
    // 计算均值文字位置：水平居中，垂直与 Y 轴名称齐平
    const chartWidth = chart.getWidth()
    const meanX = chartWidth / 2
    // Y 轴名称位于 grid 顶部上方，取 grid.top 作为均值文字的垂直中心
    const meanY = plotRect ? plotRect.y : GRID_TOP
    graphics.push({
      type: 'text',
      id: `efficiency-mean-${selectedName}`,
      silent: true,
      zlevel: OVERLAY_ZLEVEL,
      z: OVERLAY_Z,
      x: meanX,
      y: meanY,
      style: {
        text: meanText,
        fontFamily: appearance.value.fontFamily,
        fontSize: MEAN_FONT_SIZE,
        fontWeight: 400,
        fill: appearance.value.textColor,
        textAlign: 'center',
        textVerticalAlign: 'bottom'
      }
    })
  }

  const plotRect = getPlotRect()
  const plotTop = plotRect?.y ?? 0
  const plotBottom = plotRect ? plotRect.y + plotRect.height : chartHeight
  const minRectY = plotTop + 2
  const maxRectY = Math.max(plotTop + 2, plotBottom - 2 - (fontSize + paddingY * 2))

  values.forEach((rawValue, index) => {
    const chartInstance = chart
    if (!chartInstance) return
    const numericValue = parseNumericValue(rawValue)
    if (numericValue === null) return
    if (props.yAxisType === 'log' && numericValue <= 0) return
    const visibleExtent = yAxisVisibleExtent.value
    if (isYAxisZoomActive() && visibleExtent &&
      (numericValue < visibleExtent.min || numericValue > visibleExtent.max)) return
    const label = labels[index]
    if (label === undefined) return
    const pixel = chartInstance.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [label, numericValue])
    if (!Array.isArray(pixel) || pixel.length < 2) return
    const xValue = Number(pixel[0])
    const yValue = Number(pixel[1])
    if (!Number.isFinite(xValue) || !Number.isFinite(yValue)) return

    const text = formatMetricValue(numericValue)
    const textWidth = ctx ? ctx.measureText(text).width : text.length * fontSize * 0.6
    const rectWidth = Math.max(24, Math.ceil(textWidth + paddingX * 2))
    const rectHeight = Math.ceil(fontSize + paddingY * 2)
    const minX = rectWidth / 2 + 4
    const maxX = chartWidth ? chartWidth - rectWidth / 2 - 4 : xValue
    const clampedX = clamp(xValue, minX, maxX)
    let placeAbove = index % 2 === 0
    let rectY = placeAbove ? yValue - triangleSize - rectHeight : yValue + triangleSize

    if (rectY < minRectY) {
      rectY = yValue + triangleSize
    }
    if (rectY > maxRectY) {
      rectY = yValue - triangleSize - rectHeight
    }

    rectY = clamp(rectY, minRectY, maxRectY)
    placeAbove = rectY < yValue
    const rectX = clampedX - rectWidth / 2

    // 三角形位置计算
    const triangleBaseY = placeAbove ? rectY + rectHeight : rectY
    const triangleTipY = placeAbove ? triangleBaseY + triangleSize : triangleBaseY - triangleSize

    graphics.push({
      type: 'group',
      id: `efficiency-value-${selectedName}-${index}`,
      silent: true,
      children: [
        // 矩形背景
        {
          type: 'rect',
          zlevel: OVERLAY_ZLEVEL,
          z: OVERLAY_Z,
          shape: {
            x: rectX,
            y: rectY,
            width: rectWidth,
            height: rectHeight,
            r: appearance.value.borderRadius
          },
          style: {
            fill: appearance.value.surfaceColor,
            stroke: appearance.value.borderColor,
            lineWidth: 1,
            shadowBlur: 8,
            shadowColor: appearance.value.shadowColor
          }
        },
        // 三角形（无边框，覆盖矩形边框）
        {
          type: 'polygon',
          zlevel: OVERLAY_ZLEVEL,
          z: OVERLAY_Z + 1,
          shape: {
            points: [
              [clampedX - triangleSize - 1, triangleBaseY],
              [clampedX + triangleSize + 1, triangleBaseY],
              [clampedX, triangleTipY]
            ]
          },
          style: {
            fill: appearance.value.surfaceColor,
            stroke: 'none',
            lineWidth: 0
          }
        },
        // 三角形边框（只画两条斜边）
        {
          type: 'polyline',
          zlevel: OVERLAY_ZLEVEL,
          z: OVERLAY_Z + 2,
          shape: {
            points: placeAbove
              ? [
                  [clampedX - triangleSize, triangleBaseY],
                  [clampedX, triangleTipY],
                  [clampedX + triangleSize, triangleBaseY]
                ]
              : [
                  [clampedX - triangleSize, triangleBaseY],
                  [clampedX, triangleTipY],
                  [clampedX + triangleSize, triangleBaseY]
                ]
          },
          style: {
            stroke: appearance.value.borderColor,
            lineWidth: 1,
            fill: 'none'
          }
        },
        // 文字
        {
          type: 'text',
          zlevel: OVERLAY_ZLEVEL,
          z: OVERLAY_Z + 3,
          x: rectX + rectWidth / 2,
          y: rectY + rectHeight / 2,
          style: {
            text,
            textAlign: 'center',
            textVerticalAlign: 'middle',
            font: `400 ${fontSize}px ${appearance.value.fontFamily}`,
            fill: appearance.value.textColor
          }
        }
      ]
    })
  })

  return graphics
}

function renderOverlayGraphics(nextLabel: string | null = activeXAxisLabel.value) {
  if (!chart) return
  chart.setOption({
    xAxis: { axisLabel: { formatter: (label: string) => formatXAxisTick(label, nextLabel) } },
    graphic: buildSelectedSeriesGraphics()
  }, { replaceMerge: ['graphic'], silent: true, lazyUpdate: false })
}

function setTooltipVisibility(visible: boolean) {
  if (!chart) return
  chart.setOption(
    {
      tooltip: {
        show: visible
      }
    },
    { silent: true, lazyUpdate: false }
  )
}

function buildSeriesOptions(
  selectedName: string | null,
  selecting: boolean,
  hoveredName: string | null = null
) {
  const selectionActive = Boolean(selecting && selectedName)
  // hover 高亮通过手动整组重绘实现（见 applyHoverHighlight）。
  // 原生 emphasis(focus:'series') 由鼠标位置自动开关，在密集折线场景下会随指针穿过线条命中区
  // 频繁触发“压暗→恢复”的整图重绘（叠加 animation:false 即表现为持续闪烁）。
  const hoverActive = Boolean(!selectionActive && hoveredName)
  return props.series.flatMap((item) => {
    const isSelected = Boolean(selectionActive && selectedName && item.name === selectedName)
    const isSelectDimmed = Boolean(selectionActive && selectedName && item.name !== selectedName)
    const isHovered = Boolean(hoverActive && item.name === hoveredName)
    const isHoverDimmed = Boolean(hoverActive && item.name !== hoveredName)
    const isDimmed = isSelectDimmed || isHoverDimmed
    const isEmphasized = isSelected || isHovered
    const baseLineWidth = 1.5
    const lineWidth = isSelectDimmed ? 1 : isEmphasized ? Math.max(baseLineWidth, 3) : baseLineWidth
    const baseSymbolSize = 4
    const symbolSize = isDimmed ? 3 : baseSymbolSize
    const color = item.color
    // select 模式：非选中线变灰；hover 模式：非悬停线保持原色但降低透明度（模拟原生 blur 观感）
    const displayColor = isSelectDimmed ? appearance.value.dimmedColor : color
    const lineOpacity = isSelectDimmed ? 0.35 : isHoverDimmed ? 0.2 : 1
    // 全程禁用原生 emphasis，hover/选中态完全由手动重绘驱动，避免鼠标自动开关引发闪烁
    const emphasisConfig = { disabled: true }

    const seriesBaseZ = isDimmed ? 2 : 4
    const selectedZ = 8
    const gapZ = isDimmed ? 1 : 3
    const gapSelectedZ = 7

    const mainSeries = {
      name: item.name,
      type: 'line',
      triggerEvent: 'line',
      cursor: 'default',
      data: item.values.map(value => props.yAxisType === 'log' && value !== null && value <= 0 ? null : value),
      connectNulls: false,
      showSymbol: true,
      symbol: 'circle',
      symbolSize,
      z: isEmphasized ? selectedZ : seriesBaseZ,
      lineStyle: {
        width: lineWidth,
        opacity: lineOpacity,
        color: displayColor
      },
      itemStyle: {
        color: displayColor,
        opacity: lineOpacity
      },
      emphasis: emphasisConfig
    }

    const gapSeries = (() => {
      const total = props.xAxisLabels.length
      const maxIndex = Math.min(item.values.length, total)
      const validIndices: number[] = []

      for (let index = 0; index < maxIndex; index += 1) {
        const value = item.values[index]
        if (typeof value !== 'number') continue
        if (!Number.isFinite(value)) continue
        if (props.yAxisType === 'log' && value <= 0) continue
        validIndices.push(index)
      }

      if (validIndices.length < 2) return []

      const segments: GraphicConfig[] = []
      for (let cursorIndex = 0; cursorIndex < validIndices.length - 1; cursorIndex += 1) {
        const startIndex = validIndices[cursorIndex]
        const endIndex = validIndices[cursorIndex + 1]
        if (startIndex === undefined || endIndex === undefined) continue
        if (endIndex - startIndex <= 1) continue

        const segmentData = new Array(total).fill(null) as Array<number | null>
        const startValue = item.values[startIndex]
        const endValue = item.values[endIndex]
        if (typeof startValue === 'number' && Number.isFinite(startValue)) segmentData[startIndex] = startValue
        if (typeof endValue === 'number' && Number.isFinite(endValue)) segmentData[endIndex] = endValue

        const baseOpacity = isSelectDimmed ? 0.25 : isHoverDimmed ? 0.18 : 0.9

        segments.push({
          name: item.name,
          type: 'line',
          triggerEvent: 'line',
          cursor: 'default',
          data: segmentData,
          connectNulls: true,
          showSymbol: false,
          symbol: 'none',
          tooltip: { show: false, trigger: 'none' },
          z: isEmphasized ? gapSelectedZ : gapZ,
          lineStyle: {
            width: lineWidth,
            opacity: baseOpacity,
            color: appearance.value.mutedColor,
            type: GAP_LINE_DASH
          },
          itemStyle: {
            color: appearance.value.mutedColor
          },
          emphasis: { disabled: true }
        })
      }

      return segments
    })()

    return [mainSeries, ...gapSeries]
  })
}

function applySeriesSelection() {
  if (!chart) return
  const selecting = Boolean(isSelectingSeries.value && selectedSeriesName.value)
  const nextSeries = buildSeriesOptions(selectedSeriesName.value, selecting)
  chart.setOption(
    { series: nextSeries },
    { silent: true, lazyUpdate: false, replaceMerge: ['series'] }
  )
}

// 当前已应用到画布的 hover 高亮目标（粘性）：
// - 仅在 mouseover 命中一条新线时切换到新目标（一次整组重绘到稳定态）；
// - 图表内沿线或穿越线条移动时保持状态，避免密集折线下的高频重绘闪烁；
// - 仅在 globalout（指针真正离开图表）时清除。
let appliedHoverName: string | null = null

function applyHoverHighlight(nextToolName: string | null) {
  if (!chart) return
  if (isSingleSeriesMode.value) return
  if (isSelectingSeries.value) return
  if (appliedHoverName === nextToolName) return
  appliedHoverName = nextToolName
  const nextSeries = buildSeriesOptions(selectedSeriesName.value, false, nextToolName)
  chart.setOption(
    { series: nextSeries },
    { silent: true, lazyUpdate: false, replaceMerge: ['series'] }
  )
}

function clearHoverHighlight() {
  if (appliedHoverName === null) return
  applyHoverHighlight(null)
}

function isLeftButtonEvent(params: ECElementEvent): boolean {
  const rawEvent = params?.event?.event
  if (!rawEvent) return true
  const pointerEvent = rawEvent as { button?: unknown; buttons?: unknown }
  if (typeof pointerEvent.button === 'number') return pointerEvent.button === 0
  if (typeof pointerEvent.buttons === 'number') return pointerEvent.buttons === 1
  return true
}

function clearSeriesSelectionHold() {
  if (!chart) return
  isSelectingSeries.value = false
  selectedSeriesName.value = null
  hoveredSeriesName.value = null
  activeXAxisLabel.value = null
  appliedHoverName = null
  if (activeXAxisHighlightRaf) {
    window.cancelAnimationFrame(activeXAxisHighlightRaf)
    activeXAxisHighlightRaf = 0
  }
  pendingActiveXAxisLabel = null
  setTooltipVisibility(true)
  applySeriesSelection()
  renderOverlayGraphics(null)
}

function handleGlobalMouseUp() {
  if (isSingleSeriesMode.value) return
  if (!isSelectingSeries.value) return
  clearSeriesSelectionHold()
}

function startExternalHold(seriesName: string) {
  if (isSingleSeriesMode.value) return
  if (!chart) return
  selectedSeriesName.value = seriesName
  hoveredSeriesName.value = seriesName
  isSelectingSeries.value = true
  appliedHoverName = null
  chart.setOption(
    {
      tooltip: { show: false },
      series: buildSeriesOptions(seriesName, true)
    },
    { replaceMerge: ['series'], lazyUpdate: false, silent: true }
  )
  chart.dispatchAction?.({ type: 'hideTip' })
  renderOverlayGraphics(activeXAxisLabel.value)
}

function endExternalHold() {
  if (isSingleSeriesMode.value) return
  if (!chart) return
  if (!isSelectingSeries.value && !selectedSeriesName.value) return
  clearSeriesSelectionHold()
}

function updateYAxisVisibleExtent() {
  const plotRect = getPlotRect()
  if (!plotRect) return
  try {
    const min = getYAxisValueFromPixel(plotRect.y + plotRect.height)
    const max = getYAxisValueFromPixel(plotRect.y)
    if (min === null || max === null) return
    yAxisVisibleExtent.value = normalizeExtent({ min, max })
  } catch {
    // ignore
  }
}

function isYAxisZoomActive(): boolean {
  if (!yAxisZoomTouched.value) return false
  return Boolean(yAxisVisibleExtent.value)
}

function isInsidePlot(x: number, y: number): boolean {
  const plot = getPlotRect()
  return Boolean(plot && x >= plot.x && x <= plot.x + plot.width &&
    y >= plot.y && y <= plot.y + plot.height)
}

function handleLogWheel(event: WheelEvent) {
  if (props.yAxisType !== 'log' || !logFullExtent || !chartEl.value) return
  const bounds = chartEl.value.getBoundingClientRect()
  const x = event.clientX - bounds.left
  const y = event.clientY - bounds.top
  if (!isInsidePlot(x, y) || event.deltaY === 0) return
  const plot = getPlotRect()
  if (!plot) return
  const delta = clamp(event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? plot.height : 1), -400, 400)
  if (zoomLogAt(1.25 ** (delta / 100), 1 - (y - plot.y) / plot.height)) event.preventDefault()
}

function handleLogDragMove(event: MouseEvent) {
  if (!logDrag || !logFullExtent || !chartEl.value) return
  if ((event.buttons & 1) === 0) {
    logDrag = null
    return
  }
  const plot = getPlotRect()
  if (!plot || plot.height <= 0) return
  const delta = (event.clientY - logDrag.y) / plot.height * (logDrag.extent.max - logDrag.extent.min)
  applyLogZoom({ min: logDrag.extent.min + delta, max: logDrag.extent.max + delta })
}

function handleLogDragStart(event: MouseEvent) {
  if (props.yAxisType !== 'log' || !logVisibleExtent || !chart || !chartEl.value || event.button !== 0) return
  const bounds = chartEl.value.getBoundingClientRect()
  const x = event.clientX - bounds.left
  const y = event.clientY - bounds.top
  if (!isInsidePlot(x, y) || chart.getZr().findHover(x, y)?.target) return
  logDrag = { y: event.clientY, extent: { ...logVisibleExtent } }
}

function handleLogDragEnd() {
  logDrag = null
}

function cancelPendingXAxisHighlight() {
  if (activeXAxisHighlightRaf) {
    window.cancelAnimationFrame(activeXAxisHighlightRaf)
    activeXAxisHighlightRaf = 0
  }
  pendingActiveXAxisLabel = null
}

function applySingleSeriesMode() {
  if (!chart) return
  if (!isSingleSeriesMode.value) return
  const onlySeries = props.series[0]
  if (!onlySeries) return

  // 单条折线模式下不需要 tooltip 聚合面板，也不需要 x 轴 hover 高亮
  cancelPendingXAxisHighlight()
  activeXAxisLabel.value = null
  appliedHoverName = null

  selectedSeriesName.value = onlySeries.name
  isSelectingSeries.value = true
  setTooltipVisibility(false)
  chart.dispatchAction?.({ type: 'hideTip' })
  applySeriesSelection()
  renderOverlayGraphics(null)
}

function restoreNormalMode() {
  if (!chart) return

  if (isSelectingSeries.value || selectedSeriesName.value) {
    isSelectingSeries.value = false
    selectedSeriesName.value = null
  }
  hoveredSeriesName.value = null
  appliedHoverName = null
  setTooltipVisibility(true)
  applySeriesSelection()
  renderOverlayGraphics(activeXAxisLabel.value)
}

const chartOption = computed(() => {
  const decimals = props.decimals
  const unitSuffix = props.unit ? ` ${props.unit}` : ''
  const series = buildSeriesOptions(null, false)
  const yAxisType = props.yAxisType ?? 'value'
  const chartWidth = chartContainerWidth.value
  const isCompactXAxis = chartWidth > 0 && chartWidth <= COMPACT_LAYOUT_BREAKPOINT
  const xAxisRotate = isCompactXAxis ? 90 : 0
  const xAxisMargin = AXIS_LABEL_MARGIN

  return {
    // 科研图表交互：禁用动画，避免长按选中/取消时出现“清空再从左到右重绘”的观感
    animation: false,
    animationDuration: 0,
    animationDurationUpdate: 0,
    tooltip: {
      triggerOn: 'mousemove',
      showDelay: 0,
      hideDelay: 0,
      transitionDuration: 0,
      show: !isSingleSeriesMode.value,
      trigger: isSingleSeriesMode.value ? 'none' : 'axis',
      confine: false,
      appendTo: 'body',
      position: (
        point: number[],
        params: TooltipPositionParam | TooltipPositionParam[],
        _dom: HTMLElement,
        _rect: unknown,
        size: TooltipPositionSize
      ) => {
        const padding = 8
        const offset = 12
        const viewWidth = window.innerWidth
        const viewHeight = window.innerHeight
        const contentWidth = Number(size?.contentSize?.[0] ?? 0)
        const contentHeight = Number(size?.contentSize?.[1] ?? 0)
        const maxLeft = viewWidth - contentWidth - padding
        const maxTop = viewHeight - contentHeight - padding
        const containerRect = chartEl.value?.getBoundingClientRect()
        const containerLeft = containerRect?.left ?? 0
        const containerTop = containerRect?.top ?? 0
        const pointX = Number(point?.[0] ?? 0)
        const pointY = Number(point?.[1] ?? 0)
        const baseX = containerLeft + pointX
        const baseY = containerTop + pointY
        const axisName = (() => {
          if (Array.isArray(params) && params.length > 0) {
            return typeof params[0]?.name === 'string' ? params[0].name : ''
          }
          if (!Array.isArray(params) && typeof params?.name === 'string') {
            return params.name
          }
          return ''
        })()

        const axisIndex = axisName ? props.xAxisLabels.indexOf(axisName) : -1
        const shouldFlipFromSecondLast =
          axisIndex >= 0 && props.xAxisLabels.length >= 2 && axisIndex >= props.xAxisLabels.length - 2

        const shouldFlipToLeft =
          shouldFlipFromSecondLast || baseX + offset + contentWidth > viewWidth - padding
        let left = shouldFlipToLeft ? baseX - contentWidth - offset : baseX + offset
        let top = baseY - contentHeight - offset
        if (top < padding) {
          top = baseY + offset
        }
        if (maxLeft < padding) {
          left = padding
        } else {
          left = clamp(left, padding, maxLeft)
        }
        if (maxTop < padding) {
          top = padding
        } else {
          top = clamp(top, padding, maxTop)
        }
        return [left - containerLeft, top - containerTop]
      },
      backgroundColor: appearance.value.surfaceColor,
      borderColor: appearance.value.borderColor,
      borderWidth: 1,
      padding: [8, 10],
      textStyle: {
        fontFamily: appearance.value.fontFamily,
        fontSize: 13,
        color: appearance.value.textColor
      },
      extraCssText: `box-shadow: 0 4px 12px ${appearance.value.shadowColor}; border-radius: var(--app-border-radius);`,
      axisPointer: {
        type: 'line',
        lineStyle: {
          color: appearance.value.accentColor,
          width: 1,
          type: 'dashed'
        }
      },
      formatter: (params: TooltipSeriesParam[]) => {
        if (!Array.isArray(params) || params.length === 0) return ''
        const axisName = typeof params[0]?.name === 'string' ? params[0].name : ''
        if (axisName && activeXAxisLabel.value !== axisName) {
          activeXAxisLabel.value = axisName
          scheduleActiveXAxisHighlight(axisName)
        }
        const hovered = hoveredSeriesName.value
        const zoomActive = isYAxisZoomActive()
        const visibleExtent = yAxisVisibleExtent.value

        const rows = params
          .map((item): TooltipRow => {
            const rawValue = item?.value
            const numericValue = parseNumericValue(rawValue)
            const valueText =
              typeof rawValue === 'number'
                ? formatNumber(rawValue, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
                : rawValue === null || rawValue === undefined
                  ? 'NA'
                  : escapeHtml(rawValue)
            const seriesName = typeof item?.seriesName === 'string' ? item.seriesName : ''
            const color = item?.color || '#999'
            return {
              seriesName,
              displayName: escapeHtml(formatToolLabel(seriesName)),
              numericValue,
              valueText,
              color,
              isHovered: Boolean(hovered && seriesName === hovered)
            }
          })
          .filter(hasNumericValue)
          .filter((row) => yAxisType !== 'log' || row.numericValue > 0)
          .filter((row) => {
            if (!zoomActive || !visibleExtent) return true
            const extent = normalizeExtent(visibleExtent)
            if (yAxisType === 'log') {
              if (row.numericValue <= 0 || extent.min <= 0) return false
              const value = Math.log10(row.numericValue)
              return value >= Math.log10(extent.min) - 1e-9 &&
                value <= Math.log10(extent.max) + 1e-9
            }
            const epsilon = (extent.max - extent.min) * 1e-9
            return row.numericValue >= extent.min - epsilon && row.numericValue <= extent.max + epsilon
          })

        // NOTE：为了实现“缺口虚线段”，同一个工具会对应多条 series（主线 + 多段虚线）。
        // axis-trigger tooltip 在某些情况下仍可能把虚线段收集进 params，导致同一工具重复显示。
        // 这里按 seriesName 去重，确保每个工具最多显示一行。
        const uniqueRows = Array.from(
          rows.reduce((acc, row) => {
            const key = row.seriesName
            const existing = acc.get(key)
            if (!existing) {
              acc.set(key, row)
              return acc
            }
            acc.set(key, {
              ...existing,
              isHovered: Boolean(existing.isHovered || row.isHovered),
              numericValue: existing.numericValue ?? row.numericValue,
              valueText: existing.valueText || row.valueText,
              color: existing.color || row.color
            })
            return acc
          }, new Map<string, (typeof rows)[number]>()).values()
        ).sort((a, b) => (b.numericValue ?? 0) - (a.numericValue ?? 0))

        if (uniqueRows.length === 0) {
          return `<div style="color:${appearance.value.mutedColor};font-size:13px;">${escapeHtml(text('chart.noVisibleSeries'))}</div>`
        }

        const rowBaseStyle =
          'display:flex;align-items:center;gap:6px;margin:2px 0;padding:3px 8px;border-radius:var(--app-border-radius);'

        let html = '<div style="max-height:calc(100vh - 24px);overflow-y:auto;">'
        uniqueRows.forEach((row) => {
          const highlightStyle = row.isHovered ? `box-shadow: inset 0 0 0 1px ${appearance.value.accentColor};` : ''
          html += `<div style="${rowBaseStyle}${highlightStyle}">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${row.color};"></span>
            <span style="flex:1;font-weight:500;">${row.displayName}</span>
            <span style="font-weight:600;">${row.valueText}${unitSuffix}</span>
          </div>`
        })
        html += '</div>'

        return html
      }
    },
    legend: { show: false },
    dataZoom: [
      {
        type: 'inside',
        yAxisIndex: 0,
        filterMode: 'none',
        zoomOnMouseWheel: yAxisType !== 'log',
        moveOnMouseMove: yAxisType !== 'log',
        moveOnMouseWheel: yAxisType !== 'log',
        start: 0,
        end: 100
      }
    ],
    grid: {
      left: GRID_LEFT,
      right: GRID_RIGHT,
      top: GRID_TOP,
      bottom: currentGridBottom(),
      containLabel: false
    },
    xAxis: {
      type: 'category',
      name: xAxisTitle.value,
      nameLocation: 'middle',
      nameGap: isCompactXAxis ? 70 : 34,
      nameTextStyle: {
        color: appearance.value.textColor,
        fontFamily: appearance.value.fontFamily,
        fontSize: 16,
        fontWeight: 400,
        lineHeight: 20
      },
      data: props.xAxisLabels,
      axisLabel: {
        rotate: xAxisRotate,
        interval: 0,
        margin: xAxisMargin,
        formatter: (label: string) => formatXAxisTick(label, null),
        rich: {
          normal: {
            fontFamily: appearance.value.fontFamily,
            fontSize: AXIS_LABEL_FONT_SIZE,
            fontWeight: 400,
            lineHeight: AXIS_LABEL_FONT_SIZE,
            padding: [8, 10],
            borderWidth: 1,
            borderColor: 'transparent',
            borderRadius: appearance.value.borderRadius,
            color: appearance.value.textColor
          },
          active: {
            fontFamily: appearance.value.fontFamily,
            fontSize: AXIS_LABEL_FONT_SIZE,
            fontWeight: 400,
            lineHeight: AXIS_LABEL_FONT_SIZE,
            padding: [8, 10],
            borderWidth: 1,
            borderColor: appearance.value.accentColor,
            borderRadius: appearance.value.borderRadius,
            backgroundColor: appearance.value.highlightColor,
            color: appearance.value.textColor
          }
        },
        fontFamily: appearance.value.fontFamily,
        fontSize: AXIS_LABEL_FONT_SIZE,
        fontWeight: 400,
        color: appearance.value.textColor
      }
    },
    yAxis: {
      type: yAxisType,
      name: displayText(props.yAxisName),
      scale: props.yAxisScale ?? (yAxisType === 'log'),
      nameLocation: 'middle',
      nameGap: 40,
      nameTextStyle: {
        color: appearance.value.textColor,
        fontFamily: appearance.value.fontFamily,
        fontSize: Y_AXIS_NAME_FONT_SIZE,
        fontWeight: 400
      },
      axisLabel: {
        color: appearance.value.textColor,
        fontFamily: appearance.value.fontFamily,
        fontSize: AXIS_LABEL_FONT_SIZE,
        fontWeight: 400
      },
      splitLine: {
        lineStyle: {
          type: 'dashed',
          color: appearance.value.gridColor
        }
      }
    },
    series
  }
})

async function ensureChart() {
  if (chart || disposed) return
  const el = chartEl.value
  if (!el) return

  const echarts = await loadECharts()
  if (disposed) return

  chart = echarts.init(el)
  const chartInstance = chart
  chartContainerWidth.value = el.clientWidth

  chartInstance.on('mouseover', (params: ECElementEvent) => {
    if (params?.componentType !== 'series') return
    if (params?.seriesType !== 'line') return
    const seriesName = typeof params?.seriesName === 'string' ? params.seriesName : null
    hoveredSeriesName.value = seriesName
    if (!isSelectingSeries.value && seriesName) {
      // 仅在进入一条新线时切换到稳定的高亮态（单次整组重绘）
      applyHoverHighlight(seriesName)
    }
  })

  chartInstance.on('mouseout', (params: ECElementEvent) => {
    if (params?.componentType !== 'series') return
    if (params?.seriesType !== 'line') return
    // 粘性 hover：图表内沿线/穿越线条移动不清除高亮，避免密集折线下的高频重绘闪烁。
    // 仅同步聚合 tooltip 的“当前悬停行”标注；真正的清除交给 globalout。
    hoveredSeriesName.value = null
  })

  chartInstance.on('mousedown', (params: ECElementEvent) => {
    if (isSingleSeriesMode.value) return
    if (params?.componentType !== 'series') return
    if (params?.seriesType !== 'line') return
    if (!isLeftButtonEvent(params)) return
    const seriesName = typeof params?.seriesName === 'string' ? params.seriesName : null
    if (!seriesName) return
    selectedSeriesName.value = seriesName
    isSelectingSeries.value = true
    appliedHoverName = null
    setTooltipVisibility(false)
    chartInstance.dispatchAction?.({ type: 'hideTip' })
    applySeriesSelection()
    renderOverlayGraphics(activeXAxisLabel.value)
  })

  chartInstance.on('globalout', () => {
    hoveredSeriesName.value = null
    if (isSelectingSeries.value) return
    activeXAxisLabel.value = null
    // 立即清除 x 轴高亮，取消待执行的 RAF 避免竞态
    if (activeXAxisHighlightRaf) {
      window.cancelAnimationFrame(activeXAxisHighlightRaf)
      activeXAxisHighlightRaf = 0
    }
    pendingActiveXAxisLabel = null
    // Clear tooltip coordinates before repainting; ECharts otherwise tries to restore the old tooltip.
    chartInstance.dispatchAction({ type: 'hideTip' })
    clearHoverHighlight()
    renderOverlayGraphics(null)
  })

  chartInstance.on('dataZoom', (event: unknown) => {
    updateYAxisVisibleExtent()
    const yAxisType = props.yAxisType ?? 'value'
    const fullExtent = computeSeriesDataExtent(yAxisType)
    const visibleExtent = yAxisVisibleExtent.value

    const fallbackReset = isDataZoomResetEvent(
      typeof event === 'object' && event !== null ? (event as DataZoomEventPayload) : {}
    )
    const isReset = yAxisType === 'log'
      ? logVisibleExtent === null
      : visibleExtent && fullExtent
        ? isExtentEffectivelyFull(visibleExtent, fullExtent, yAxisType)
        : fallbackReset === true

    if (isReset) {
      yAxisZoomTouched.value = false
      yAxisVisibleExtent.value = null
    } else {
      yAxisZoomTouched.value = true
    }

    // 缩放/拖拽 yAxis 时，ECharts 默认会显示当前范围的 min/max 标签（常带小数）。
    // 这些边界标签会在交互过程中频繁变化，叠加 containLabel:false 容易触发布局重排抖动。
    // 这里在交互激活时隐藏边界标签，重置后恢复，尽量不影响未缩放时的视觉效果。
    const boundaryLabelVisible = isReset ? true : false
    {
      chartInstance.setOption(
        {
          yAxis: {
            axisLabel: {
              showMinLabel: boundaryLabelVisible,
              showMaxLabel: boundaryLabelVisible
            }
          }
        },
        { silent: true, lazyUpdate: false }
      )
    }

    renderOverlayGraphics(activeXAxisLabel.value)
  })

  el.addEventListener('wheel', handleLogWheel, { passive: false, capture: true })
  el.addEventListener('mousedown', handleLogDragStart, true)
  window.addEventListener('mousemove', handleLogDragMove, true)
  window.addEventListener('mouseup', handleLogDragEnd, true)
  window.addEventListener('blur', handleLogDragEnd)

  resizeObserver = new ResizeObserver(() => {
    const nextWidth = el.clientWidth
    if (nextWidth !== chartContainerWidth.value) {
      chartContainerWidth.value = nextWidth
    }
    chartInstance.resize()
    updateYAxisVisibleExtent()
    renderOverlayGraphics(activeXAxisLabel.value)
  })
  resizeObserver.observe(el)

  window.addEventListener('mouseup', handleGlobalMouseUp)
  window.addEventListener('blur', handleGlobalMouseUp)
}

function renderChart(preserveZoom = false) {
  if (!chart) return
  const isLog = props.yAxisType === 'log'
  const previousZoom = preserveZoom && !isLog && yAxisZoomTouched.value ? readZoomRange() : null
  const previousLogExtent = preserveZoom && isLog && logVisibleExtent ? { ...logVisibleExtent } : null
  chart.setOption(chartOption.value, { notMerge: true })
  logFullExtent = isLog ? readLogAxisExtent() : null
  logVisibleExtent = null
  logDrag = null
  if (previousZoom) {
    chart.setOption({
      dataZoom: [previousZoom],
      yAxis: { axisLabel: { showMinLabel: false, showMaxLabel: false } }
    }, { silent: true, lazyUpdate: false })
  }
  if (previousLogExtent) applyLogZoom(previousLogExtent)
  // notMerge 整图重建后画布回到无 hover 态，复位粘性标记保持一致
  appliedHoverName = null
  updateYAxisVisibleExtent()
  yAxisZoomTouched.value = Boolean(previousZoom || logVisibleExtent)
  if (isSingleSeriesMode.value) {
    applySingleSeriesMode()
  } else {
    if (isSelectingSeries.value && selectedSeriesName.value) applySeriesSelection()
    scheduleActiveXAxisHighlight(activeXAxisLabel.value)
    renderOverlayGraphics(activeXAxisLabel.value)
  }
}

onMounted(async () => {
  try {
    await ensureChart()
    if (!disposed) renderChart()
  } catch (error) {
    if (disposed) return
    emit('error', error instanceof Error ? error.message : 'Failed to load chart library')
  }
})

watch(
  chartOption,
  (nextOption, previousOption) => {
    // 在重绘前复位轴变更状态，避免旧 dataZoom 被恢复后 tooltip 却按未缩放处理。
    if (nextOption.yAxis.type !== previousOption.yAxis.type) {
      yAxisZoomTouched.value = false
      yAxisVisibleExtent.value = null
      logVisibleExtent = null
    }
    renderChart(true)
  },
  { deep: true }
)

watch(
  () => props.xAxisLabels,
  () => {
    yAxisZoomTouched.value = false
    yAxisVisibleExtent.value = null
    activeXAxisLabel.value = null
    cancelPendingXAxisHighlight()

    if (isSingleSeriesMode.value) {
      applySingleSeriesMode()
      return
    }

    isSelectingSeries.value = false
    selectedSeriesName.value = null
    setTooltipVisibility(true)
    applySeriesSelection()
    scheduleActiveXAxisHighlight(null)
    renderOverlayGraphics(null)
  }
)

watch(
  () => props.series,
  () => {
    if (isSingleSeriesMode.value) {
      applySingleSeriesMode()
      return
    }

    restoreNormalMode()
  },
  { deep: true }
)

onBeforeUnmount(() => {
  disposed = true
  logDrag = null
  chartEl.value?.removeEventListener('wheel', handleLogWheel, true)
  chartEl.value?.removeEventListener('mousedown', handleLogDragStart, true)
  window.removeEventListener('mousemove', handleLogDragMove, true)
  window.removeEventListener('mouseup', handleLogDragEnd, true)
  window.removeEventListener('blur', handleLogDragEnd)
  if (activeXAxisHighlightRaf) {
    window.cancelAnimationFrame(activeXAxisHighlightRaf)
    activeXAxisHighlightRaf = 0
  }
  window.removeEventListener('mouseup', handleGlobalMouseUp)
  window.removeEventListener('blur', handleGlobalMouseUp)
  resizeObserver?.disconnect()
  resizeObserver = null
  chart?.dispose()
  chart = null
})

defineExpose({
  startExternalHold,
  endExternalHold
})
</script>

<style lang="scss">
@use '@/styles/components/efficiency-metric.scss';
</style>
