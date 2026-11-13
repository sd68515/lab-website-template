<!--
  结果图片占位组件
  根据 PlaceholderDisplay 不同模式展示统一占位文案：
  - metrics: "Out of metric"（灰色）
  - compute: "Unable to compute"（灰色）
  - upload: "Picture not uploaded"（红色）
-->
<template>
  <div
    :class="['result-image-placeholder', `result-image-placeholder--${variant}`]"
    :role="loadError ? 'alert' : undefined"
  >
    <div class="result-image-placeholder__badge">
      {{ displayText(displayMessage) }}
    </div>
    <div v-if="displayReason" class="result-image-placeholder__reason">
      {{ displayText(displayReason) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { PlaceholderDisplay } from '@/types';
import { text, displayText } from '@/utils/locale';
import { getDefaultPlaceholderMessage } from '@/utils/result';

const props = defineProps<{
  // 允许父组件传入 null，表示“尚无占位信息”
  placeholder: PlaceholderDisplay | null;
  loadError?: boolean;
}>();

// 优先保留显式说明；缺少信息时显示未知状态。
const displayMessage = computed(() => {
  if (props.loadError) return text('preview.loadFailed');
  const placeholder = props.placeholder;

  // 无状态证据时不能推断待交付、未上传或科研失败。
  if (!placeholder) {
    return getDefaultPlaceholderMessage('unknown');
  }

  if (placeholder.mode === 'compute') return 'Unable to compute';
  if (placeholder.mode === 'pending') return getDefaultPlaceholderMessage('pending');

  if (placeholder.message) {
    return placeholder.message;
  }

  return getDefaultPlaceholderMessage(placeholder.mode);
});

const displayReason = computed(() => {
  if (props.loadError) return '';
  const placeholder = props.placeholder;
  if (placeholder?.mode === 'metric') return placeholder.reason || '';
  if (placeholder?.mode !== 'compute') return '';
  return placeholder.reason || (placeholder.message && placeholder.message !== 'Unable to compute' ? placeholder.message : '');
});

const variant = computed(() => {
  if (props.loadError) return 'error';
  if (props.placeholder?.mode === 'pending') return 'upload';
  return props.placeholder?.mode ?? 'unknown';
});
</script>

<style lang="scss">
@use '@/styles/components/result-image-placeholder.scss';
</style>
