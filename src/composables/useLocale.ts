import { readonly, ref } from 'vue'

export type SupportedLocale = 'en' | 'zh-Hans'
export interface LocalizedText { en: string; zh: string }
const storageKey = 'lab-template.locale'
let initial: SupportedLocale = 'en'
try {
  if (localStorage.getItem(storageKey) === 'zh-Hans') initial = 'zh-Hans'
} catch { /* The language switch remains available without persistent storage. */ }
const current = ref<SupportedLocale>(initial)
document.documentElement.lang = current.value

/** Use the same reactive locale for labels and sample records. / 界面和示例数据共用响应式语言设置。 */
export function useLocale() {
  const t = (en: string, zh: string) => current.value === 'zh-Hans' ? zh : en
  const localize = (value: LocalizedText) => current.value === 'zh-Hans' ? value.zh : value.en
  function setLocale(value: SupportedLocale) {
    current.value = value
    document.documentElement.lang = value
    try { localStorage.setItem(storageKey, value) } catch { /* Storage is optional. */ }
  }
  return { locale: readonly(current), t, localize, setLocale }
}
