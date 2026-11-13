import { displayText } from '@/utils/locale'

/** Localize the generated download action; keep source metadata values intact. */
export function displayInfoValue(entry: Readonly<{ key: string; value: string }>): string {
  return entry.key === 'Processed data' ? displayText(entry.value) : entry.value
}
