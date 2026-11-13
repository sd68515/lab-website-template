import { computed, shallowRef } from 'vue'
import { en, type MessageCatalog, type MessageKey } from '@/locales/en'

export type UiLocale = 'en' | 'zh-Hans' | 'zh-Hant' | 'ja' | 'ko' | 'es' | 'pt'
export type MessageValues = Readonly<Record<string, string | number>>

const activeResources = shallowRef<{ locale: UiLocale; messages: MessageCatalog }>({
  locale: 'en',
  messages: en
})

export const uiLocale = computed(() => activeResources.value.locale)

export type SupportedLocale = 'en' | 'zh-Hans'
export const localeStorageKey = 'lab-template.locale'

/** Explicit UI source labels only; unknown source records retain their original text. */
const sourceKeys = new Map<string, MessageKey>()
for (const key of Object.keys(en) as MessageKey[]) {
  if (!sourceKeys.has(en[key])) sourceKeys.set(en[key], key)
}

export function displayText(value: string | null | undefined): string {
  if (!value) return ''
  const key = sourceKeys.get(value)
  return key ? getMessage(key) : value
}

export function localizedItemTitle(item: unknown, field = 'title'): string {
  if (typeof item === 'string') return displayText(item)
  if (item && typeof item === 'object' && field in item) {
    const value = (item as Record<string, unknown>)[field]
    return displayText(String(value ?? ''))
  }
  return String(item ?? '')
}

export async function setUiLocale(locale: SupportedLocale): Promise<void> {
  if (locale === 'zh-Hans') {
    const [resources] = await Promise.all([
      import('@/locales/zh-Hans'),
      import('@/assets/css/chinese_fonts.css')
    ])
    configureLocale(locale, resources.zhHans)
  } else {
    configureLocale('en', en)
  }
  try {
    localStorage.setItem(localeStorageKey, locale)
  } catch (error) {
    console.warn('Language preference could not be saved.', error)
  }
}

export async function initializeUiLocale(): Promise<void> {
  let saved: string | null = null
  try {
    saved = localStorage.getItem(localeStorageKey)
  } catch (error) {
    console.warn('Language preference could not be read.', error)
  }
  // Unsupported or absent preferences use the existing English baseline.
  if (saved === 'zh-Hans') await setUiLocale('zh-Hans')
  else configureLocale('en', en)
}

function placeholders(message: string): string {
  return [...new Set(Array.from(message.matchAll(/\{([A-Za-z][\w]*)\}/g), match => match[1]))].sort().join(',')
}

/** Future language packs are fixed, complete resources; no machine translation or implicit fallback. */
export function configureLocale(locale: UiLocale, messages: MessageCatalog): void {
  for (const key of Object.keys(en) as MessageKey[]) {
    if (typeof messages[key] !== 'string') {
      throw new Error(`Missing interface message: ${key}`)
    }
    if (placeholders(messages[key]) !== placeholders(en[key])) {
      throw new Error(`Mismatched placeholders in interface message: ${key}`)
    }
  }
  activeResources.value = { locale, messages }
  if (typeof document !== 'undefined') document.documentElement.lang = locale
}

export function getMessage(key: MessageKey): string {
  return activeResources.value.messages[key]
}

export function text(key: MessageKey, values: MessageValues = {}): string {
  return getMessage(key).replace(/\{([A-Za-z][\w]*)\}/g, (_match, name: string) => {
    const value = values[name]
    if (value === undefined) throw new Error(`Missing ${name} in interface message: ${key}`)
    return String(value)
  })
}

const numberFormatters = new Map<string, Intl.NumberFormat>()

/** Presentation only: machine identifiers, CSV values and scientific precision are never rewritten. */
export function formatNumber(value: number, options: Intl.NumberFormatOptions = {}): string {
  const digits = options.maximumFractionDigits
  // Keep the benchmark's existing toFixed rounding when displaying fixed scientific precision.
  const displayValue = digits !== undefined && digits === options.minimumFractionDigits
    ? Number(value.toFixed(digits))
    : value
  // A matrix renders thousands of numbers with the same locale and precision.
  const key = JSON.stringify([uiLocale.value, options])
  let formatter = numberFormatters.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat(uiLocale.value, { useGrouping: false, ...options })
    numberFormatters.set(key, formatter)
  }
  return formatter.format(displayValue)
}

export function formatDate(value: Date | number, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(uiLocale.value, options).format(value)
}
