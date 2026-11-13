<template>
  <div
    ref="containerRef"
    class="viewport-lazy-mount"
    :class="{ 'viewport-lazy-mount--loaded': isLoaded }"
  >
    <div
      v-if="!isLoaded"
      class="viewport-lazy-mount__placeholder"
      :style="placeholderStyle"
      aria-hidden="true"
    >
      <slot name="placeholder">
        <div class="viewport-lazy-mount__placeholder-card">
          <div class="viewport-lazy-mount__placeholder-bar viewport-lazy-mount__placeholder-bar--wide" />
          <div class="viewport-lazy-mount__placeholder-bar" />
          <div class="viewport-lazy-mount__placeholder-block" />
        </div>
      </slot>
    </div>

    <div v-else class="viewport-lazy-mount__content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useScrollContainer } from '@/composables/useScrollContainer'

const props = withDefaults(defineProps<{
  minHeight?: number
  rootMargin?: string
}>(), {
  minHeight: 480,
  rootMargin: '1200px 0px'
})

const scrollContainer = useScrollContainer()
const containerRef = ref<HTMLElement | null>(null)
const isLoaded = ref(false)
let observer: IntersectionObserver | null = null

const placeholderStyle = computed(() => ({
  minHeight: `${props.minHeight}px`
}))

function loadContent() {
  isLoaded.value = true
  observer?.disconnect()
  observer = null
}

function createObserver() {
  if (isLoaded.value) return
  if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
    loadContent()
    return
  }

  observer?.disconnect()
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        loadContent()
      }
    },
    {
      root: scrollContainer.containerRef.value ?? null,
      rootMargin: props.rootMargin,
      threshold: 0
    }
  )

  if (containerRef.value) {
    observer.observe(containerRef.value)
  } else {
    loadContent()
  }
}

onMounted(() => {
  createObserver()
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})

watch(
  () => scrollContainer.containerRef.value,
  () => {
    createObserver()
  }
)

watch(
  () => props.rootMargin,
  () => {
    createObserver()
  }
)
</script>

<style lang="scss">
@use '@/styles/components/viewport-lazy-mount.scss';
</style>
