<template>
  <div class="page-wrap info-page">
    <h1>{{ t('Page not found', '页面未找到') }}</h1>
    <p>{{ t('The page you requested does not exist.', '您访问的页面不存在。') }}</p>
    <RouterLink :to="{ name: 'home' }">{{ t('Return to home', '返回首页') }}</RouterLink>
  </div>
</template>

<script setup lang="ts">
import { useLocale } from '@/composables/useLocale'
const { t } = useLocale()
</script>
