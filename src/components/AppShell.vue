<template>
  <div class="app-shell">
    <a class="skip-link" href="#main-content" @click.prevent="focusMainContent">{{ text('common.skipToContent') }}</a>
    <AppMenu />

    <v-main
      id="main-content"
      ref="vMainRef"
      class="app-shell-main"
      :class="{ 'app-shell-main--keyboard-focus': mainKeyboardFocus }"
      tabindex="-1"
      @pointerdown.capture="mainKeyboardFocus = false"
      @blur="mainKeyboardFocus = false"
    >
      <div class="app-shell-content">
        <div class="app-shell-page">
          <router-view :key="routerViewKey" />
        </div>

        <div class="app-shell-footer">
          <AppFooter />
        </div>
      </div>
    </v-main>
    <ResultBrowser v-if="showResultBrowser" />
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, watch, nextTick, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useDisplay } from 'vuetify'
import AppMenu from '@/layout/AppMenu.vue'
import AppFooter from '@/layout/AppFooter.vue'
import { useScrollContainer } from '@/composables/useScrollContainer'
import { ROUTE_NAMES } from '@/constants/routes'
import { getScrollbarWidth } from '@/utils/scrollbar'
import { text } from '@/utils/locale'

const route = useRoute()
const scrollContainer = useScrollContainer()
const ResultBrowser = defineAsyncComponent(() => import('@/components/result/ResultBrowser.vue'))
const display = useDisplay()
const mainKeyboardFocus = ref(false)
function focusMainContent() {
  mainKeyboardFocus.value = true
  document.getElementById('main-content')?.focus({ preventScroll: true })
}
// 小屏和短视口省略悬浮辅助功能；改变窗口大小时卸载，避免隐藏面板残留焦点或菜单。
const showResultBrowser = computed(() =>
  (route.name === ROUTE_NAMES.DATASET_RESULT || route.name === ROUTE_NAMES.METHOD_RESULT) &&
  display.width.value > 760 && display.height.value > 500
)

const routerViewKey = computed(() => {
  // 混合策略：measurement 路由只用 path，避免 query 变化导致页面整体重建与抖动；
  // 其他路由保持 fullPath，保留"强制重渲染"的兜底能力（用于少数间歇性不刷新的场景）。
  if (route.path.startsWith('/measurement')) {
    return route.path
  }
  return route.fullPath
})

// 固定预留滚动条宽度，避免动态检测造成闪烁和页面切换时的布局跳动。
const physicalScrollbarWidth = getScrollbarWidth()

const applyScrollbarWidth = () => {
  if (typeof document === 'undefined') return
  document.documentElement.style.setProperty('--scrollbar-width', `${physicalScrollbarWidth}px`)
}

/**
 * 显示应用：在 Vuetify layout 初始化完成后添加 app-ready class
 * 使用双重 rAF 确保浏览器完成渲染和重排
 */
const showApp = () => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.getElementById('app')?.classList.add('app-ready')
    })
  })
}

onMounted(async () => {
  // main.ts 已等待 router.isReady()，此处无需再等待
  const vMainEl = document.querySelector<HTMLElement>('.app-shell-main')
  if (vMainEl) {
    scrollContainer.attach(vMainEl)
  }

  // 立即设置滚动条宽度（无需RAF延迟，因为值是固定的）
  applyScrollbarWidth()

  // 等待 DOM 更新和 Vuetify layout 计算完成后显示应用
  await nextTick()
  showApp()
})

onBeforeUnmount(() => {
  scrollContainer.detach()
})

// 路由切换时滚动到顶部
watch(
  () => route.path,
  (nextPath, prevPath) => {
    if (nextPath !== prevPath) {
      scrollContainer.scrollToTop('auto')
    }
  }
)
</script>

<style lang="scss">
@use '@/styles/variables.scss' as vars;

.app-shell {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.app-shell-main {
  flex: 1 1 0%;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: scroll;
  display: block;
}

.app-shell-content {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.app-shell-page {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.app-shell-page > * {
  flex: 1;
  // 页面组件最小高度：确保内容加载前后滚动区域稳定
  // 使用 calc 计算视口高度减去顶栏和底栏，避免滚动条滑块因内容高度变化而跳动
  min-height: calc(100vh - #{vars.$header-height} - var(--footer-height, 56px));
}

.app-shell-footer {
  flex: 0 0 auto;
  border-top: 1px solid var(--color-accent);
  background-color: transparent;
}
</style>
