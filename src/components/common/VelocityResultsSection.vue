<!--
  Velocity 结果展示部分组件
  用于在数据集/方法结果页面中展示速度向量相关的可视化图表
-->
<template>
  <!-- 结果展示区域：当有内容或占位符时显示 -->
  <section v-if="hasContent" class="dataset-result-velocity-section">
    <!-- 区域标题 -->
    <h3 class="dataset-result-section-title">{{ displayText(title) }}</h3>

    <!-- 区域级占位符：整个 velocity 区域不适用或无法计算 -->
    <div v-if="sectionPlaceholder" class="dataset-result-section-message">
      <ResultImagePlaceholder :placeholder="sectionPlaceholder" />
    </div>

    <!-- 结果网格：展示速度向量可视化图表 -->
    <div
      v-else
      class="dataset-result-velocity-grid"
      :class="{
        'dataset-result-velocity-grid--single': results.length === 1,
        'dataset-result-velocity-grid--triple': results.length === 3
      }"
    >
      <!-- 结果项：每个工具或数据集的速度向量图片 -->
      <div
        v-for="(result, index) in results"
        :key="resolveResultKey(result, index)"
        class="dataset-result-velocity-item"
      >
        <!-- 结果标题：显示工具名或数据集ID -->
        <h4 class="dataset-result-velocity-item-title">{{ displayText(result.label) }}</h4>

        <!-- 单项占位符：根据 PlaceholderDisplay 显示 Out of metric / Unable to compute / Picture not uploaded -->
        <ResultImagePlaceholder
          v-if="result.placeholder"
          :placeholder="result.placeholder"
        />

        <!-- 正常图片：点击打开 ResultImagePreview 预览 -->
        <LoadingResultImage
          v-else
          :src="result.imageUrl"
          :alt="resolveAltText(result) || result.label"
          class="dataset-result-velocity-image"
          role="button"
          tabindex="0"
          :aria-label="text('velocityResultsSection.openPreviewForValue1', { value1: String(resolveAltText(result) || result.label) })"
          @load="handleLoad(result)"
          @error="handleError(result)"
          @click="openPreview(result)"
          @keydown.enter.prevent="openPreview(result)"
          @keydown.space.prevent="openPreview(result)"
        />
      </div>
    </div>

    <!-- 图片预览 Overlay -->
    <ResultImagePreview
      v-if="preview"
      :src="preview.src"
      :alt="preview.alt"
      :placeholder="preview.placeholder"
      @close="closePreview"
    />
  </section>
</template>

<script setup lang="ts">
import { text, displayText } from '@/utils/locale'
import { computed, isRef, ref } from 'vue';
import LoadingResultImage from '@/components/common/LoadingResultImage.vue';
import ResultImagePlaceholder from '@/components/common/ResultImagePlaceholder.vue';
import ResultImagePreview from '@/components/common/ResultImagePreview.vue';
import type { PlaceholderDisplay, VelocityResultEntry } from '@/types';

// Velocity 结果类型：复用通用结果类型定义
type VelocityResult = VelocityResultEntry;

// 占位符属性类型：支持直接对象或 Ref 包装，兼容 DatasetResult/MethodResult 传入的值
type PlaceholderProp =
  | PlaceholderDisplay
  | null
  | undefined
  | { value: PlaceholderDisplay | null | undefined };

// 组件属性接口
interface Props {
  // 结果数据数组：包含所有要展示的速度向量结果
  results: VelocityResult[];
  // 占位符信息：在加载、空、错误等状态时显示
  placeholder?: PlaceholderProp;
  // 区域标题：默认为 'Velocity results'
  title?: string;
  // 自定义键生成函数：用于生成结果项的唯一键
  getResultKey?: (result: VelocityResult, index: number) => string | number;
  // 自定义 alt 文本获取函数：用于生成图片的 alt 属性
  getResultAlt?: (result: VelocityResult) => string | null | undefined;
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Velocity results'
});

// 事件定义
const emit = defineEmits<{
  // 图片加载成功事件
  (event: 'image-load', result: VelocityResult): void;
  // 图片加载失败事件
  (event: 'image-error', result: VelocityResult): void;
}>();

// 区域级占位符：解析 PlaceholderDisplay 或 Ref 包装
const sectionPlaceholder = computed<PlaceholderDisplay | null>(() => {
  const placeholder = props.placeholder as PlaceholderProp | undefined;
  if (!placeholder) {
    return null;
  }
  if (isRef(placeholder)) {
    return (placeholder.value as PlaceholderDisplay | null | undefined) ?? null;
  }
  return (placeholder as PlaceholderDisplay | null | undefined) ?? null;
});

// 是否有内容显示：当有占位符或结果时返回 true
const hasContent = computed(() => Boolean(sectionPlaceholder.value || props.results.length));

// 解析结果键：优先使用自定义函数，否则使用索引
const resolveResultKey = (result: VelocityResult, index: number) => {
  if (props.getResultKey) {
    return props.getResultKey(result, index);
  }
  return index;
};

// 解析 alt 文本：优先使用自定义函数，然后查找 result.alt，否则返回 null
const resolveAltText = (result: VelocityResult) => {
  if (props.getResultAlt) {
    return props.getResultAlt(result);
  }
  if ('alt' in result && typeof result.alt === 'string') {
    return result.alt;
  }
  return null;
};

// 处理图片加载成功：发出 image-load 事件
const handleLoad = (result: VelocityResult) => {
  emit('image-load', result);
};

// 处理图片加载失败：发出 image-error 事件
const handleError = (result: VelocityResult) => {
  emit('image-error', result);
};

// 图片预览状态
const preview = ref<{
  src: string;
  alt: string;
  placeholder: PlaceholderDisplay | null;
} | null>(null);

// 打开预览 Overlay
const openPreview = (result: VelocityResult) => {
  if (!result.imageUrl || result.status !== 'loaded') return;
  preview.value = {
    src: result.imageUrl,
    alt: resolveAltText(result) || result.label,
    placeholder: null
  };
};

// 关闭预览 Overlay
const closePreview = () => {
  preview.value = null;
};
</script>
