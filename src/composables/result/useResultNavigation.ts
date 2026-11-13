import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { debounce } from '@/utils/debounce'
import { useScrollContainer } from '@/composables/useScrollContainer'
import { onResultImageStatusChange } from './useResultImages'

export interface ResultNavigationSection {
  id: string
  label: string
  wrapText?: boolean
}

export interface UseResultNavigationOptions {
  sections: Ref<ResultNavigationSection[]>
  activeId: Ref<string>
  identity?: Ref<string>
  /** Viewport Y coordinate to keep clear of fixed navigation and banners. */
  topOffset?: Ref<number> | number
  footerSelector?: string
  navigationRef?: Ref<HTMLElement | ComponentPublicInstance | null>
  syncActiveOnScroll?: boolean
  autoCenterActive?: boolean
  listenToScroll?: boolean
}

function resolveNumber(value: Ref<number> | number | undefined, fallback: number): number {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && 'value' in value) return value.value ?? fallback
  return fallback
}

function getNavigationRoot(raw: HTMLElement | ComponentPublicInstance | null | undefined): HTMLElement | null {
  if (!raw) return null
  if (raw instanceof HTMLElement) return raw
  if (typeof raw === 'object' && '$el' in raw && (raw.$el as unknown) instanceof HTMLElement) {
    return raw.$el as HTMLElement
  }
  return null
}

function resolveAlignmentOffset(
  baseOffset: number,
  container: HTMLElement | null,
  navigationRoot: HTMLElement | null
): number {
  if (!container) return baseOffset

  const containerRect = container.getBoundingClientRect()
  // 页面导航偏移以视口为坐标，滚动与激活判断则以滚动容器顶部为原点。
  const relativeBaseOffset = Math.max(0, baseOffset - containerRect.top)
  if (!navigationRoot) return relativeBaseOffset

  const navigationRect = navigationRoot.getBoundingClientRect()
  const visualOffset = navigationRect.top - containerRect.top

  return Number.isFinite(visualOffset) ? Math.max(relativeBaseOffset, visualOffset) : relativeBaseOffset
}

function getScrollTolerance(): number {
  const pixelRatio =
    typeof window !== 'undefined' && typeof window.devicePixelRatio === 'number'
      ? window.devicePixelRatio
      : 1
  return Math.min(3, Math.max(1, Math.ceil(pixelRatio)))
}

function computeActiveSectionId(
  sections: ResultNavigationSection[],
  container: HTMLElement | null,
  scrollTop: number,
  offset: number
): string | null {
  // 容忍浏览器对 scrollTop 的取整与 getBoundingClientRect 的小数差异，避免点击滚动后激活落到 N-1
  const tolerance = getScrollTolerance()

  let candidate: string | null = null
  const containerRect = container ? container.getBoundingClientRect() : null
  for (const section of sections) {
    const el = document.getElementById(section.id)
    if (!el) continue
    const rect = el.getBoundingClientRect()
    const absoluteTop = container && containerRect ? rect.top - containerRect.top + scrollTop : rect.top + scrollTop
    const top = absoluteTop - offset
    if (scrollTop + tolerance >= top) {
      candidate = section.id
    } else {
      break
    }
  }
  return candidate
}

function collectPendingImages(root: HTMLElement): HTMLImageElement[] {
  return Array.from(root.querySelectorAll('img')).filter((image) => !image.complete)
}

function hasPendingLazyMount(root: HTMLElement): boolean {
  return Boolean(root.querySelector('.viewport-lazy-mount:not(.viewport-lazy-mount--loaded)'))
}

function imageBelongsToSection(imageUrl: string | undefined, section: HTMLElement | null): boolean {
  if (!imageUrl || !section) return false
  return Array.from(section.querySelectorAll<HTMLImageElement>('img')).some((image) => {
    return image.currentSrc === imageUrl || image.src === imageUrl || image.getAttribute('src') === imageUrl
  })
}

