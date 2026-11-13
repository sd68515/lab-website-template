<template>
  <div class="demo-metric-page">
    <nav
      ref="metricNav"
      class="demo-metric-nav"
      :aria-label="t('Metric navigation', '指标导航')"
    >
      <div
        v-for="group in metricGroups"
        :key="group.id"
        class="demo-metric-nav__group"
      >
        <span class="demo-metric-nav__label">{{ t(group.en, group.zh) }}</span>
        <RouterLink
          v-for="item in group.items"
          :key="item.id"
          :to="{ name: 'metric', params: { metricId: item.id } }"
          :aria-current="item.id === metric?.id ? 'page' : undefined"
          class="demo-metric-nav__link"
          >{{ item.name }}</RouterLink
        >
      </div>
    </nav>
    <template v-if="metric">
      <header class="demo-metric-hero">
        <h1>{{ metric.name }}</h1>
        <p>{{ localize(metric.description) }}</p>
      </header>

      <template v-if="metric.kind === 'assessment'">
        <div class="demo-assessment">
          <nav
            class="demo-assessment-nav"
            :aria-label="t('Select a method', '选择方法')"
          >
            <h2>{{ t('Methods', '方法') }}</h2>
            <button
              v-for="method in methods"
              :key="method.id"
              type="button"
              :class="{ active: assessmentMethod === method.id }"
              :aria-current="
                assessmentMethod === method.id ? 'true' : undefined
              "
              @click="assessmentMethod = method.id"
            >
              {{ method.name }}
            </button>
          </nav>
          <article class="demo-panel demo-assessment-detail">
            <div class="demo-assessment-heading">
              <h2>{{ selectedMethod?.name }}</h2>
              <div>
                <span>{{ t('Example score', '示例得分') }}</span><strong>{{
                  assessmentAverage
                }}</strong>
              </div>
            </div>
            <p>{{ selectedMethod && localize(selectedMethod.description) }}</p>
            <details open>
              <summary>
                {{ t('Assessment by dataset', '按数据集评估') }}
              </summary>
              <p>
                {{
                  t(
                    'These example entries illustrate how an assessment can be presented; they do not describe real methods.',
                    '这些示例条目展示评估结果的呈现方式，不代表真实方法。',
                  )
                }}
              </p>
              <ul>
                <li v-for="row in assessmentRows" :key="row.dataset.id">
                  <RouterLink
                    :to="{
                      name: 'dataset-result',
                      params: { datasetId: row.dataset.id },
                    }"
                    >{{ row.dataset.name }}</RouterLink><strong>{{
                    format(row.value)
                  }}</strong>
                </li>
              </ul>
            </details>
            <RouterLink
              :to="{
                name: 'method-result',
                params: { methodId: assessmentMethod },
              }"
              >{{ t('View method results', '查看方法结果') }} →</RouterLink
            >
          </article>
        </div>
      </template>

      <template v-else>
        <section
          class="demo-panel demo-chart-panel"
          :aria-labelledby="'chart-title'"
        >
          <div class="demo-panel-heading">
            <div>
              <h2 id="chart-title">{{ chartTitle }}</h2>
              <p>{{ chartDescription }}</p>
            </div>
          </div>
          <div class="demo-metric-filters">
            <label
              >{{ t('Dataset', '数据集')
              }}<select v-model="datasetId">
                <option value="">{{ t('All datasets', '全部数据集') }}</option>
                <option
                  v-for="dataset in datasets"
                  :key="dataset.id"
                  :value="dataset.id"
                >
                  {{ dataset.name }}
                </option>
              </select></label
            >
            <label
              >{{ t('Method', '方法')
              }}<select v-model="methodId">
                <option value="">{{ t('All methods', '全部方法') }}</option>
                <option
                  v-for="method in methods"
                  :key="method.id"
                  :value="method.id"
                >
                  {{ method.name }}
                </option>
              </select></label
            >
            <label v-if="metric.kind === 'sampling'"
              >{{ t('Sample fraction', '采样比例')
              }}<select v-model="fraction">
                <option value="">{{ t('All fractions', '全部比例') }}</option>
                <option v-for="n in fractions" :key="n" :value="String(n)">
                  {{ n }}%
                </option>
              </select></label
            >
            <button
              type="button"
              class="demo-reset"
              :disabled="!datasetId && !methodId && !fraction"
              @click="reset"
            >
              {{ t('Reset', '重置') }}
            </button>
          </div>
          <template v-if="rows.length">
            <MetricChart
              :option="chartOption"
              :label="
                chartTitle +
                '. ' +
                t(
                  'Values are also available in the table below.',
                  '数值也可在下方表格中查看。',
                )
              "
            />
            <p class="demo-chart-note">
              {{
                t(
                  'Illustrative values only. Derived series and sampling fractions demonstrate the interface, not measured results.',
                  '仅为虚构示例。曲线及采样比例由示例值推导，不代表实测结果。',
                )
              }}
            </p>
            <details class="demo-data-table">
              <summary>{{ t('View chart data', '查看图表数据') }}</summary>
              <div class="demo-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>{{ t('Dataset', '数据集') }}</th>
                      <th>{{ t('Method', '方法') }}</th>
                      <th>{{ t('Example value', '示例值') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="row in rows"
                      :key="row.dataset.id + row.method.id"
                    >
                      <td>
                        <RouterLink
                          :to="{
                            name: 'dataset-result',
                            params: { datasetId: row.dataset.id },
                          }"
                          >{{ row.dataset.name }}</RouterLink
                        >
                      </td>
                      <td>
                        <RouterLink
                          :to="{
                            name: 'method-result',
                            params: { methodId: row.method.id },
                          }"
                          >{{ row.method.name }}</RouterLink
                        >
                      </td>
                      <td>{{ tableValue(row.value) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </details>
          </template>
          <div v-else class="demo-metric-empty" role="status">
            {{
              t(
                'No example values match these filters. Reset the filters to see all results.',
                '没有符合筛选条件的示例值。重置筛选以查看全部结果。',
              )
            }}
          </div>
        </section>
        <section
          v-if="metric.kind === 'heatmap'"
          class="demo-panel demo-breakdown"
        >
          <h2>{{ t('Dataset-specific results', '数据集详情') }}</h2>
          <p>
            {{
              t(
                'Select a dataset above to compare its example values across methods.',
                '在上方选择数据集，比较各方法的示例值。',
              )
            }}
          </p>
          <div class="demo-breakdown-list">
            <div v-for="row in rows" :key="row.dataset.id + row.method.id">
              <span>{{ row.dataset.name }} · {{ row.method.name }}</span
              ><strong>{{ format(row.value) }}</strong>
            </div>
          </div>
        </section>
      </template>
    </template>
    <section v-else class="demo-panel demo-not-found">
      <h1>{{ t('Metric not found', '未找到指标') }}</h1>
      <p>
        {{
          t(
            'This metric is not available in the example.',
            '示例中没有这个指标。',
          )
        }}
      </p>
      <RouterLink :to="{ name: 'home' }">{{
        t('Return home', '返回首页')
      }}</RouterLink>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { EChartsOption } from 'echarts'
import MetricChart from '@/components/metrics/MetricChart.vue'
import { datasets, methods, metrics, getMetricValue } from '@/data/demo'
import { useLocale } from '@/composables/useLocale'
import { useAppearance } from '@/composables/useAppearance'
import '@/styles/metrics.scss'

const route = useRoute()
const { t, localize, locale } = useLocale()
const { isDark } = useAppearance()
const metric = computed(() =>
  metrics.find((item) => item.id === route.params.metricId),
)
const metricNav = ref<HTMLElement | null>(null)

// Keep the active item visible without moving the page vertically.
// 横向滚动到当前指标，不改变页面的垂直滚动位置。
async function revealActiveMetric() {
  await nextTick()
  const nav = metricNav.value
  const active = nav?.querySelector<HTMLElement>('[aria-current="page"]')
  if (!nav || !active) return
  const left = nav.scrollLeft + active.getBoundingClientRect().left - nav.getBoundingClientRect().left
  nav.scrollTo({ left: left - (nav.clientWidth - active.clientWidth) / 2, behavior: 'auto' })
}
onMounted(revealActiveMetric)
watch([() => route.params.metricId, locale], revealActiveMetric)

const metricGroups = [
  {
    id: 'general',
    en: 'General',
    zh: '通用指标',
    items: metrics.filter((item) => item.group === 'general'),
  },
  {
    id: 'additional',
    en: 'Additional',
    zh: '更多指标',
    items: metrics.filter((item) => item.group === 'additional'),
  },
]
const datasetId = ref('')
const methodId = ref('')
const fraction = ref('')
const fractions = [25, 50, 75, 100]
const assessmentMethod = ref(methods[0]?.id ?? '')
const selectedMethod = computed(() =>
  methods.find((item) => item.id === assessmentMethod.value),
)
function reset() {
  datasetId.value = ''
  methodId.value = ''
  fraction.value = ''
}
watch(() => route.params.metricId, reset)
const allRows = computed(() =>
  datasets.flatMap((dataset) =>
    methods.flatMap((method) => {
      const value = metric.value
        ? getMetricValue(metric.value.id, dataset.id, method.id)
        : undefined
      return value === undefined ? [] : [{ dataset, method, value }]
    }),
  ),
)
const rows = computed(() =>
  allRows.value.filter(
    (row) =>
      (!datasetId.value || row.dataset.id === datasetId.value) &&
      (!methodId.value || row.method.id === methodId.value),
  ),
)
const assessmentRows = computed(() =>
  allRows.value.filter((row) => row.method.id === assessmentMethod.value),
)
const assessmentAverage = computed(() =>
  assessmentRows.value.length
    ? format(
        assessmentRows.value.reduce((sum, row) => sum + row.value, 0) /
          assessmentRows.value.length,
      )
    : '—',
)
function format(value: number) {
  return value.toFixed(2)
}
// The trend and sampling examples are deterministic transformations of the
// fictional score, so the table and chart show the same illustrative values.
// 趋势与采样示例由虚构分数确定性推导，表格和图表保持一致。
function tableValue(value: number) {
  if (metric.value?.kind === 'sampling') {
    const selected = fraction.value ? [Number(fraction.value)] : fractions
    return selected
      .map((n) => `${n}%: ${format((value * n) / 100)}`)
      .join(' · ')
  }
  if (metric.value?.kind === 'line')
    return [1, 2, 3, 4, 5]
      .map((step, index) => `${step}: ${format(value * (0.6 + index * 0.1))}`)
      .join(' · ')
  return format(value)
}
const chartTitle = computed(() =>
  metric.value?.kind === 'heatmap'
    ? t('Overview across datasets and methods', '数据集与方法总览')
    : metric.value?.kind === 'sampling'
      ? t('Sampling comparison', '采样比较')
      : metric.value?.kind === 'bar'
        ? t('Comparison across datasets', '数据集比较')
        : t('Example trends', '示例趋势'),
)
const chartDescription = computed(() =>
  metric.value?.kind === 'heatmap'
    ? t(
        'Compare example scores across combinations.',
        '比较不同组合的示例得分。',
      )
    : t(
        'Use the filters to explore the example values.',
        '使用筛选器探索示例数值。',
      ),
)
// Recompute the option when filters, language, or appearance change.
// 筛选条件、语言或主题变化时重新生成图表配置。
const chartOption = computed<EChartsOption>(() => {
  const dark = isDark.value
  const foreground = dark ? '#e2e9ef' : '#3c4e5a'
  const gridColor = dark ? '#43525b' : '#dce4e7'
  const palette = ['#4e89a4', '#db8d55', '#71a583', '#ad7a9b']
  const common = {
    textStyle: { color: foreground, fontFamily: 'Inter, sans-serif' },
    color: palette,
    tooltip: { trigger: 'item' as const },
    grid: { left: 80, right: 32, top: 55, bottom: 65, containLabel: true },
  }
  const ds = datasets.filter(
    (item) => !datasetId.value || item.id === datasetId.value,
  )
  const ms = methods.filter(
    (item) => !methodId.value || item.id === methodId.value,
  )
  if (metric.value?.kind === 'heatmap') {
    return {
      ...common,
      tooltip: { position: 'top' },
      grid: { left: 110, right: 40, top: 30, bottom: 90, containLabel: true },
      xAxis: {
        type: 'category',
        data: ms.map((item) => item.name),
        axisLabel: { color: foreground },
      },
      yAxis: {
        type: 'category',
        data: ds.map((item) => item.name),
        axisLabel: { color: foreground },
      },
      visualMap: {
        min: 0,
        max: 1,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        textStyle: { color: foreground },
        inRange: { color: ['#eff5f5', '#a3c7c5', '#347a84'] },
      },
      series: [
        {
          type: 'heatmap',
          data: rows.value.map((row) => [
            ms.findIndex((item) => item.id === row.method.id),
            ds.findIndex((item) => item.id === row.dataset.id),
            row.value,
          ]),
          label: {
            show: true,
            color: '#182c31',
            formatter: (params: unknown) => {
              const p = params as { value: number[] }
              return p.value[2]?.toFixed(2) ?? ''
            },
          },
          emphasis: { itemStyle: { borderColor: '#263e48', borderWidth: 2 } },
        },
      ],
    }
  }
  const sampling = metric.value?.kind === 'sampling'
  const bar = metric.value?.kind === 'bar' || (sampling && !!fraction.value)
  if (bar) {
    const scale = sampling ? Number(fraction.value) / 100 : 1
    return {
      ...common,
      legend: { textStyle: { color: foreground } },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: ds.map((item) => item.name),
        axisLabel: { color: foreground },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 1,
        splitLine: { lineStyle: { color: gridColor } },
        axisLabel: { color: foreground },
      },
      series: ms.map((method) => ({
        name: method.name,
        type: 'bar' as const,
        barMaxWidth: 70,
        data: ds.map((dataset) => {
          const value = getMetricValue(metric.value!.id, dataset.id, method.id)
          return value === undefined ? null : Number((value * scale).toFixed(2))
        }),
      })),
    }
  }
  const labels = sampling
    ? fractions.map((n) => `${n}%`)
    : ['1', '2', '3', '4', '5']
  return {
    ...common,
    legend: { textStyle: { color: foreground }, type: 'scroll' },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      name: sampling ? t('Fraction', '比例') : t('Step', '步骤'),
      data: labels,
      axisLabel: { color: foreground },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 1,
      splitLine: { lineStyle: { color: gridColor } },
      axisLabel: { color: foreground },
    },
    series: rows.value.map((row) => ({
      name: `${row.dataset.name} · ${row.method.name}`,
      type: 'line' as const,
      symbolSize: 8,
      data: labels.map((_, index) =>
        Number(
          (
            row.value * (sampling ? fractions[index]! / 100 : 0.6 + index * 0.1)
          ).toFixed(2),
        ),
      ),
    })),
  }
})
</script>
