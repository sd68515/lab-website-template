<!--
  指标缺失占位组件
  用于展示指标数据缺失的状态，显示缺失原因
-->
<template>
  <div class="missing-metric-placeholder">
    <!-- 图标区域 -->
    <div class="missing-metric-placeholder__icon">
      <v-icon
        :size="32"
        class="missing-metric-placeholder__icon-symbol"
        icon="$mdi-alert-circle-outline"
      />
    </div>

    <!-- 内容区域 -->
    <div class="missing-metric-placeholder__content">
      <!-- 标题 -->
      <h4 class="missing-metric-placeholder__title">
        {{ displayText(title || 'Metric data missing') }}
      </h4>

      <!-- 缺失原因 -->
      <p
        v-if="reason"
        :class="[
          'missing-metric-placeholder__reason',
          `missing-metric-placeholder__reason--${reasonType}`
        ]"
      >
        {{ displayText(reasonText) }}
      </p>

      <!-- 自定义描述 -->
      <p v-if="description" class="missing-metric-placeholder__description">
        {{ displayText(description) }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { displayText } from '@/utils/locale'
import { getDefaultPlaceholderMessage } from '@/utils/result'
import { computed } from 'vue'
import type { MissingReason } from '@/constants/measurement-missing'

// Props：组件属性定义
// reason：缺失原因类型（'Out of metric'）
// title：占位标题（可选，默认为"Metric data missing"）
// description：额外描述信息（可选）
const props = defineProps<{
  reason?: MissingReason
  title?: string
  description?: string
}>()

// 计算属性：根据 reason 类型返回对应的文本
const reasonText = computed(() => {
  if (!props.reason) return ''

  const reasonMap: Record<MissingReason, string> = {
    'Out of metric': 'Out of metric',
    'Unable to compute': 'Unable to compute',
    Pending: getDefaultPlaceholderMessage('pending')
  }

  return reasonMap[props.reason] || props.reason
})

// 计算属性：根据 reason 类型返回样式类型
const reasonType = computed(() => {
  if (!props.reason) return 'default'

  const typeMap: Record<MissingReason, string> = {
    'Out of metric': 'out-of-metric',
    'Unable to compute': 'default',
    Pending: 'default'
  }

  return typeMap[props.reason] || 'default'
})
</script>

<style lang="scss">
@use '@/styles/components/missing-metric-placeholder.scss';
</style>
