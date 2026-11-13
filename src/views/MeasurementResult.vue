<!--
  指标页面布局容器
  为所有指标详情页提供统一的页面框架，包含顶部导航栏、二级导航栏和页脚
-->
<template>
  <div class="measurement-layout">
    <!-- 指标二级导航 -->
    <div class="metric-sub-wrapper">
      <MetricSubNav />
    </div>

    <!-- 主内容区域：渲染各个指标详情页 -->
    <div class="measurement-main">
      <router-view />
    </div>

    <button
      v-if="shouldShowBackToTopButton"
      class="dataset-result-back-top measurement-back-top"
      :class="{ visible: showBackToTop }"
      type="button"
      :title="text('measurementResult.backToTop')"
      :aria-label="text('measurementResult.backToTop2')"
      @click="scrollToTop"
    >
      <span class="dataset-result-back-top-icon">↑</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { text } from '@/utils/locale'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import MetricSubNav from '@/components/common/MetricSubNav.vue'
import { useScrollContainer } from '@/composables/useScrollContainer'
import { MEASUREMENT_GENERAL_METRICS_PATHS, MEASUREMENT_SIMULATION_PATHS, PATHS } from '@/constants/paths'

const route = useRoute()
const scrollContainer = useScrollContainer()

const BACK_TO_TOP_THRESHOLD = 120

const showBackToTop = computed(() => scrollContainer.scrollTop.value > BACK_TO_TOP_THRESHOLD)

function scrollToTop(): void {
  scrollContainer.scrollToTop('auto')
}

const isUsabilityRoute = (path: string | undefined): boolean => {
  if (typeof path !== 'string') {
    return false
  }
  return (
    path === MEASUREMENT_GENERAL_METRICS_PATHS.USABILITY
  )
}

const isUsability = computed(() => isUsabilityRoute(route.path))

const isSimulationRoute = computed(() => route.path.startsWith(`${PATHS.SIMULATION_BASE}/`))

const isGroundTruthCorrelationRoute = computed(() =>
  route.path === MEASUREMENT_SIMULATION_PATHS.GROUND_TRUTH_CORRELATION
)

// simulation 指标页只保留 Ground-truth correlation 的回到顶部按钮，其他 simulation 页内容较短无需显示
const shouldShowBackToTopButton = computed(() => {
  if (isUsability.value) return false
  if (isSimulationRoute.value) return isGroundTruthCorrelationRoute.value
  return true
})
</script>

<style lang="scss">
@use '@/styles/variables.scss' as vars;
@use '@/styles/components/back-to-top.scss';
@use '@/styles/components/result-shared.scss';
@use '@/styles/components/metric-results.scss';
@use '@/styles/pages/measurement-result.scss';

// 指标页面布局容器
.measurement-layout {
  width: 100%;
  min-height: 100%;
  background-color: var(--color-surface);
}

// 全局头部：包含顶部导航和二级导航
.measurement-layout .global-header {
  padding: 0;
  height: auto;
  background-color: var(--color-accent);
}

.metric-sub-wrapper {
  position: relative;
  width: 100%;
}

// 主内容区域
.measurement-main {
  padding: 0;
}

// 全局页脚
.measurement-layout .global-footer {
  padding: 0;
  height: auto;
}

.measurement-back-top {
  position: fixed;
  right: 32px;
  bottom: 32px;
  transition:
    opacity 0.3s ease,
    visibility 0.3s ease,
    transform 0.3s ease,
    box-shadow 0.3s ease;
  z-index: 300;
  opacity: 0;
  visibility: hidden;
}

.measurement-back-top.visible {
  opacity: 1;
  visibility: visible;
}

.measurement-back-top:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 16px rgba(var(--v-theme-accent), 0.4);
}

.measurement-back-top .dataset-result-back-top-icon {
  font-size: 20px;
  font-weight: 700;
  line-height: 1;
  display: block;
}

@media (max-width: 768px) {
  .measurement-back-top {
    right: 20px;
    bottom: 32px;
  }
}
</style>
