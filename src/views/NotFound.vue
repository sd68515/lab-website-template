<!--
  404 页面（Vuetify 版）
-->
<template>
  <div class="not-found-layout">
    <div class="not-found-main">
      <div class="not-found-container">
        <div class="not-found-icon">
          <v-icon icon="$mdi-compass-off-outline" size="96" class="not-found-icon-symbol" />
        </div>

        <h1 class="not-found-title">{{ text('notFound.404PageNotFound') }}</h1>
        <p class="not-found-description">{{ text('notFound.weReSorryButWeCouldnT') }}</p>

        <v-btn
          class="not-found-button"
          variant="flat"
          :prepend-icon="mdiArrowLeft"
          rounded="app"
          :height="52"
          to="/"
        > {{ text('notFound.backToHome') }} </v-btn>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { text } from '@/utils/locale'
import { mdiArrowLeft } from '@mdi/js'
</script>

<style scoped lang="scss">
@use '@/styles/components/interaction' as interaction;

.not-found-layout {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--color-surface);
}

.not-found-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.not-found-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  text-align: center;
  max-width: 720px;
  font-family: var(--font-family-ui);
}

.not-found-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.not-found-icon-symbol {
  color: var(--color-accent);
}

.not-found-title {
  font-size: var(--font-size-page);
  font-weight: 700;
  font-family: var(--font-family-editorial);
  color: var(--color-accent);
  line-height: 1.2;
  margin: 0;
}

.not-found-description {
  font-size: var(--font-size-body);
  font-weight: 400;
  font-family: var(--font-family-ui);
  color: var(--text-body-color);
  line-height: 1.5;
  margin: 0;
}

.not-found-button {
  @include interaction.primary-action;
  margin-top: 8px;
  letter-spacing: normal;
  font-family: var(--font-family-ui);
  font-size: 18px;
  border-radius: var(--app-border-radius);
  padding: 12px 28px;
  min-height: 48px;
  line-height: 1.2;

  // 使用 :deep() 穿透到 Vuetify 按钮内容
  :deep(.v-btn__content) {
    font-family: var(--font-family-ui);
    font-size: 18px;
    line-height: 1.2;
  }
}

@media (max-width: 767px) {
  .not-found-main {
    padding: 24px 16px;
  }

  .not-found-container {
    gap: 16px;
  }

  .not-found-title {
    font-size: 32px;
  }

  .not-found-icon-symbol {
    font-size: 72px !important;
  }
}
</style>
