import { onBeforeUnmount, reactive } from 'vue'

export type ClipboardState = 'idle' | 'copying' | 'success' | 'error'

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const previousFocus = document.activeElement
  const selection = window.getSelection()
  const ranges = selection ? Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index).cloneRange()) : []
  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.readOnly = true
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  try {
    textarea.select()
    if (!document.execCommand('copy')) throw new Error('Clipboard copy was rejected.')
  } finally {
    textarea.remove()
    if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
      previousFocus.focus({ preventScroll: true })
    }
    if (selection) {
      selection.removeAllRanges()
      for (const range of ranges) selection.addRange(range)
    }
  }
}

/** Each target owns its feedback, in-flight request and success timer. */
export function useClipboardFeedback<Key extends string>(successDuration = 1000) {
  const states = reactive(new Map<Key, ClipboardState>())
  const requests = new Map<Key, number>()
  const timers = new Map<Key, ReturnType<typeof setTimeout>>()
  let disposed = false

  function getCopyState(key: Key): ClipboardState {
    return states.get(key) ?? 'idle'
  }

  async function copy(key: Key, value: string): Promise<void> {
    const request = (requests.get(key) ?? 0) + 1
    requests.set(key, request)
    clearTimeout(timers.get(key))
    timers.delete(key)
    states.set(key, 'copying')
    try {
      await copyText(value)
      if (disposed || requests.get(key) !== request) return
      states.set(key, 'success')
      timers.set(key, setTimeout(() => {
        states.delete(key)
        timers.delete(key)
      }, successDuration))
    } catch (error) {
      if (disposed || requests.get(key) !== request) return
      states.set(key, 'error')
      console.error('Failed to copy text to the clipboard.', error)
    }
  }

  onBeforeUnmount(() => {
    disposed = true
    for (const timer of timers.values()) clearTimeout(timer)
    timers.clear()
  })

  return { getCopyState, copy }
}
