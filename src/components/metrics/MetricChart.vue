<template>
  <div ref="element" class="demo-metric-chart" role="img" :aria-label="label" />
</template>

<script setup lang="ts">
import { BarChart, HeatmapChart, LineChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components'
import { init, use, type ECharts } from 'echarts/core'
import type { EChartsOption } from 'echarts'
import { CanvasRenderer } from 'echarts/renderers'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

// Register only the chart types and features used by the metric views.
// 仅注册指标页实际使用的图表类型和功能，避免加载完整 ECharts 包。
use([
  BarChart,
  HeatmapChart,
  LineChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  VisualMapComponent,
  CanvasRenderer,
])

const props = defineProps<{ option: EChartsOption; label: string }>()
const element = ref<HTMLElement | null>(null)
let chart: ECharts | undefined
let observer: ResizeObserver | undefined
function update() {
  if (chart) chart.setOption(props.option, true)
}
onMounted(async () => {
  await nextTick()
  if (!element.value) return
  chart = init(element.value, undefined, { renderer: 'canvas' })
  update()
  observer = new ResizeObserver(() => chart?.resize())
  observer.observe(element.value)
})
watch(() => props.option, update, { deep: true })
onBeforeUnmount(() => {
  observer?.disconnect()
  chart?.dispose()
})
</script>
