<!--
  MetricSubplotDisplay 组件
  - 用于展示单个指标类别下的真子图（工具-数据子图）
  - measurement-missing 产生的占位符通过 PlaceholderDisplay 统一展示
-->
<template>
  <section class="metric-subplot">
    <!-- 在 DatasetResult / MethodResult 中，使用轻量容器，仅承载子图区域 -->
    <div class="metric-subplot-card">
      <!-- 子图展示区域 -->
      <div class="subplot-display-viewport">
        <!-- 区域级占位符：整个指标在当前上下文下不适用或无法计算 -->
        <div v-if="sectionPlaceholder" class="subplot-display__placeholder">
          <ResultImagePlaceholder :placeholder="sectionPlaceholder" />
        </div>

        <!-- 若无图片且无占位符，显示空状态 -->
        <div
          v-else-if="!metric.images.length"
          class="subplot-display__placeholder"
        >
          <StatusMessage
            state="empty"
            :title="text('metricSubplotDisplay.noData')"
            :description="text('metricSubplotDisplay.noSubplotDataAvailableForThisMetric')"
          />
        </div>

        <!-- 有图片时，逐个展示子图或占位 -->
        <div
          v-else
          class="dataset-result-metric-images"
          :class="{ 'dataset-result-metric-images--placeholder': hasPlaceholderImages }"
        >
          <div
            v-for="(image, index) in metric.images"
            :key="resolveImageKey(image, index)"
            class="metric-image metric-image--subplot"
            :class="{
              'metric-image--previewable': isPreviewable(image, index),
              'metric-image--placeholder': hasImagePlaceholder(image, index)
            }"
            :role="isPreviewable(image, index) ? 'button' : undefined"
            :tabindex="isPreviewable(image, index) ? 0 : undefined"
            :aria-label="isPreviewable(image, index) ? text('metricSubplotDisplay.openPreviewForValue1', { value1: String(resolveAlt(image)) }) : undefined"
            @click="openPreview(image, index)"
            @keydown.enter.prevent="openPreview(image, index)"
            @keydown.space.prevent="openPreview(image, index)"
          >
            <!-- measurement-missing 产生的占位符，或实际图片请求失败 -->
            <ResultImagePlaceholder
              v-if="hasImagePlaceholder(image, index)"
              :placeholder="image.placeholder"
              :load-error="!image.placeholder"
            />

            <!-- 真子图共用区域标题，避免为每张图片单独显示标题 -->
            <HeatmapDisplay
              v-else
              :src="image.imageUrl"
              :alt="resolveAlt(image)"
              @load="handleLoad(image, index)"
              @error="handleError(image, index)"
            />
          </div>
        </div>
      </div>
    </div>
    <ResultImagePreview
      v-if="preview"
      :src="preview.src"
      :alt="preview.alt"
      @close="closePreview"
    />
  </section>
</template>

<script setup lang="ts">
import { text, displayText } from '@/utils/locale'
import { getMetricDisplayName } from '@/constants/metrics';
import { computed, ref, watch } from 'vue';
import HeatmapDisplay from '@/components/common/HeatmapDisplay.vue';
import ResultImagePlaceholder from '@/components/common/ResultImagePlaceholder.vue';
import StatusMessage from '@/components/common/StatusMessage.vue';
import ResultImagePreview from '@/components/common/ResultImagePreview.vue';
import type { MetricCategorySection, MetricImageEntry } from '@/types';
import type { PlaceholderDisplay } from '@/types';

const props = defineProps<{
  metric: MetricCategorySection;
}>();

const emit = defineEmits<{
  (e: 'image-load', image: MetricImageEntry): void;
  (e: 'image-error', image: MetricImageEntry): void;
}>();

const sectionPlaceholder = computed<PlaceholderDisplay | null>(() => props.metric.placeholder ?? null);
const imageErrorKeys = ref<Set<string>>(new Set());
const loadedImageKeys = ref<Set<string>>(new Set());
// Keep runtime state scoped to the current entries, including removal and revisit.
watch(() => [props.metric.category, ...props.metric.images], () => {
  const keys = new Set(props.metric.images.map(resolveImageKey));
  imageErrorKeys.value = new Set([...imageErrorKeys.value].filter(key => keys.has(key)));
  loadedImageKeys.value = new Set([...loadedImageKeys.value].filter(key => keys.has(key)));
});
const hasPlaceholderImages = computed(() => {
  return props.metric.images.some((image, index) => hasImagePlaceholder(image, index));
});
const preview = ref<{ src: string; alt: string } | null>(null);

const resolveImageKey = (image: MetricImageEntry, index: number) => {
  return `${props.metric.category}-${image.imageUrl || `${image.name}-${image.shortName}-${index}`}`;
};

const resolveAlt = (image: MetricImageEntry): string => {
  if (image.shortName) {
    return `${displayText(getMetricDisplayName(props.metric.category))} - ${image.shortName}`;
  }
  return displayText(getMetricDisplayName(image.name || props.metric.category));
};

const hasImagePlaceholder = (image: MetricImageEntry, index: number): boolean => {
  return Boolean(image.placeholder || imageErrorKeys.value.has(resolveImageKey(image, index)));
};

const isPreviewable = (image: MetricImageEntry, index: number) => {
  const key = resolveImageKey(image, index);
  return Boolean(image.imageUrl && !image.placeholder && loadedImageKeys.value.has(key) && !imageErrorKeys.value.has(key));
};

const openPreview = (image: MetricImageEntry, index: number) => {
  if (!isPreviewable(image, index)) {
    return;
  }
  preview.value = {
    src: image.imageUrl!,
    alt: resolveAlt(image)
  };
};

const closePreview = () => {
  preview.value = null;
};

const handleLoad = (image: MetricImageEntry, index: number) => {
  const key = resolveImageKey(image, index);
  if (imageErrorKeys.value.has(key)) {
    const nextErrors = new Set(imageErrorKeys.value);
    nextErrors.delete(key);
    imageErrorKeys.value = nextErrors;
  }
  const nextLoaded = new Set(loadedImageKeys.value);
  nextLoaded.add(key);
  loadedImageKeys.value = nextLoaded;
  emit('image-load', image);
};

const handleError = (image: MetricImageEntry, index: number) => {
  const key = resolveImageKey(image, index);
  const nextErrors = new Set(imageErrorKeys.value);
  nextErrors.add(key);
  imageErrorKeys.value = nextErrors;
  if (loadedImageKeys.value.has(key)) {
    const nextLoaded = new Set(loadedImageKeys.value);
    nextLoaded.delete(key);
    loadedImageKeys.value = nextLoaded;
  }
  emit('image-error', image);
};
// 样式在单独的 SCSS 文件中定义
</script>

<style lang="scss">
@use '@/styles/components/metric-subplot-display.scss';
</style>
