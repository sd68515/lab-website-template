import { onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import { useTheme } from 'vuetify'
import { lightAppearance } from '@/constants/appearance'

export interface ChartAppearance {
  isDark: boolean
  fontFamily: string
  borderRadius: number
  accentColor: string
  textColor: string
  mutedColor: string
  borderColor: string
  gridColor: string
  surfaceColor: string
  shadowColor: string
  dimmedColor: string
  highlightColor: string
}

const translucent = (hex: string, alpha: number): string => {
  const channels = hex.match(/[\da-f]{2}/gi)?.map(channel => Number.parseInt(channel, 16))
  return channels?.length === 3
    ? `rgba(${channels.join(', ')}, ${alpha})`
    : hex
}

const defaultAppearance: ChartAppearance = {
  isDark: false,
  fontFamily: 'Inter, system-ui, sans-serif',
  borderRadius: 12,
  accentColor: lightAppearance.accent,
  textColor: lightAppearance.text,
  mutedColor: lightAppearance.textMuted,
  borderColor: lightAppearance.border,
  gridColor: lightAppearance.grid,
  surfaceColor: lightAppearance.surface,
  shadowColor: translucent(lightAppearance.shadow, 0.12),
  dimmedColor: lightAppearance.chartDimmed,
  highlightColor: translucent(lightAppearance.accent, 0.06)
}

/** Re-read resolved CSS after theme, language, or web-font changes. */
export function useChartAppearance(
  element: Ref<HTMLElement | null>,
  redraw: () => void
): Ref<ChartAppearance> {
  const theme = useTheme()
  const appearance = ref<ChartAppearance>({ ...defaultAppearance })
  let observer: MutationObserver | undefined
  let disposed = false
  let generation = 0

  const refresh = () => {
    if (disposed || !element.value) return

    const styles = getComputedStyle(element.value)
    const colors = theme.current.value.colors
    const themeColor = (name: string, fallback: string): string => {
      const value = colors[name]
      return typeof value === 'string' ? value : fallback
    }
    const token = (name: string, fallback: string) => {
      const value = styles.getPropertyValue(name).trim()
      // Canvas does not resolve CSS var() expressions itself.
      return value && !value.includes('var(') ? value : fallback
    }

    const nextAppearance: ChartAppearance = {
      isDark: theme.current.value.dark,
      fontFamily: token('--font-family-data', styles.fontFamily || defaultAppearance.fontFamily),
      borderRadius: Number.parseFloat(token('--app-border-radius', String(defaultAppearance.borderRadius))),
      accentColor: token('--color-accent', themeColor('accent', defaultAppearance.accentColor)),
      textColor: token('--text-body-color', themeColor('text', defaultAppearance.textColor)),
      mutedColor: token('--text-muted-color', themeColor('textMuted', defaultAppearance.mutedColor)),
      borderColor: token('--color-border', themeColor('border', defaultAppearance.borderColor)),
      gridColor: token('--color-grid', themeColor('grid', lightAppearance.grid)),
      surfaceColor: token('--color-surface', themeColor('surface', defaultAppearance.surfaceColor)),
      shadowColor: token('--color-shadow', translucent(themeColor('shadow', lightAppearance.shadow), 0.12)),
      dimmedColor: themeColor('chartDimmed', defaultAppearance.dimmedColor),
      highlightColor: translucent(themeColor('accent', lightAppearance.accent), 0.06)
    }
    // Font metrics can change while the CSS font-family string stays identical.
    appearance.value = nextAppearance
    redraw()
  }

  const afterFonts = () => {
    const current = ++generation
    void document.fonts.ready.then(() => {
      if (!disposed && current === generation) refresh()
    })
  }

  onMounted(() => {
    refresh()
    afterFonts()
    document.fonts.addEventListener('loadingdone', refresh)
    observer = new MutationObserver(refresh)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang', 'class', 'style', 'data-theme']
    })
  })

  watch(() => theme.name.value, () => {
    refresh()
    afterFonts()
  }, { flush: 'post' })
  watch(element, refresh, { flush: 'post' })

  onBeforeUnmount(() => {
    disposed = true
    generation++
    observer?.disconnect()
    document.fonts.removeEventListener('loadingdone', refresh)
  })

  return appearance
}
