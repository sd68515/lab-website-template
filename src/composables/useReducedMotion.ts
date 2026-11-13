import { onBeforeUnmount, onMounted, readonly, ref } from 'vue'
import { prefersReducedMotion } from '@/utils/motion'

/** Track preference changes for animations rendered outside CSS. */
export function useReducedMotion() {
  const reducedMotion = ref(prefersReducedMotion())
  let query: MediaQueryList | undefined

  const update = () => {
    reducedMotion.value = query?.matches ?? prefersReducedMotion()
  }

  onMounted(() => {
    query = window.matchMedia('(prefers-reduced-motion: reduce)')
    update()
    query.addEventListener('change', update)
  })

  onBeforeUnmount(() => query?.removeEventListener('change', update))

  return readonly(reducedMotion)
}
