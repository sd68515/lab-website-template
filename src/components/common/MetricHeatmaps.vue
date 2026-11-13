<!--
  MetricHeatmaps 组件
  - 用于展示单个指标类别下的聚合热图（伪子图）
  - 输入 MetricCategorySection，内部根据占位符决定显示图片或缺失提示
-->
<template>
  <section class="metric-heatmaps">
    <h3 v-if="showTitle" class="heatmap-title">
      {{ displayText(getMetricDisplayName(title || metric.category)) }}
    </h3>

    <!-- 区域级占位符：整个指标在当前上下文下不适用或无法计算 -->
    <div v-if="sectionPlaceholder" class="metric-heatmaps__placeholder">
      <ResultImagePlaceholder :placeholder="sectionPlaceholder" />
    </div>

    <!-- 图片网格：伪子图聚合展示 -->
    <div
      v-else
      class="dataset-result-metric-images"
      :class="{ 'dataset-result-metric-images--placeholder': hasPlaceholderImages }"
    >
      <div
        v-for="(image, index) in metric.images"
        :key="resolveImageKey(image, index)"
        class="metric-image"
        :class="{
          'metric-image--previewable': isPreviewable(image, index),
          'metric-image--consistency': isConsistencyScoreMetric,
          'metric-image--placeholder': hasImagePlaceholder(image, index)
        }"
        :role="isPreviewable(image, index) ? 'button' : undefined"
        :tabindex="isPreviewable(image, index) ? 0 : undefined"
        :aria-label="isPreviewable(image, index) ? text('metricHeatmaps.openPreviewForValue1', { value1: String(resolveAlt(image)) }) : undefined"
        @click="openPreview(image, index)"
        @keydown.enter.prevent="openPreview(image, index)"
        @keydown.space.prevent="openPreview(image, index)"
      >
        <!-- 若该图片存在占位符或加载失败，则展示占位组件 -->
        <ResultImagePlaceholder
          v-if="hasImagePlaceholder(image, index)"
          :placeholder="image.placeholder"
          :load-error="!image.placeholder"
        />

        <!-- 热图共用区域标题，避免为每张伪子图单独显示标题 -->
        <HeatmapDisplay
          v-else
          :src="image.imageUrl"
          :alt="resolveAlt(image)"
          @load="handleLoad(image, index)"
          @error="handleError(image, index)"
        />
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
import ResultImagePreview from '@/components/common/ResultImagePreview.vue';
import ResultImagePlaceholder from '@/components/common/ResultImagePlaceholder.vue';
import type { MetricCategorySection, MetricImageEntry } from '@/types';
import type { PlaceholderDisplay } from '@/types';

const props = withDefaults(
  defineProps<{
    metric: MetricCategorySection;
    title?: string;
    showTitle?: boolean;
  }>(),
  {
    showTitle: true
  }
);

const showTitle = computed(() => props.showTitle);
const isConsistencyScoreMetric = computed(
  () => props.metric.category.trim().toLowerCase() === 'consistency score'
);

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
</script>
