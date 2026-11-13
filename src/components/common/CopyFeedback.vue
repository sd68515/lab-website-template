<template>
  <span
    class="copy-feedback"
    :class="{ 'copy-feedback--error': state === 'error' }"
    role="status"
    aria-live="polite"
    aria-atomic="true"
  >
    <span :class="{ 'visually-hidden': state !== 'error' }">
      {{ state === 'error' ? text(manualValue ? 'common.copyFailedShort' : 'common.copyFailed') : state === 'success' ? text('common.copied') : '' }}
    </span>
    <code v-if="state === 'error' && manualValue" class="copy-feedback__value" translate="no">{{ manualValue }}</code>
  </span>
</template>

<script setup lang="ts">
import type { ClipboardState } from '@/composables/useClipboardFeedback'
import { text } from '@/utils/locale'

defineProps<{ state: ClipboardState; manualValue?: string }>()
</script>

<style lang="scss">
@use '@/styles/components/copy-feedback.scss';
</style>
