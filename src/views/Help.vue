<template>
  <div class="about-layout help-layout"><div class="about-main help-main">
    <article class="about-section help-card" aria-labelledby="help-title">
      <h1 id="help-title" class="about-section-title help-title">{{ text('help.title') }}</h1>
      <div class="help-content">
        <section class="help-section">
          <h2 class="help-section-title">{{ text('help.findResults') }}</h2>
          <p class="help-paragraph">{{ text('help.exampleStart') }}</p>
          <details class="help-details"><summary>{{ text('help.viewByData') }}</summary><div class="help-details__content"><p>{{ text('help.exampleData') }}</p></div></details>
          <details class="help-details"><summary>{{ text('help.viewByTool') }}</summary><div class="help-details__content"><p>{{ text('help.exampleTool') }}</p></div></details>
        </section>
        <section class="help-section">
          <h2 class="help-section-title">{{ text('help.section.readResults') }}</h2>
          <p class="help-paragraph">{{ text('help.exampleResults') }}</p>
          <details class="help-details"><summary>{{ text('help.showCoverageDetails') }}</summary><div class="help-details__content"><p>{{ text('help.exampleCoverage') }}</p></div></details>
        </section>
        <section class="help-section">
          <h2 class="help-section-title">{{ text('help.exampleSettingsTitle') }}</h2>
          <p class="help-paragraph">{{ text('help.exampleSettings') }}</p>
        </section>
      </div>
    </article>
  </div></div>
</template>
<script setup lang="ts">import { text } from '@/utils/locale'</script>
<style lang="scss">@use '@/styles/pages/help.scss';</style>
