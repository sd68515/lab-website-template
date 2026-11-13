<template>
  <section class="about-section about-section--download">
    <h1 class="about-section-title">{{ text('download.resources') }}</h1>
    <div class="about-content about-content--download">
      <div class="about-download-actions">
        <div v-for="label in [text('download.exampleData'), text('download.exampleResults')]" :key="label" class="about-download-resource">
          <div class="about-download-link"><div class="about-download-link__info"><span class="about-download-link__text">
            <span class="about-download-link__title">{{ label }}</span>
            <span class="about-download-link__description">{{ text('download.notConfigured') }}</span>
          </span></div></div>
        </div>
      </div>
      <p class="about-download-intro">{{ text('download.configureHint') }}</p>
    </div>
  </section>
  <section class="about-section about-section--download">
    <h2 class="about-section-title">{{ text('download.exampleRepository') }}</h2>
    <div class="about-content"><p>{{ text('download.notConfigured') }}</p></div>
  </section>
</template>
<script setup lang="ts">import { text } from '@/utils/locale'</script>
