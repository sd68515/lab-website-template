<template>
  <div class="demo-results">
    <template v-if="entity">
      <nav class="demo-results__breadcrumbs" :aria-label="t('Breadcrumb', '面包屑导航')">
        <RouterLink :to="{ name: 'home' }">{{ t('Home', '首页') }}</RouterLink><span>/</span>
        <RouterLink :to="{ name: kind === 'dataset' ? 'home' : 'methods' }">
          {{ kind === 'dataset' ? t('Datasets', '数据集') : t('Methods', '方法') }}
        </RouterLink><span>/</span><span>{{ entity.name }}</span>
      </nav>
      <div class="demo-results__layout">
        <aside class="demo-results__sidebar" :aria-label="t('On this page', '本页目录')">
          <p>{{ t('On this page', '本页目录') }}</p>
          <button type="button" @click="scrollTo('overview')">{{ t('Overview', '概览') }}</button>
          <button type="button" @click="scrollTo('results')">{{ t('Results', '结果') }}</button>
          <button v-for="item in counterparts" :key="item.id" type="button" @click="scrollTo(`result-${item.id}`)">
            {{ item.name }}
          </button>
          <button type="button" @click="scrollTop">{{ t('Back to top ↑', '返回顶部 ↑') }}</button>
        </aside>
        <div class="demo-results__content">
          <section id="overview" class="demo-results__overview">
            <h1>{{ entity.name }}</h1>
            <p class="demo-results__intro">{{ localize(entity.description) }}</p>
            <dl class="demo-results__metadata">
              <div><dt>{{ t('Category', '类别') }}</dt><dd>{{ entity.category }}</dd></div>
              <template v-if="dataset">
                <div><dt>{{ t('Type', '类型') }}</dt><dd>{{ dataset.type }}</dd></div>
                <div><dt>{{ t('Samples', '样本数') }}</dt><dd>{{ dataset.sampleCount.toLocaleString() }}</dd></div>
              </template>
              <div><dt>{{ t('Status', '状态') }}</dt><dd>{{ t('Illustrative example', '虚构示例') }}</dd></div>
              <div class="demo-results__metadata-wide">
                <dt>{{ t('Description', '描述') }}</dt><dd>{{ localize(entity.description) }}</dd>
              </div>
            </dl>
          </section>
          <section id="results" class="demo-results__section">
            <div class="demo-results__section-heading">
              <div>
                <h2>{{ t('Results', '结果') }}</h2>
                <p>{{ kind === 'dataset' ? t('Explore this dataset by method.', '按方法浏览此数据集的结果。') : t('Explore this method by dataset.', '按数据集浏览此方法的结果。') }}</p>
              </div>
              <span>{{ t('Example data', '示例数据') }}</span>
            </div>
            <article v-for="(item, index) in counterparts" :id="`result-${item.id}`" :key="item.id" class="demo-result-card">
              <header class="demo-result-card__header">
                <div>
                  <p>{{ kind === 'dataset' ? t('Method', '方法') : t('Dataset', '数据集') }} · {{ item.category }}</p>
                  <h3><RouterLink :to="counterpartLocation(item.id)">{{ item.name }}</RouterLink></h3>
                </div>
                <RouterLink class="demo-result-card__link" :to="counterpartLocation(item.id)">
                  {{ kind === 'dataset' ? t('View method', '查看方法') : t('View dataset', '查看数据集') }} →
                </RouterLink>
              </header>
              <p class="demo-result-card__description">{{ localize(item.description) }}</p>
              <div class="demo-result-card__body">
                <ResultImage
                  :src="imageUrl(item.id)"
                  :alt="t(`Result image for ${entity.name} and ${item.name}`, `${entity.name} 与 ${item.name} 的结果图片`)"
                  :demo-failure="index === 1 && !imageUrl(item.id)"
                />
                <div class="demo-result-card__metrics">
                  <h4>{{ t('General metrics', '通用指标') }}</h4>
                  <dl>
                    <div v-for="metric in generalMetrics" :key="metric.id">
                      <dt><RouterLink :to="{ name: 'metric', params: { metricId: metric.id } }">{{ metric.name }}</RouterLink></dt>
                      <dd>{{ value(metric.id, item.id) }}</dd>
                    </div>
                  </dl>
                </div>
              </div>
              <details class="demo-result-card__additional">
                <summary>{{ t('Additional metrics', '更多指标') }}</summary>
                <dl>
                  <div v-for="metric in additionalMetrics" :key="metric.id">
                    <dt><RouterLink :to="{ name: 'metric', params: { metricId: metric.id } }">{{ metric.name }}</RouterLink></dt>
                    <dd>{{ value(metric.id, item.id) }}</dd>
                  </div>
                </dl>
              </details>
            </article>
          </section>
        </div>
      </div>
      <ResultBrowser v-if="browserAvailable" />
    </template>
    <section v-else class="demo-results__not-found">
      <h1>{{ t('Result not found', '未找到结果') }}</h1>
      <p>{{ t('There is no example matching this address. Choose a dataset or method to continue.', '没有与此地址匹配的示例。请选择数据集或方法继续。') }}</p>
      <RouterLink :to="{ name: 'home' }">{{ t('Browse datasets', '浏览数据集') }}</RouterLink> ·
      <RouterLink :to="{ name: 'methods' }">{{ t('Browse methods', '浏览方法') }}</RouterLink>
    </section>
  </div>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import ResultBrowser from '@/components/result/ResultBrowser.vue'
