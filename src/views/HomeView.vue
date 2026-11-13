<template>
  <div class="home-page page-wrap">
    <section class="hero-grid">
      <div class="hero-visual">
        <h1>{{ t(`Welcome to ${localize(site.title)}!`, `欢迎使用${localize(site.title)}！`) }}</h1>
        <div
          class="hero-placeholder"
          role="img"
          :aria-label="t('Placeholder for a project overview image', '项目概览图片占位')"
        >
          <span>{{ t('Project overview image', '项目概览图片') }}</span>
          <small>{{ t('Replace this placeholder with your own illustration', '请替换为项目自己的示意图') }}</small>
        </div>
      </div>
      <div class="hero-copy">
        <p>{{ t('This example website provides a starting point for presenting a research benchmark. Explore illustrative datasets, methods and evaluation metrics in a consistent interface.', '此示例网站为展示研究基准提供起点。您可以通过统一界面浏览示例数据集、方法和评估指标。') }}</p>
        <p>{{ t('Browse results by dataset or method to compare examples, or select a metric below to see an illustrative visualization. All names and values shown here are fictional and should be replaced with your own project content.', '按数据集或方法浏览结果并比较示例，或选择下方指标查看示意可视化。此处的名称和数值均为虚构，请替换为您自己的项目内容。') }}</p>
      </div>
    </section>
    <section class="search-section" :aria-label="t('Browse results', '浏览结果')">
      <form class="search-row" @submit.prevent="openDataset">
        <h2>{{ t('View by data', '按数据浏览') }}</h2>
        <div class="search-fields">
          <label>
            <span>{{ t('Data category', '数据类别') }}</span>
            <select v-model="datasetCategory">
              <option value="">{{ t('All', '全部') }}</option>
              <option v-for="category in datasetCategories" :key="category">{{ category }}</option>
            </select>
          </label>
          <label>
            <span>{{ t('Dataset', '数据集') }}</span>
            <select v-model="datasetId" required>
              <option value="" disabled>{{ t('Select dataset', '选择数据集') }}</option>
              <option v-for="dataset in filteredDatasets" :key="dataset.id" :value="dataset.id">{{ dataset.name }}</option>
            </select>
          </label>
          <button class="action-button" type="submit">{{ t('Search', '查询') }}</button>
          <button class="outline-button" type="button" @click="datasetCategory = ''; datasetId = ''">{{ t('Clear', '清除') }}</button>
        </div>
      </form>
      <form class="search-row" @submit.prevent="openMethod">
        <h2>{{ t('View by tool', '按工具浏览') }}</h2>
        <div class="search-fields">
          <label>
            <span>{{ t('Method category', '方法类别') }}</span>
            <select v-model="methodCategory">
              <option value="">{{ t('All', '全部') }}</option>
              <option v-for="category in methodCategories" :key="category">{{ category }}</option>
            </select>
          </label>
          <label>
            <span>{{ t('Method', '方法') }}</span>
            <select v-model="methodId" required>
              <option value="" disabled>{{ t('Select method', '选择方法') }}</option>
              <option v-for="method in filteredMethods" :key="method.id" :value="method.id">{{ method.name }}</option>
            </select>
          </label>
          <button class="action-button" type="submit">{{ t('Search', '查询') }}</button>
          <button class="outline-button" type="button" @click="methodCategory = ''; methodId = ''">{{ t('Clear', '清除') }}</button>
        </div>
      </form>
    </section>
    <section class="metrics-section">
      <h2>{{ t('View by metric', '按指标浏览') }}</h2>
      <p>{{ t('Explore example results by evaluation metric.', '按评估指标浏览示例结果。') }}</p>
      <div class="metric-grid">
        <RouterLink
          v-for="metric in metrics"
          :key="metric.id"
          :to="{ name: 'metric', params: { metricId: metric.id } }"
        >{{ metric.name }}</RouterLink>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { datasets, methods, metrics } from '@/data/demo'
import { site } from '@/data/site'
import { useLocale } from '@/composables/useLocale'

const { t, localize } = useLocale()
const router = useRouter()
const datasetCategory = ref('')
const datasetId = ref('')
const methodCategory = ref('')
const methodId = ref('')
const datasetCategories = [...new Set(datasets.map(item => item.category))]
const methodCategories = [...new Set(methods.map(item => item.category))]
const filteredDatasets = computed(() => datasets.filter(item =>
  !datasetCategory.value || item.category === datasetCategory.value
))
const filteredMethods = computed(() => methods.filter(item =>
  !methodCategory.value || item.category === methodCategory.value
))

// Clear a selection only when the new category excludes it.
// 仅当新类别不包含当前选择时清除选择。
watch(datasetCategory, () => {
  if (!filteredDatasets.value.some(item => item.id === datasetId.value)) datasetId.value = ''
})
watch(methodCategory, () => {
  if (!filteredMethods.value.some(item => item.id === methodId.value)) methodId.value = ''
})

// Route parameters use stable IDs rather than display labels.
// 路由参数使用稳定 ID，而不是显示名称。
function openDataset() {
  if (datasetId.value) void router.push({ name: 'dataset-result', params: { datasetId: datasetId.value } })
}
function openMethod() {
  if (methodId.value) void router.push({ name: 'method-result', params: { methodId: methodId.value } })
}
</script>
