<!--
  指标二级导航栏（Vuetify/自定义实现）
  根据当前路由展示通用指标或效率类指标导航
-->
<template>
  <div v-if="navMode !== 'hidden'" class="metric-sub-nav">
    <div class="metric-sub-nav__bar">
      <!-- 左箭头：始终渲染但用 CSS 控制可见性，避免消失时导致按钮移位 -->
      <button
        :class="[
          'metric-sub-nav__arrow',
          'metric-sub-nav__arrow--left',
          { 'is-hidden': !showLeftArrow, 'is-visible': canScroll }
        ]"
        type="button"
        :aria-label="text('metricSubNav.scrollLeft')"
        :tabindex="showLeftArrow ? 0 : -1"
        @click="scrollLeft"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>

      <nav
        ref="subNavMenuRef"
        class="metric-sub-nav__menu"
        role="navigation"
        :aria-label="text('metricSubNav.measurementSubNavigation')"
        @scroll="updateArrowVisibility"
        @keydown="handleKeydown"
      >
        <RouterLink
          v-for="metric in currentMetrics"
          :key="metric.id"
          :to="metric.route"
          class="metric-sub-nav__item"
          :data-route="metric.route"
          :class="{ 'is-active': route.path === metric.route }"
          :aria-current="route.path === metric.route ? 'page' : undefined"
        >
          {{ displayText(getMetricDisplayName(metric.name)) }}
        </RouterLink>
      </nav>

      <!-- 右箭头：始终渲染但用 CSS 控制可见性，避免消失时导致按钮移位 -->
      <button
        :class="[
          'metric-sub-nav__arrow',
          'metric-sub-nav__arrow--right',
          { 'is-hidden': !showRightArrow, 'is-visible': canScroll }
        ]"
        type="button"
        :aria-label="text('metricSubNav.scrollRight')"
        :tabindex="showRightArrow ? 0 : -1"
        @click="scrollRight"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { text, displayText } from '@/utils/locale'
import { computed, onBeforeUnmount, onMounted, nextTick, ref, watch } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import { getGeneralMetrics, getSimulationSpecificMetrics, getMetricDisplayName } from '@/constants/metrics';
import { resolveScrollBehavior } from '@/utils/motion';

const route = useRoute();

const generalMetrics = getGeneralMetrics();

const simulationMetrics = getSimulationSpecificMetrics();

const navMode = computed<'general' | 'simulation' | 'hidden'>(() => {
  const path = route.path;
  if (path.startsWith('/measurement/general-metrics/')) {
    return 'general';
  }
  if (path.startsWith('/measurement/simulation/')) {
    return 'simulation';
  }
  return 'hidden';
});

const currentMetrics = computed(() => {
  if (navMode.value === 'general') {
    return generalMetrics;
  }
  if (navMode.value === 'simulation') {
    return simulationMetrics;
  }
  return [];
});

const BODY_SUB_NAV_CLASS = 'has-metric-sub-nav';
const subNavMenuRef = ref<HTMLElement | null>(null);

// 箭头显示状态
const showLeftArrow = ref(false);
const showRightArrow = ref(false);
// 内容是否可滚动（用于控制箭头占位）
const canScroll = ref(false);

// 滚动步长（每次点击滚动的像素数）
const SCROLL_STEP = 200;

// 更新箭头显示状态
const updateArrowVisibility = () => {
  const el = subNavMenuRef.value;
  if (!el) {
    showLeftArrow.value = false;
    showRightArrow.value = false;
    canScroll.value = false;
    return;
  }

  const { scrollLeft: scrollLeftValue, scrollWidth, clientWidth } = el;
  const maxScroll = scrollWidth - clientWidth;

  // 容器不可滚动时隐藏两个箭头
  if (maxScroll <= 1) {
    showLeftArrow.value = false;
    showRightArrow.value = false;
    canScroll.value = false;
    return;
  }

  canScroll.value = true;

  // 根据滚动位置显示/隐藏箭头
  showLeftArrow.value = scrollLeftValue > 1;
  showRightArrow.value = scrollLeftValue < maxScroll - 1;
};

