<template>
  <div class="demo-result-card__visual" :class="{ 'demo-result-card__visual--error': showError }">
    <img v-if="src && !showError" :key="attempt" :src="src" :alt="alt" @error="failed = true">
    <template v-else>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 5h16v14H4zM4 16l5-5 4 4 2-2 5 5M16 9h.01" />
      </svg>
      <strong>{{ showError ? t('Image failed to load', '图片加载失败') : t('Image not yet added', '图片尚未添加') }}</strong>
      <span v-if="demoFailure">{{ t('Failure state example; no image was requested.', '失败状态示例；未请求图片。') }}</span>
      <span v-else-if="failed">{{ t('Check the image path, then try again.', '请检查图片路径后重试。') }}</span>
      <span v-else>{{ t('Add a result image to display it here.', '添加结果图片后将在此处显示。') }}</span>
      <button v-if="failed && !demoFailure" type="button" @click="retry">{{ t('Try again', '重试') }}</button>
    </template>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useLocale } from '@/composables/useLocale'

const props = withDefaults(defineProps<{ src?: string; alt: string; demoFailure?: boolean }>(), {
  src: '',
  demoFailure: false
})
const { t } = useLocale()
const failed = ref(false)
const attempt = ref(0)
const showError = computed(() => failed.value || props.demoFailure)

// A changed URL represents a fresh image; retries recreate the img element.
// URL 改变时重置状态；重试时重新创建 img 元素。
watch(() => props.src, () => { failed.value = false })
function retry() {
  failed.value = false
  attempt.value += 1
}
</script>
