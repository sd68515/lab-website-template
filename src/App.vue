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
