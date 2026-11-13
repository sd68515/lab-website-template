<!--
  EfficiencyLegend
  图例组件：显示当前图表中有数据的工具列表
  - 动态显示当前图表上已有折线的工具数量
  - 圆点（对应工具颜色）+ 工具名
  - 每个圆点+工具名是一个精致的 12px 圆角矩形卡片
-->
<template>
  <div class="efficiency-legend">
    <div class="efficiency-legend__items">
      <button
        v-for="item in legendItems"
        :key="item.name"
        type="button"
        :class="[
          'efficiency-legend__item',
          { 'efficiency-legend__item--highlighted': highlightedToolName === item.name }
        ]"
        :aria-pressed="highlightedToolName === item.name"
        :aria-label="text('efficiencyLegend.value1MeanValue2', { value1: String(item.label), value2: String(item.meanText) })"
        @mousedown="handleItemMouseDown($event, item.name)"
        @click="handleItemClick($event, item.name)"
        @keydown.enter.prevent="handleItemKeyDown(item.name)"
        @keydown.space.prevent="handleItemKeyDown(item.name)"
        @keyup.enter.prevent="emit('holdEnd')"
        @keyup.space.prevent="emit('holdEnd')"
        @blur="emit('holdEnd')"
      >
        <span
          class="efficiency-legend__dot"
          :style="{ backgroundColor: item.color }"
        />
        <span class="efficiency-legend__label">{{ displayText(item.label) }}</span>
        <span
          class="efficiency-legend__tooltip"
          aria-hidden="true"
        > {{ text('efficiencyLegend.mean') }} {{ item.meanText }}
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts" generic="ToolName extends string">
import { formatNumber, text, displayText } from '@/utils/locale'
import { computed } from 'vue'
import { getToolPublicName } from '@/constants/tools'
import { getToolColor } from '@/constants/toolColors'

type SeriesItem = {
  name: ToolName
  color: string
  values: Array<number | null>
}

const props = defineProps<{
  series: SeriesItem[]
  unit?: string
  decimals: number
  sortDirection?: 'asc' | 'desc'
  highlightedToolName?: ToolName | null
}>()

const emit = defineEmits<{
  holdStart: [toolName: ToolName]
  holdEnd: []
}>()

function computeMean(values: Array<number | null>): number | null {
  const valid = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  if (valid.length === 0) return null
  const sum = valid.reduce((a, b) => a + b, 0)
  return sum / valid.length
}

function formatMean(mean: number | null): string {
  if (mean === null) return 'NA'
  if (!props.unit) return formatNumber(mean, { minimumFractionDigits: props.decimals, maximumFractionDigits: props.decimals })
  return `${formatNumber(mean, { minimumFractionDigits: props.decimals, maximumFractionDigits: props.decimals })} ${props.unit}`
}

function handleItemMouseDown(event: MouseEvent, toolName: ToolName) {
  if (event.button !== 0) return
  emit('holdStart', toolName)
}

function handleItemKeyDown(toolName: ToolName) {
  emit('holdStart', toolName)
}

function handleItemClick(event: MouseEvent, toolName: ToolName) {
  // Assistive activation sends a click without the pointer/key hold sequence.
  if (event.detail !== 0) return
  if (props.highlightedToolName === toolName) emit('holdEnd')
  else emit('holdStart', toolName)
}

const legendItems = computed(() => {
  const direction = props.sortDirection ?? 'asc'
  return props.series
    .map((item) => {
      const mean = computeMean(item.values)
      return {
        name: item.name,
        label: getToolPublicName(item.name),
        color: getToolColor(item.name),
        mean,
        meanText: formatMean(mean)
      }
    })
    .sort((a, b) => {
      if (a.mean === null && b.mean === null) return 0
      if (a.mean === null) return 1
      if (b.mean === null) return -1
      const diff = a.mean - b.mean
      return direction === 'asc' ? diff : -diff
    })
})
</script>

<style lang="scss">
.efficiency-legend {
  width: 100%;
  padding: 10px 0 12px;
}

.efficiency-legend__items {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.efficiency-legend__item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--app-border-radius);
  font-family: var(--font-family-ui);
  font-size: 14px;
  font-weight: 400;
  line-height: 1.3;
  color: var(--text-body-soft);
  transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
  position: relative;
  outline: none;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;

  &:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  &:hover {
    background: var(--color-surface-muted-strong);
    border-color: var(--color-border);
  }

  &:hover .efficiency-legend__tooltip,
  &:focus-visible .efficiency-legend__tooltip {
    opacity: 1;
    transform: translate(-50%, 0);
    visibility: visible;
  }

  &--highlighted {
    background: var(--warning-surface-color);
    border-color: var(--warning-border-color);
    box-shadow: 0 0 0 2px var(--warning-border-color);
    font-weight: 600;

    &:hover {
      background: var(--warning-surface-color);
    }
  }
}

.efficiency-legend__dot {
  flex-shrink: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

html[data-theme='dark'] .efficiency-legend__dot {
  box-shadow: 0 0 0 1px var(--text-body-color);
}

.efficiency-legend__label {
  white-space: nowrap;
}

.efficiency-legend__tooltip {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 10px);
  transform: translate(-50%, 4px);
  padding: 6px 10px;
  border-radius: var(--app-border-radius);
  background: rgba(var(--v-theme-surface), 0.98);
  border: 1px solid var(--color-border-subtle);
  box-shadow: 0 8px 20px rgba(var(--v-theme-shadow), 0.12);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-body-soft);
  white-space: nowrap;
  z-index: 5;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.15s ease, transform 0.15s ease, visibility 0.15s ease;

  &::before {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border-style: solid;
    border-width: 7px 7px 0 7px;
    border-color: var(--color-border-subtle) transparent transparent transparent;
  }

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border-style: solid;
    border-width: 6px 6px 0 6px;
    border-color: rgba(var(--v-theme-surface), 0.98) transparent transparent transparent;
  }
}

@media (max-width: 768px) {
  .efficiency-legend {
    padding: 8px 0 10px;
  }

  .efficiency-legend__items {
    gap: 6px;
  }

  .efficiency-legend__item {
    padding: 5px 10px;
    font-size: 13px;
    border-radius: var(--app-border-radius);
  }

  .efficiency-legend__dot {
    width: 8px;
    height: 8px;
  }
}
</style>
