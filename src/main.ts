/**
 * 应用入口文件
 * 负责创建 Vue 应用实例、注册插件、挂载全局属性
 */
import { createApp } from 'vue'
import type { App as VueApp } from 'vue'
import { watch } from 'vue'
import { initializeUiLocale, setUiLocale, text, uiLocale, type SupportedLocale } from '@/utils/locale'
import 'vuetify/styles'

import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'

// 导入样式文件
import './assets/css/local_fonts.css'
import './styles/index.scss'

const OPEN_SELECT_SELECTOR = '.v-select.v-select--active-menu'
const SELECT_OVERLAY_SELECTOR = '.v-overlay__content.v-select__content'
// 监控窗口需覆盖“菜单关闭过渡 + Vuetify onAfterLeave 再次抢焦”的全过程，留足缓冲
const BLUR_WATCH_DURATION_MS = 800
const BLUR_WATCH_INTERVAL_MS = 32

let selectPointerBlurRepairInstalled = false

function isFocusableElement(element: Element | null): element is HTMLElement {
  if (!(element instanceof HTMLElement)) return false
  if (element.matches('button, [href], input, select, textarea, summary')) {
    return !element.hasAttribute('disabled')
  }
  return element.isContentEditable || element.tabIndex >= 0
}

function getFocusableTarget(target: EventTarget | null): HTMLElement | null {
  let current = target instanceof Element ? target : null
  while (current) {
    if (isFocusableElement(current)) {
      return current
    }
    current = current.parentElement
  }
  return null
}

// 强制复位 VSelect 卡死的 focus 状态。
// 背景：Vuetify 4 的 useFocusRepair 在“菜单仍打开时发生 focusout”会拦截并 return，
// 不把内部 isFocused 置为 false；菜单随后关闭却不会再补发事件，于是 isFocused（focused 模型）
// 卡在 true，使 v-field--active 持续为真、label 钉在顶部（即便 DOM 焦点早已离开输入框）。
//
// VTextField 的真实输入框直接绑定了 onBlur -> useFocus.blur()（参见 VTextField 渲染中的
// input onBlur），而该 isFocused 是 VSelect / VTextField / VField 经 proxiedModel 共享的同一个值。
// 因此只需对输入框补发一次 blur 事件即可把 focused 复位为 false，且不会像 input.focus() 那样
// 触发 VTextField onFocus 内的 nextTick 重聚焦，从而避免焦点被反复夺回的循环。
function forceResetSelectFocus(selectRoot: HTMLElement, restoreTarget: HTMLElement | null) {
  const input = selectRoot.querySelector<HTMLElement>('input')

  if (input) {
    // 若焦点仍停留在输入框，先做原生 blur（同样会触发 onBlur）
    if (document.activeElement === input) {
      input.blur()
    }
    // 直接派发 blur 事件，确保 useFocus 的 blur() 被调用，复位 focused 模型
    input.dispatchEvent(new FocusEvent('blur', { bubbles: false }))
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
  }

  // 把焦点交还给用户原本点击的可聚焦元素（若有）
  if (restoreTarget?.isConnected && restoreTarget !== document.activeElement) {
    restoreTarget.focus({ preventScroll: true })
  }
}

// 持续监控窗口：外部点击后，菜单会经历“关闭过渡 + onAfterLeave 再次抢焦”的过程，
// 在固定时间窗口内重复检查，以覆盖过渡结束后的延迟焦点变化：
// 一旦菜单确实已关闭、仍未选中值、但 v-field--active 仍卡在激活态，就补发一次
// focusout 复位 focused 模型（见 forceResetSelectFocus），避免“需点两次外部才恢复默认”。
function scheduleEmptySelectBlurRepair(selectRoot: HTMLElement, restoreTarget: HTMLElement | null) {
  const deadline = Date.now() + BLUR_WATCH_DURATION_MS
  let repaired = false

  const tick = () => {
    if (!selectRoot.isConnected || repaired) return

    // 用户在窗口期内真正选了值，交还给 Vuetify 正常处理
    if (selectRoot.classList.contains('v-select--selected')) return

    // 菜单仍打开（含 onAfterLeave 之前的瞬间）时不能补发 focusout，
    // 否则会被 useFocusRepair 拦截甚至互相打架；继续等待下一拍。
    const menuOpen = selectRoot.classList.contains('v-select--active-menu')
    const stillActive = selectRoot.querySelector('.v-field--active') !== null

    if (!menuOpen && stillActive) {
      // 菜单已关闭但 isFocused 仍卡在 true（v-field--active 为真）：补发一次 focusout 复位
      forceResetSelectFocus(selectRoot, restoreTarget)
      repaired = true
      return
    }

    if (Date.now() < deadline) {
      window.setTimeout(tick, BLUR_WATCH_INTERVAL_MS)
    }
  }

  window.setTimeout(tick, BLUR_WATCH_INTERVAL_MS)
}

function installEmptySelectPointerBlurRepair() {
  if (selectPointerBlurRepairInstalled || typeof document === 'undefined') return

  document.addEventListener(
    'pointerdown',
    (event) => {
      const openSelect = document.querySelector<HTMLElement>(OPEN_SELECT_SELECTOR)
      if (!openSelect || openSelect.classList.contains('v-select--selected')) return

      const targetNode = event.target instanceof Node ? event.target : null
      if (targetNode && openSelect.contains(targetNode)) return

      const openOverlay = document.querySelector<HTMLElement>(SELECT_OVERLAY_SELECTOR)
      if (targetNode && openOverlay?.contains(targetNode)) return

      scheduleEmptySelectBlurRepair(openSelect, getFocusableTarget(event.target))
    },
    true
  )

  selectPointerBlurRepairInstalled = true
}

/**
 * 异步初始化应用
 * 等待路由就绪后再挂载，确保首次渲染时 route.path 已正确解析，
 * 避免导航栏状态闪烁（如 Home 被误激活、二级导航消失等）
 */
async function initApp(requestedLocale?: SupportedLocale) {
  if (requestedLocale) await setUiLocale(requestedLocale)
  else await initializeUiLocale()
  watch(uiLocale, locale => { vuetify.locale.current.value = locale }, { immediate: true })
  const app: VueApp = createApp(App)

  // 注册路由和 UI 组件库
  app.use(router)
  app.use(vuetify)

  // 开发调试：暴露 router 便于排查“URL 变但视图未切换”等间歇性问题
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const debugWindow = window as unknown as Record<string, unknown>
    debugWindow.__RNAV_ROUTER__ = router
  }

  // 等待路由完成首次导航解析后再挂载应用
  await router.isReady()
  app.mount('#app')

  installEmptySelectPointerBlurRepair()
}

function showLanguageStartupError(error: unknown) {
  console.error('Application language could not be initialized.', error)
  const host = document.getElementById('app')
  if (!host) return
  host.classList.add('app-ready')
  const panel = document.createElement('div')
  panel.className = 'locale-startup-error'
  panel.setAttribute('role', 'alert')
  const message = document.createElement('p')
  message.textContent = text('language.loadFailed')
  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = text('interface.continue-in-english')
  button.addEventListener('click', () => { void initApp('en').catch(showLanguageStartupError) })
  panel.append(message, button)
  host.replaceChildren(panel)
}

void initApp().catch(showLanguageStartupError)
