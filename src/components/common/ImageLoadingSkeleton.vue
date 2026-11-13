<template>
  <div class="image-loading-skeleton" role="status" aria-busy="true">
    <span class="visually-hidden">{{ text('common.loading') }}</span>
  </div>
</template>

<script setup lang="ts">
import { text } from '@/utils/locale'
</script>

<style lang="scss">
@use '@/styles/components/image-loading-skeleton.scss';
</style>
