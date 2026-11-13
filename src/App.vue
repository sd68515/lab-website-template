<!--
  应用根组件
  渲染路由视图，所有页面通过 Vue Router 在此处切换
-->
<template>
  <v-app :theme="name">
    <AppShell />
  </v-app>
</template>

<script setup lang="ts">
import AppShell from '@/components/AppShell.vue'
import { useAppearance } from '@/composables/useAppearance'

const { name } = useAppearance()
</script>
