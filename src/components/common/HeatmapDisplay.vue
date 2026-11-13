<!--
  热图展示通用组件
  用于展示热图图片，支持加载状态、错误处理和占位图
-->
<template>
  <div
    class="heatmap-display"
    :class="{ 'heatmap-display--compact-placeholder': isCompactPlaceholder }"
  >
    <!-- 热图标题（可选） -->
    <h4 v-if="title" class="heatmap-display__title">{{ displayText(title) }}</h4>

    <!-- 热图描述（可选） -->
    <p v-if="description" class="heatmap-display__description">{{ displayText(description) }}</p>

    <!-- 热图图片容器 -->
    <div
      class="heatmap-display__wrapper"
      :class="{
        'heatmap-display__wrapper--compact': isCompactPlaceholder,
        'heatmap-display__wrapper--status': loading || error || uploadPending || !src
      }"
    >
      <!-- 图片未上传占位符（优先级最高） -->
      <div v-if="uploadPending" class="heatmap-display__upload-pending">
        <div class="heatmap-display__upload-pending-content">
          <p class="heatmap-display__upload-pending-text">{{ text('heatmapDisplay.pictureNotUploaded') }}</p>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-else-if="loading" class="heatmap-display__loading">
        <StatusMessage state="loading" :title="text('heatmapDisplay.loading')" :description="text('heatmapDisplay.loadingHeatmap')" />
      </div>

      <LoadingResultImage
        v-else-if="src"
        :key="src"
        :src="src"
        :alt="alt || title || text('heatmapDisplay.heatmap')"
        :width="imageWidth"
        :height="imageHeight"
        class="heatmap-display__image"
        @load="handleLoad"
        @error="handleError"
      />

      <!-- 无图片占位 -->
      <div v-else class="heatmap-display__placeholder">
        <StatusMessage
          state="empty"
          :title="text('heatmapDisplay.noData')"
          :description="text('heatmapDisplay.noHeatmapDataAvailable')"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { text, displayText } from '@/utils/locale'
import { computed, ref, watch } from 'vue'
import LoadingResultImage from './LoadingResultImage.vue'
import StatusMessage from './StatusMessage.vue'

// Props：组件属性定义
// src：图片源地址（必需）
// alt：图片替代文本
// title：热图标题
// description：热图描述
// loading：是否显示加载状态
// errorMessage：自定义错误提示信息
// uploadPending：图片是否未上传（显示红色 "Picture not uploaded"）
const props = defineProps<{
  src?: string
  alt?: string
  title?: string
  description?: string
  loading?: boolean
  errorMessage?: string
  uploadPending?: boolean
  imageWidth?: number
  imageHeight?: number
}>()

// Emits：组件事件定义
// load：图片加载完成时触发
// error：图片加载失败时触发
const emit = defineEmits<{
  load: []
  error: [error: Event]
}>()

// 内部状态
const error = ref(false)

const isCompactPlaceholder = computed(() => Boolean(props.uploadPending) || error.value)

// 图片源更新时重置错误状态，确保切换数据集后重新加载
watch(
  () => props.src,
  () => {
    error.value = false
  }
)

// 图片加载成功处理
const handleLoad = () => {
  error.value = false
  emit('load')
}

// 图片加载失败处理
const handleError = (e: Event) => {
  error.value = true
  emit('error', e)
}
</script>

<style lang="scss">
@use '@/styles/components/heatmap-display.scss';
</style>
