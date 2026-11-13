<template>
  <div class="page-wrap catalog-page">
    <h1>{{ t('Tools', '工具') }}</h1>
    <p>{{ t('Explore the example methods included in this template.', '浏览此模板中的示例方法。') }}</p>
    <div class="catalog-filters">
      <label>
        <span>{{ t('Search methods', '搜索方法') }}</span>
        <input v-model.trim="query" type="search" :placeholder="t('Search by name or description', '按名称或描述搜索')">
      </label>
      <label>
        <span>{{ t('Category', '类别') }}</span>
        <select v-model="category">
          <option value="">{{ t('All', '全部') }}</option>
          <option v-for="item in categories" :key="item">{{ item }}</option>
        </select>
      </label>
      <button class="outline-button" type="button" @click="query = ''; category = ''">{{ t('Clear', '清除') }}</button>
    </div>
    <p class="result-count" aria-live="polite">{{ t(`${filtered.length} methods`, `${filtered.length} 个方法`) }}</p>
    <div class="table-scroll" role="region" tabindex="0" :aria-label="t('Methods table', '方法列表')">
      <table>
        <thead>
          <tr>
            <th scope="col">{{ t('Method', '方法') }}</th>
            <th scope="col">{{ t('Category', '类别') }}</th>
            <th scope="col">{{ t('Description', '简介') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="method in filtered" :key="method.id">
            <td>
              <RouterLink :to="{ name: 'method-result', params: { methodId: method.id } }">{{ method.name }}</RouterLink>
            </td>
            <td>{{ method.category }}</td>
            <td>{{ localize(method.description) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="!filtered.length" class="empty-state">
      {{ t('No methods match these filters. Try another search or clear the filters.', '没有匹配的方法。请尝试其他搜索词或清除筛选条件。') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { methods } from '@/data/demo'
import { useLocale } from '@/composables/useLocale'

const { t, localize } = useLocale()
const query = ref('')
const category = ref('')
const categories = [...new Set(methods.map(method => method.category))]

// Search both translations so changing languages does not change the matching records.
// 同时搜索两种语言，切换界面语言时匹配结果不会改变。
const filtered = computed(() => methods.filter(method => {
  const matchesCategory = !category.value || method.category === category.value
  const searchable = `${method.name} ${method.category} ${method.description.en} ${method.description.zh}`
  return matchesCategory && searchable.toLowerCase().includes(query.value.toLowerCase())
}))
</script>
