<template>
  <DynamicHeatmapCard :metric-id="metricId" />
</template>

<script setup lang="ts">
import DynamicHeatmapCard from './DynamicHeatmapCard.vue'
import type { GeneralHeatmapMetric } from '@/constants/general-heatmap-assets'

defineProps<{ metricId: GeneralHeatmapMetric }>()
</script>
