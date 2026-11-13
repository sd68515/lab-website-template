import { computed, readonly, ref } from 'vue'
import { appearanceBootstrap, getInitialAppearance, initializeDocumentAppearance } from '@/utils/appearance'

// Bind VApp's local theme instead of rewriting Vuetify's global stylesheet.
// Replacing that stylesheet can briefly invalidate loaded web fonts in Chrome.
const name = ref(getInitialAppearance())
const isDark = computed(() => name.value === 'dark')

export function useAppearance() {
  function toggleAppearance() {
    const next = isDark.value ? 'light' : 'dark'
    name.value = next
    initializeDocumentAppearance(appearanceBootstrap, next)
    try {
      localStorage.setItem(appearanceBootstrap.storageKey, next)
    } catch (error) {
      console.warn('Theme preference could not be saved.', error)
    }
  }

  return { name: readonly(name), isDark, toggleAppearance }
}