import ResultImage from '@/components/result/ResultImage.vue'
import { datasets, methods, metrics, results, getMetricValue } from '@/data/demo'
import { useLocale } from '@/composables/useLocale'
import '@/styles/results.scss'

const props = defineProps<{ kind: 'dataset' | 'method' }>()
const route = useRoute()
const { t, localize } = useLocale()
const dataset = computed(() => props.kind === 'dataset' ? datasets.find(item => item.id === route.params.datasetId) : undefined)
const method = computed(() => props.kind === 'method' ? methods.find(item => item.id === route.params.methodId) : undefined)
const entity = computed(() => dataset.value ?? method.value)
const counterparts = computed(() => props.kind === 'dataset' ? methods : datasets)
const generalMetrics = metrics.filter(metric => metric.group === 'general')
const additionalMetrics = metrics.filter(metric => metric.group === 'additional')
const counterpartLocation = (id: string) => props.kind === 'dataset'
  ? { name: 'method-result', params: { methodId: id } }
  : { name: 'dataset-result', params: { datasetId: id } }

// Both views resolve the same result record, with the axes reversed.
// 两种视图以相反的维度查找同一条结果记录。
function resultFor(counterpartId: string) {
  const datasetId = props.kind === 'dataset' ? dataset.value?.id : counterpartId
  const methodId = props.kind === 'method' ? method.value?.id : counterpartId
  return results.find(result => result.datasetId === datasetId && result.methodId === methodId)
}
function imageUrl(counterpartId: string) {
  const result = resultFor(counterpartId)
  return result && 'imageUrl' in result && typeof result.imageUrl === 'string' ? result.imageUrl : ''
}
function value(metricId: string, counterpartId: string) {
  const result = resultFor(counterpartId)
  const v = result ? getMetricValue(metricId, result.datasetId, result.methodId) : undefined
  return v === undefined ? '—' : v.toFixed(2)
}
// Do not mutate the URL hash: it is owned by Vue Router.
// 不修改 URL 的 hash，因为它由 Vue Router 使用。
function scrollTo(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
function scrollTop() { window.scrollTo({ top: 0, behavior: 'smooth' }) }
const browserAvailable = ref(false)
function updateBrowser() { browserAvailable.value = window.innerWidth > 760 && window.innerHeight > 500 }
onMounted(() => { updateBrowser(); window.addEventListener('resize', updateBrowser) })
onBeforeUnmount(() => window.removeEventListener('resize', updateBrowser))
</script>
