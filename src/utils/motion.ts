/**
 * 动效偏好工具
 *
 * 当用户设置 `prefers-reduced-motion: reduce` 时，自动将交互滚动等动效降级为 `auto`，
 * 以减少由动画/平滑滚动带来的不适。
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function resolveScrollBehavior(behavior: ScrollBehavior): ScrollBehavior {
  if (behavior !== 'smooth') return behavior
  return prefersReducedMotion() ? 'auto' : 'smooth'
}
