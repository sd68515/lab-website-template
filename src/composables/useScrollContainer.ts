import { computed, ref, shallowRef } from 'vue'
import { resolveScrollBehavior } from '@/utils/motion'

type ScrollHandler = (e: Event) => void

const containerRef = shallowRef<HTMLElement | null>(null)
const scrollTop = ref(0)
const scrollHeight = ref(0)
const clientHeight = ref(0)
const listeners = new Set<ScrollHandler>()

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function updateStateFrom(el: HTMLElement) {
  scrollTop.value = el.scrollTop
  scrollHeight.value = el.scrollHeight
  clientHeight.value = el.clientHeight
}

function handleScroll(e: Event) {
  const el = containerRef.value
  if (!el) return
  updateStateFrom(el)
  listeners.forEach(fn => fn(e))
}

function attach(el: HTMLElement | null) {
  if (!isBrowser()) return
  if (!el) return
  if (containerRef.value === el) return

  detach()
  containerRef.value = el
  el.addEventListener('scroll', handleScroll, { passive: true })
  updateStateFrom(el)
}

function detach() {
  if (!isBrowser()) return
  const el = containerRef.value
  if (!el) return
  el.removeEventListener('scroll', handleScroll)
  containerRef.value = null
}

function onScroll(fn: ScrollHandler) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function scrollTo(options: ScrollToOptions) {
  const el = containerRef.value
  if (el) {
    el.scrollTo(options)
    updateStateFrom(el)
    return
  }

  if (isBrowser() && typeof window.scrollTo === 'function') {
    window.scrollTo(options)
  }
}

// 统一尊重 prefers-reduced-motion：当用户禁用动效时，避免使用 smooth 滚动
function scrollToTop(behavior: ScrollBehavior = 'smooth') {
  scrollTo({ top: 0, left: 0, behavior: resolveScrollBehavior(behavior) })
}

function scrollToElement(target: string | HTMLElement, offset = 0, behavior: ScrollBehavior = 'smooth') {
  const el = containerRef.value
  if (!el) return

  const targetEl = typeof target === 'string' ? document.getElementById(target) : target
  if (!targetEl) return

  const containerRect = el.getBoundingClientRect()
  const targetRect = targetEl.getBoundingClientRect()
  const top = targetRect.top - containerRect.top + el.scrollTop - offset
  scrollTo({ top, left: 0, behavior: resolveScrollBehavior(behavior) })
}

export function useScrollContainer() {
  const hasVerticalScrollbar = computed(() => scrollHeight.value - clientHeight.value > 1)

  return {
    containerRef,
    scrollTop,
    scrollHeight,
    clientHeight,
    hasVerticalScrollbar,
    attach,
    detach,
    onScroll,
    scrollTo,
    scrollToTop,
    scrollToElement
  }
}