export function useResultNavigation(options: UseResultNavigationOptions) {
  const scrollContainer = useScrollContainer()
  const footerOffset = ref(0)
  const unsubscribeScroll = ref<null | (() => void)>(null)
  const sectionObserver = ref<IntersectionObserver | null>(null)
  const navScrollStateTimer = ref<number | null>(null)
  const scrollCorrectionCleanup = ref<null | (() => void)>(null)
  const observedSectionIds = new Set<string>()
  const latestEntries = new Map<string, IntersectionObserverEntry>()

  const effectiveTopOffset = computed(() => resolveNumber(options.topOffset, 0))
  const footerSelector = computed(() => options.footerSelector ?? '.app-footer')
  const getAlignmentTopOffset = () =>
    resolveAlignmentOffset(
      effectiveTopOffset.value,
      scrollContainer.containerRef.value,
      getNavigationRoot(options.navigationRef?.value ?? null)
    )
  const isNearScrollBottom = (scrollTop: number) => {
    const pixelRatio =
      typeof window !== 'undefined' && typeof window.devicePixelRatio === 'number'
        ? window.devicePixelRatio
        : 1
    const tolerance = Math.max(2, Math.ceil(pixelRatio * 2))
    const remaining = scrollContainer.scrollHeight.value - (scrollTop + scrollContainer.clientHeight.value)
    return remaining <= tolerance
  }

  const refreshFooterOffset = () => {
    const containerEl = scrollContainer.containerRef.value
    if (!containerEl) {
      footerOffset.value = 0
      return
    }

    const footerEl = document.querySelector<HTMLElement>(footerSelector.value)
    if (!footerEl) {
      footerOffset.value = 0
      return
    }

    const containerRect = containerEl.getBoundingClientRect()
    const footerRect = footerEl.getBoundingClientRect()
    const overlap = containerRect.bottom - footerRect.top
    footerOffset.value = Math.max(0, overlap)
  }

  const canUseIntersectionObserver = () =>
    typeof window !== 'undefined' && typeof IntersectionObserver !== 'undefined'

  const clearNavScrollStateTimer = () => {
    if (navScrollStateTimer.value === null || typeof window === 'undefined') return
    window.clearTimeout(navScrollStateTimer.value)
    navScrollStateTimer.value = null
  }

  const clearScrollCorrection = () => {
    scrollCorrectionCleanup.value?.()
    scrollCorrectionCleanup.value = null
  }

  const markNavigationProgrammaticScroll = (navContainer: HTMLElement) => {
    if (typeof window === 'undefined') return
    clearNavScrollStateTimer()
    navContainer.classList.add('dataset-result-nav-content--programmatic-scroll')
    navScrollStateTimer.value = window.setTimeout(() => {
      navContainer.classList.remove('dataset-result-nav-content--programmatic-scroll')
      navScrollStateTimer.value = null
    }, 180)
  }

  const clearSectionObserver = () => {
    sectionObserver.value?.disconnect()
    sectionObserver.value = null
    observedSectionIds.clear()
    latestEntries.clear()
  }

  const updateActiveFromEntries = () => {
    if (!options.syncActiveOnScroll) return
    const sections = options.sections.value
    if (!sections.length) return

    const scrollTop = scrollContainer.scrollTop.value
    if (scrollTop <= 0) {
      options.activeId.value = ''
      return
    }
    const containerEl = scrollContainer.containerRef.value
    const firstSection = sections[0]
    const firstSectionEl = firstSection ? document.getElementById(firstSection.id) : null

    // 英雄区域检测：如果还没滚动到第一个 section，清空激活状态
    if (containerEl && firstSectionEl) {
      const containerRect = containerEl.getBoundingClientRect()
      const firstRect = firstSectionEl.getBoundingClientRect()
      const firstSectionTop = firstRect.top - containerRect.top + scrollTop
      if (scrollTop + getScrollTolerance() < firstSectionTop - getAlignmentTopOffset()) {
        options.activeId.value = ''
        return
      }
    }

    const lastSection = sections[sections.length - 1]
    if (lastSection && isNearScrollBottom(scrollTop)) {
      options.activeId.value = lastSection.id
      return
    }

    // 使用确定性策略：基于 scrollTop + offset 计算当前应激活的 section，
    // 避免依赖 IO 的 isIntersecting/boundingClientRect 边界抖动。
    const next = computeActiveSectionId(
      sections,
      scrollContainer.containerRef.value,
      scrollTop,
      getAlignmentTopOffset()
    )
    if (next !== null) {
      options.activeId.value = next
    }
  }

  const syncActiveFromScroll = () => {
    if (!options.syncActiveOnScroll) return
    const sections = options.sections.value
    if (!sections.length) return

    const scrollTop = scrollContainer.scrollTop.value
    if (scrollTop <= 0) {
      options.activeId.value = ''
      return
    }
    const containerEl = scrollContainer.containerRef.value
    const firstSection = sections[0]
    const firstSectionEl = firstSection ? document.getElementById(firstSection.id) : null

    // 英雄区域检测：如果还没滚动到第一个 section，清空激活状态
    if (containerEl && firstSectionEl) {
      const containerRect = containerEl.getBoundingClientRect()
      const firstRect = firstSectionEl.getBoundingClientRect()
      const firstSectionTop = firstRect.top - containerRect.top + scrollTop
      if (scrollTop + getScrollTolerance() < firstSectionTop - getAlignmentTopOffset()) {
        options.activeId.value = ''
        return
      }
    }

    const lastSection = sections[sections.length - 1]
    if (lastSection && isNearScrollBottom(scrollTop)) {
      options.activeId.value = lastSection.id
      return
    }

    const next = computeActiveSectionId(
      sections,
      scrollContainer.containerRef.value,
      scrollTop,
      getAlignmentTopOffset()
    )
    if (next !== null) {
      options.activeId.value = next
    }
  }

  const refreshSectionObserver = () => {
    clearSectionObserver()
    if (options.listenToScroll === false) return
    if (!options.syncActiveOnScroll) return
    if (!canUseIntersectionObserver()) return

    const root = scrollContainer.containerRef.value
    if (!root) return
    // 关键：不要在底部使用过大的负 margin（例如 -60% 会显著缩小 IO 可见区域），
    // 否则第一个 section 进入视口后仍可能处于“不可见区域”，导致侧栏激活严重滞后，
    // 并出现刚激活又快速跳到下一项的现象。
    const rootMargin = `-${getAlignmentTopOffset()}px 0px 0px 0px`
    sectionObserver.value = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = (entry.target as HTMLElement).id
          if (id) {
            latestEntries.set(id, entry)
          }
        })
        updateActiveFromEntries()
      },
      {
        root,
        rootMargin,
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1]
      }
    )

    const activeIds = new Set(options.sections.value.map((section) => section.id))
    const toRemove: string[] = []

    observedSectionIds.forEach((id) => {
      if (!activeIds.has(id)) {
        toRemove.push(id)
      }
    })

    toRemove.forEach((id) => {
      const el = document.getElementById(id)
      if (el) sectionObserver.value?.unobserve(el)
      observedSectionIds.delete(id)
      latestEntries.delete(id)
    })

    options.sections.value.forEach((section) => {
      if (observedSectionIds.has(section.id)) return
      const el = document.getElementById(section.id)
      if (!el) return
      sectionObserver.value?.observe(el)
      observedSectionIds.add(section.id)
    })

    updateActiveFromEntries()
  }

  const scrollActiveNavItemIntoView = () => {
    const navRoot = getNavigationRoot(options.navigationRef?.value ?? null)
    const navContainer = navRoot?.querySelector('.dataset-result-nav-content') as HTMLElement | null
    if (!navContainer) return

    const activeNavItem = navContainer.querySelector<HTMLElement>('.dataset-result-nav-item--active')

    // 无激活项时（英雄区域），将侧栏滚动到顶部
    if (!activeNavItem) {
      if (typeof navContainer.scrollTo === 'function') {
        navContainer.scrollTo({ top: 0, behavior: 'auto' })
      } else {
        navContainer.scrollTop = 0
      }
      return
    }

    const navRect = navContainer.getBoundingClientRect()
    const itemRect = activeNavItem.getBoundingClientRect()
    const visibilityPadding = 12
    const safeInset = Math.min(72, Math.max(36, navRect.height * 0.18))
    const safeTop = visibilityPadding + safeInset
    const safeBottom = navRect.height - visibilityPadding - safeInset
    const itemTop = itemRect.top - navRect.top
    const itemBottom = itemRect.bottom - navRect.top

    let targetTop: number | null = null

    if (itemTop < safeTop) {
      targetTop = navContainer.scrollTop + itemTop - safeTop
    } else if (itemBottom > safeBottom) {
      targetTop = navContainer.scrollTop + itemBottom - safeBottom
    }

    if (targetTop === null) return
    markNavigationProgrammaticScroll(navContainer)

    if (typeof navContainer.scrollTo === 'function') {
      navContainer.scrollTo({ top: targetTop, behavior: 'auto' })
    } else {
      navContainer.scrollTop = targetTop
    }
  }

  // 侧栏容器（fixed 模式）在 footer 避让时通过 CSS `transition: bottom 0.2s` 渐变收缩高度。
  // 若在动画进行中补滚，读取到的是中途的偏大高度，导致末尾项（如 rep10）补滚不到位。
  // 这里在 `bottom` 过渡结束、可视高度稳定后再补滚一次，保证末尾项完整可见。
  let navTransitionTarget: HTMLElement | null = null

  const handleNavBottomTransitionEnd = (event: TransitionEvent) => {
    if (event.propertyName !== 'bottom') return
    if (event.target !== navTransitionTarget) return
    if (!options.autoCenterActive) return
    if (!options.activeId.value) return
    scrollActiveNavItemIntoView()
  }

  const attachNavTransitionListener = () => {
    const navRoot = getNavigationRoot(options.navigationRef?.value ?? null)
    if (!navRoot || navRoot === navTransitionTarget) return
    detachNavTransitionListener()
    navTransitionTarget = navRoot
    navRoot.addEventListener('transitionend', handleNavBottomTransitionEnd)
  }

  const detachNavTransitionListener = () => {
    if (!navTransitionTarget) return
    navTransitionTarget.removeEventListener('transitionend', handleNavBottomTransitionEnd)
    navTransitionTarget = null
  }

  const scheduleScrollCorrection = (id: string) => {
    const containerEl = scrollContainer.containerRef.value
    if (!containerEl || typeof window === 'undefined' || typeof ResizeObserver === 'undefined') {
      return
    }

    clearScrollCorrection()

    let rafId: number | null = null
    let settledTimer: number | null = null
    let maxLifetimeTimer: number | null = null
    let stopped = false
    let correctionCount = 0
    let previousHeight = containerEl.scrollHeight
    const maxCorrectionCount = 10
    const settleDelayMs = 260
    const observedContentEl = containerEl.firstElementChild instanceof HTMLElement
      ? containerEl.firstElementChild
      : containerEl

    const getTargetEl = () => document.getElementById(id)

    const hasPendingTargetImages = () => {
      const targetEl = getTargetEl()
      if (!targetEl) return true
      if (hasPendingLazyMount(targetEl)) return true
      return collectPendingImages(targetEl).length > 0
    }

    const stop = () => {
      if (stopped) return
      stopped = true
      resizeObserver.disconnect()
      unsubscribeImageStatus()
      containerEl.removeEventListener('wheel', cancelOnUserInput)
      containerEl.removeEventListener('touchstart', cancelOnUserInput)
      containerEl.removeEventListener('pointerdown', cancelOnUserInput)
      window.removeEventListener('keydown', cancelOnKeydown)
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId)
        rafId = null
      }
      if (settledTimer !== null) {
        window.clearTimeout(settledTimer)
        settledTimer = null
      }
      if (maxLifetimeTimer !== null) {
        window.clearTimeout(maxLifetimeTimer)
        maxLifetimeTimer = null
      }
      if (scrollCorrectionCleanup.value === stop) {
        scrollCorrectionCleanup.value = null
      }
    }

    const cancelOnUserInput = () => {
      stop()
    }

    const cancelOnKeydown = (event: KeyboardEvent) => {
      const keys = new Set([
        'ArrowUp',
        'ArrowDown',
        'PageUp',
        'PageDown',
        'Home',
        'End',
        'Space'
      ])
      if (keys.has(event.key)) {
        cancelOnUserInput()
      }
    }

    const queueStop = () => {
      if (settledTimer !== null) {
        window.clearTimeout(settledTimer)
      }
      settledTimer = window.setTimeout(() => {
        if (hasPendingTargetImages()) {
          queueStop()
          return
        }
        stop()
      }, settleDelayMs)
    }

    const requestCorrection = () => {
      if (stopped) return
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId)
      }
      rafId = window.requestAnimationFrame(() => {
        if (correctionCount >= maxCorrectionCount && !hasPendingTargetImages()) {
          queueStop()
          return
        }
        correctScroll()
      })
    }

    const correctScroll = () => {
      if (stopped) return
      rafId = null

      const targetEl = getTargetEl()
      if (!targetEl) {
        queueStop()
        return
      }

      const containerRect = containerEl.getBoundingClientRect()
      const targetRect = targetEl.getBoundingClientRect()
      const relativeTop = targetRect.top - containerRect.top
      const expectedOffset = getAlignmentTopOffset()
      const delta = relativeTop - expectedOffset

      if (Math.abs(delta) <= 2) {
        queueStop()
        return
      }

      scrollContainer.scrollToElement(id, expectedOffset, 'auto')
      correctionCount += 1
      queueStop()
    }

    const unsubscribeImageStatus = onResultImageStatusChange((event) => {
      const targetEl = getTargetEl()
      if (!imageBelongsToSection(event.imageUrl, targetEl)) return
      requestCorrection()
    })

    const resizeObserver = new ResizeObserver(() => {
      const nextHeight = containerEl.scrollHeight
      if (nextHeight === previousHeight) return
      previousHeight = nextHeight

      requestCorrection()
    })

    resizeObserver.observe(observedContentEl)
    containerEl.addEventListener('wheel', cancelOnUserInput, { passive: true })
    containerEl.addEventListener('touchstart', cancelOnUserInput, { passive: true })
    containerEl.addEventListener('pointerdown', cancelOnUserInput, { passive: true })
    window.addEventListener('keydown', cancelOnKeydown, { passive: true })
    maxLifetimeTimer = window.setTimeout(() => {
      stop()
    }, 5000)
    requestCorrection()
    scrollCorrectionCleanup.value = stop
  }

  const scrollToSection = (id: string, behavior: ScrollBehavior = 'auto') => {
    // 点击导航属于明确的用户意图：先同步激活状态，再触发滚动，避免出现高亮滞后或落到 N-1 的体验
    options.activeId.value = id
    scrollContainer.scrollToElement(id, getAlignmentTopOffset(), behavior)
    scheduleScrollCorrection(id)
  }

  const scrollToTop = (behavior: ScrollBehavior = 'auto') => {
    scrollContainer.scrollToTop(behavior)
    if (!options.syncActiveOnScroll) {
      options.activeId.value = ''
    }
  }

  const refresh = () => {
    refreshFooterOffset()
    syncActiveFromScroll()
  }

  const handleScroll = debounce(refresh, 50)

  onMounted(() => {
    if (options.listenToScroll === false) {
      refreshFooterOffset()
      return
    }
    unsubscribeScroll.value?.()
    unsubscribeScroll.value = scrollContainer.onScroll(() => handleScroll())
    window.addEventListener('resize', handleScroll, { passive: true })
    nextTick(() => {
      refreshSectionObserver()
      attachNavTransitionListener()
    })
    handleScroll()
  })

  onBeforeUnmount(() => {
    unsubscribeScroll.value?.()
    unsubscribeScroll.value = null
    window.removeEventListener('resize', handleScroll)
    clearNavScrollStateTimer()
    clearScrollCorrection()
    clearSectionObserver()
    detachNavTransitionListener()
  })

  const sectionIdsSignature = computed(() =>
    `${options.identity?.value ?? ''}|${options.sections.value.map((section) => section.id).join('|')}`
  )

  // 防抖版本的侧栏滚动，避免快速滚动时连续触发
  const debouncedScrollNavIntoView = debounce(() => {
    scrollActiveNavItemIntoView()
  }, 50)

  watch([sectionIdsSignature, effectiveTopOffset, () => scrollContainer.containerRef.value], () => {
    nextTick(() => {
      refreshSectionObserver()
      attachNavTransitionListener()
    })
  })

  watch(
    () => options.activeId.value,
    () => {
      if (!options.autoCenterActive) return
      nextTick(() => debouncedScrollNavIntoView())
    }
  )

  watch(footerOffset, () => {
    if (!options.autoCenterActive) return
    if (!options.activeId.value) return
    nextTick(() => debouncedScrollNavIntoView())
  })

  return {
    footerOffset,
    refreshFooterOffset,
    scrollToSection,
    scrollToTop,
    scrollActiveNavItemIntoView
  }
}
