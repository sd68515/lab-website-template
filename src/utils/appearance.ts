import { appearances, type AppearanceName } from '../constants/appearance'

export const appearanceBootstrap = {
  storageKey: 'lab-template.theme',
  backgrounds: {
    light: appearances.light.background,
    dark: appearances.dark.background
  }
} as const

/** Self-contained so Vite can also inline it before the first page paint. */
export function initializeDocumentAppearance(
  settings: { storageKey: string; backgrounds: Record<AppearanceName, string> },
  requested?: AppearanceName
): AppearanceName {
  let name = requested
  if (!name) {
    let saved: string | null = null
    try {
      saved = localStorage.getItem(settings.storageKey)
    } catch (error) {
      // Browsers may deny persistence; theme switching still works in this page.
      console.warn('Theme preference could not be read.', error)
    }
    name = saved === 'light' || saved === 'dark'
      ? saved
      : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  const root = document.documentElement
  root.dataset.theme = name
  root.classList.remove(name === 'dark' ? 'v-theme--light' : 'v-theme--dark')
  root.classList.add(`v-theme--${name}`)
  root.style.colorScheme = name
  root.style.backgroundColor = settings.backgrounds[name]
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', settings.backgrounds[name])
  return name
}

export function getInitialAppearance(): AppearanceName {
  const name = document.documentElement.dataset.theme
  return name === 'light' || name === 'dark' ? name : initializeDocumentAppearance(appearanceBootstrap)
}
