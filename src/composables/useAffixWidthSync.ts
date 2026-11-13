import { computed, onBeforeUnmount, onMounted, watch, type Ref } from 'vue'
import { getScrollbarWidth } from '@/utils/scrollbar'

interface UseAffixWidthSyncOptions {
  container: Ref<HTMLElement | null>
  target: Ref<HTMLElement | null>
  enabled?: Ref<boolean> | boolean
}

/**
 * 同步吸附元素（如侧栏）的宽度到容器宽度，考虑滚动条占用。
 * 适用于结果页侧边导航在固定时与主容器保持一致。
 */
export function useAffixWidthSync(options: UseAffixWidthSyncOptions) {
  const { container, target } = options
  const enabled = computed(() => {
    if (typeof options.enabled === 'boolean') {
      return options.enabled
    }
    return options.enabled?.value ?? true
  })

  const applyWidth = () => {
    if (!enabled.value) return
    const root = container.value
    const el = target.value
    if (!root || !el) return
    const scrollbar = getScrollbarWidth()
    const width = root.clientWidth - scrollbar
    el.style.width = `${Math.max(width, 0)}px`
  }

  const handleResize = () => applyWidth()

  onMounted(() => {
    applyWidth()
    window.addEventListener('resize', handleResize)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize)
  })

  // 当容器或目标 ref 变化时也同步一次
  watch([container, target, enabled], () => {
    const el = target.value
    if (!enabled.value) {
      if (el) {
        el.style.width = '100%'
      }
      return
    }
    applyWidth()
  })

  return {
    refresh: applyWidth
  }
}
