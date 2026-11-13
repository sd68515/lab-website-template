<template>
  <div ref="container" class="result-image-loading" :data-image-state="state" :aria-busy="state === 'loading'">
    <ResultImagePlaceholder v-if="!src || state === 'error'" :placeholder="null" :load-error="state === 'error'" />
    <template v-else>
      <img
        :key="src"
        v-bind="$attrs"
        :src="started ? src : undefined"
        :alt="alt"
        :role="state === 'loaded' ? $attrs.role as string : undefined"
        :tabindex="state === 'loaded' ? $attrs.tabindex as number : undefined"
        :aria-hidden="state !== 'loaded' || undefined"
        :inert="state !== 'loaded'"
        :style="{ opacity: state === 'loaded' ? 1 : 0 }"
        decoding="async"
        @load="handleLoad"
        @error="handleError"
      />
      <ImageLoadingSkeleton v-if="state === 'loading'" class="result-image-loading__skeleton" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ImageLoadingSkeleton from './ImageLoadingSkeleton.vue'
import ResultImagePlaceholder from './ResultImagePlaceholder.vue'

defineOptions({ inheritAttrs: false })
const props = defineProps<{ src: string; alt: string }>()
const emit = defineEmits<{ load: [event: Event]; error: [event: Event] }>()
const container = ref<HTMLElement | null>(null)
const state = ref<'idle' | 'loading' | 'loaded' | 'error'>('idle')
const started = ref(false)
let observer: IntersectionObserver | null = null

function start() {
  if (!props.src) return
  started.value = true
  state.value = 'loading'
  observer?.disconnect()
}

function observe() {
  observer?.disconnect()
  if (!container.value) return
  if (typeof IntersectionObserver === 'undefined') { start(); return }
  observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) start()
  })
  observer.observe(container.value)
}

// A replaced <img> cannot finish the request for a new source.
function isCurrent(target: EventTarget | null): target is HTMLImageElement {
  return target instanceof HTMLImageElement && Boolean(container.value?.contains(target)) && target.getAttribute('src') === props.src
}
async function handleLoad(event: Event) {
  const target = event.target
  if (!isCurrent(target)) return
  try {
    await target.decode()
  } catch {
    handleError(event, target)
    return
  }
  if (!isCurrent(target)) return
  state.value = 'loaded'
  emit('load', event)
}
function handleError(event: Event, target = event.target) {
  if (!isCurrent(target)) return
  state.value = 'error'
  emit('error', event)
}

watch(() => props.src, () => {
  started.value = false
  state.value = 'idle'
  observe()
}, { flush: 'post' })
onMounted(observe)
onBeforeUnmount(() => observer?.disconnect())
</script>

<style lang="scss">
@use '@/styles/components/result-image-loading.scss';
</style>
