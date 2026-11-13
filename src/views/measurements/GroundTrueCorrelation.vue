<template>
  <div class="metric-detail-page cross-metric-page">
    <header
      class="metric-hero"
      role="banner"
      :aria-labelledby="heroTitleId"
      :aria-describedby="heroDescriptionId"
    >
      <div class="metric-hero__titles">
        <h1 :id="heroTitleId" class="metric-title">{{ displayText(metricInfo.displayName ?? metricInfo.name) }}</h1>
        <p :id="heroDescriptionId" class="metric-description">
          {{ displayText(metricInfo.description) }}
        </p>
      </div>
    </header>

    <section class="metric-heatmaps" role="region" :aria-labelledby="heatmapHeadingId">
      <h2 class="sr-only" :id="heatmapHeadingId"><LocalizedText message="groundTrueCorrelation.srOnly" :values="{ value1: displayText(metricInfo.displayName ?? metricInfo.name) }" /></h2>

      <DynamicHeatmapCard metric-id="ground-truth-correlation" simulation-only />
    </section>
  </div>
</template>

<script setup lang="ts">
import { displayText } from '@/utils/locale'
import LocalizedText from '@/components/common/LocalizedText.vue'
import { getMetricById } from '@/constants/metrics'
import DynamicHeatmapCard from '@/components/measurements/DynamicHeatmapCard.vue'
import { useId } from 'vue'

const metricInfo = getMetricById('ground-truth-correlation')!

const componentId = useId()
const heroTitleId = `${componentId}-metric-title`
const heroDescriptionId = `${componentId}-metric-description`
const heatmapHeadingId = `${componentId}-heatmaps`

</script>
