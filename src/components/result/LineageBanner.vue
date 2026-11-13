<template>
  <transition name="dataset-lineage-banner">
    <div
      v-if="visible && text"
      :ref="bannerRef"
      class="dataset-lineage-banner"
    >
      <span class="dataset-lineage-banner-label">{{ translate('lineageBanner.lineage') }}</span>
      <span class="dataset-lineage-banner-value">{{ text }}</span>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { text as translate } from '@/utils/locale'
import type { Ref } from 'vue'

defineProps<{
  visible: boolean
  text: string
  bannerRef?: Ref<HTMLElement | null>
}>()
</script>