// 向左滚动
const scrollLeft = () => {
  const el = subNavMenuRef.value;
  if (!el) return;
  el.scrollBy({ left: -SCROLL_STEP, behavior: resolveScrollBehavior('smooth') });
};

// 向右滚动
const scrollRight = () => {
  const el = subNavMenuRef.value;
  if (!el) return;
  el.scrollBy({ left: SCROLL_STEP, behavior: resolveScrollBehavior('smooth') });
};

const handleKeydown = (event: KeyboardEvent) => {
  if (!canScroll.value) return;
  const el = subNavMenuRef.value;
  if (!el) return;

  switch (event.key) {
    case 'ArrowLeft':
      scrollLeft();
      event.preventDefault();
      break;
    case 'ArrowRight':
      scrollRight();
      event.preventDefault();
      break;
    case 'Home':
      el.scrollTo({ left: 0, behavior: resolveScrollBehavior('smooth') });
      event.preventDefault();
      break;
    case 'End': {
      const maxScroll = (el.scrollWidth ?? 0) - (el.clientWidth ?? 0);
      el.scrollTo({ left: maxScroll, behavior: resolveScrollBehavior('smooth') });
      event.preventDefault();
      break;
    }
    default:
      break;
  }
};

let resizeObserver: ResizeObserver | null = null;

const handleWheel = (event: WheelEvent) => {
  const el = subNavMenuRef.value;
  if (!el) return;

  const canScrollHorizontally = el.scrollWidth > el.clientWidth + 1;

  // 判断滚动意图
  const isHorizontalIntent = Math.abs(event.deltaX) >= Math.abs(event.deltaY) || event.shiftKey;

  if (isHorizontalIntent && canScrollHorizontally) {
    // 横向滚动意图且导航栏可滚动：滚动导航栏
    const delta = event.deltaX !== 0 ? event.deltaX : event.deltaY;
    el.scrollLeft += delta;
    event.preventDefault();
  } else if (!isHorizontalIntent) {
    // 垂直滚动意图：转发给主滚动容器
    // 因为 sub-nav 是 position: fixed，wheel 事件冒泡不会到达 v-main
    const mainScroller = document.querySelector<HTMLElement>('.app-shell-main');
    if (mainScroller) {
      mainScroller.scrollBy({ top: event.deltaY, left: 0 });
      event.preventDefault();
    }
  }
  // 其他情况（横向意图但导航栏不可滚动）：不处理，让浏览器默认行为
};

onMounted(() => {
  if (navMode.value !== 'hidden') {
    document.body.classList.add(BODY_SUB_NAV_CLASS);
  }

  subNavMenuRef.value?.addEventListener('wheel', handleWheel, { passive: false });

  // 初始化箭头状态
  nextTick(() => updateArrowVisibility());

  // 监听容器大小变化
  if (subNavMenuRef.value) {
    resizeObserver = new ResizeObserver(() => updateArrowVisibility());
    resizeObserver.observe(subNavMenuRef.value);
  }

  // 监听窗口大小变化
  window.addEventListener('resize', updateArrowVisibility);
});

onBeforeUnmount(() => {
  document.body.classList.remove(BODY_SUB_NAV_CLASS);
  subNavMenuRef.value?.removeEventListener('wheel', handleWheel);
  resizeObserver?.disconnect();
  resizeObserver = null;
  window.removeEventListener('resize', updateArrowVisibility);
});

watch(navMode, mode => {
  if (mode === 'hidden') {
    document.body.classList.remove(BODY_SUB_NAV_CLASS);
  } else {
    document.body.classList.add(BODY_SUB_NAV_CLASS);
    nextTick(() => updateArrowVisibility());
  }
});
</script>

<style lang="scss">
@use '@/styles/components/sub-nav.scss';
</style>
