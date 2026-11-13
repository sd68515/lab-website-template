<template>
  <div ref="root" class="demo-browser">
    <section v-if="state === 'panel'" id="demo-browser-panel" class="demo-browser__panel" role="dialog" :aria-label="t('Browse results', '浏览结果')">
      <header class="demo-browser__header">
        <h2>{{ t('Browse results', '浏览结果') }}</h2>
        <button type="button" class="demo-browser__close" :aria-label="t('Close', '关闭')" @click="close">×</button>
      </header>
      <div class="demo-browser__tabs" :aria-label="t('Result type', '结果类型')">
        <button type="button" :aria-pressed="mode === 'dataset'" @click="mode = 'dataset'">{{ t('Datasets', '数据集') }}</button>
        <button type="button" :aria-pressed="mode === 'method'" @click="mode = 'method'">{{ t('Methods', '方法') }}</button>
      </div>
      <label class="demo-browser__search">
        <span>{{ t('Search', '搜索') }}</span>
        <input ref="searchInput" v-model="search" type="search" :placeholder="t('Search by name or category', '按名称或类别搜索')">
      </label>
      <div class="demo-browser__grid">
        <RouterLink v-for="item in filtered" :key="item.id" :to="location(item.id)" :aria-current="isCurrent(item.id) ? 'page' : undefined" @click="close">{{ item.name }}<small>{{ item.category }}</small></RouterLink>
        <p v-if="!filtered.length">{{ t('No matching results.', '没有匹配的结果。') }}</p>
      </div>
    </section>
    <nav v-if="state === 'dial'" class="demo-browser__dial" :aria-label="t('Quick actions', '快捷操作')">
      <button type="button" @click="openPanel">{{ t('Browse results', '浏览结果') }} <span aria-hidden="true">↔</span></button>
      <button type="button" @click="goTop">{{ t('Back to top', '返回顶部') }} <span aria-hidden="true">↑</span></button>
    </nav>
    <button ref="trigger" type="button" class="demo-browser__trigger" :aria-label="state === 'closed' ? t('Open quick actions', '打开快捷操作') : t('Close quick actions', '关闭快捷操作')" :aria-expanded="state !== 'closed'" :aria-controls="state === 'panel' ? 'demo-browser-panel' : undefined" @click="state = state === 'closed' ? 'dial' : 'closed'">
      <svg v-if="state === 'closed'" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" /></svg><span v-else aria-hidden="true">×</span>
    </button>
  </div>
</template>
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { datasets, methods } from '@/data/demo'
import { useLocale } from '@/composables/useLocale'
const { t } = useLocale()
const route = useRoute()
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)
const state = ref<'closed' | 'dial' | 'panel'>('closed')
const mode = ref<'dataset' | 'method'>('dataset')
const search = ref('')
const filtered = computed(() => (mode.value === 'dataset' ? datasets : methods).filter(item =>
  `${item.name} ${item.category}`.toLowerCase().includes(search.value.trim().toLowerCase())
))
const location = (id: string) => mode.value === 'dataset'
  ? { name: 'dataset-result', params: { datasetId: id } }
  : { name: 'method-result', params: { methodId: id } }
const isCurrent = (id: string) => mode.value === 'dataset' ? route.params.datasetId === id : route.params.methodId === id
function close() { state.value = 'closed'; trigger.value?.focus() }
async function openPanel() {
  mode.value = route.name === 'method-result' ? 'method' : 'dataset'
  state.value = 'panel'
  await nextTick()
  searchInput.value?.focus()
}
function goTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); close() }
function onKey(event: KeyboardEvent) { if (event.key === 'Escape' && state.value !== 'closed') close() }
function onPointer(event: PointerEvent) {
  if (state.value !== 'closed' && root.value && event.target instanceof Node && !root.value.contains(event.target)) {
    state.value = 'closed'
  }
}
onMounted(() => { document.addEventListener('keydown', onKey); document.addEventListener('pointerdown', onPointer) })
onBeforeUnmount(() => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onPointer) })
</script>
