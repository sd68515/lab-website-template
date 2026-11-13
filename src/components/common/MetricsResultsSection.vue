<!--
  评估指标结果展示部分组件
  用于在数据集/方法结果页面中展示多个指标类别下的评估结果图表
-->
<template>
  <!-- 指标展示区域：当有指标数据时显示 -->
  <section v-if="metrics.length" class="dataset-result-metrics-section">
    <!-- 指标区域标题 -->
    <h3 class="dataset-result-section-title">{{ displayText(title) }}</h3>

    <!-- 指标网格：按类别组织的指标卡片 -->
    <div v-if="availableMetrics.length" class="dataset-result-metrics-grid">
      <!-- 指标类别项：每个类别包含多个指标图片 -->
      <div
        v-for="{ metric, metricIndex } in availableMetrics"
        :key="resolveMetricKey(metric, metricIndex)"
        class="dataset-result-metric-category"
      >
        <!-- 指标类别标题：支持超链接跳转到指标详情页 -->
        <h4
          v-if="!enableTitleLinks"
          :class="[
            'dataset-result-metric-title',
            shouldUseSpatialMetricTitleStyle(metric.category) ? 'dataset-result-metric-title--spatial' : ''
          ]"
        >
          {{ displayText(getMetricDisplayName(metric.category)) }}
        </h4>
        <a
          v-else
          :href="getMetricRouteHref(metric.category)"
          target="_blank"
          rel="noopener noreferrer"
          :class="[
            'dataset-result-metric-title',
            'dataset-result-metric-title--link',
            metric.category === 'Usability' ? 'dataset-result-metric-title--usability' : ''
          ]"
          :title="text('metricsResultsSection.viewMoreAboutValue1', { value1: displayText(getMetricDisplayName(metric.category)) })"
          @click="handleMetricTitleClick(metric.category)"
        >
          <span>{{ displayText(getMetricDisplayName(metric.category)) }}</span>
          <span
            v-if="metric.category === 'Usability'"
            class="dataset-result-metric-title-hint"
          > {{ text('metricsResultsSection.clickToViewThisToolSUsability') }} </span>
        </a>

        <!-- 真子图指标：使用 MetricSubplotDisplay（Angle consistency / Consistency score detailed） -->
        <MetricSubplotDisplay
          v-if="isSubplotMetric(metric.category)"
          :metric="metric"
          @image-load="handleLoad"
          @image-error="handleError"
        />

        <!-- Usability：仅保留标题链接，不展示任何图片或占位符 -->
        <MetricHeatmaps
          v-else-if="metric.category !== 'Usability' && !isSimulationSpecificMetric(metric.category)"
          :metric="metric"
          :show-title="false"
          @image-load="handleLoad"
          @image-error="handleError"
        />
      </div>
    </div>

    <details
      v-if="unavailableMetrics.length"
      :key="`${currentTool}-${currentDatasetId}-${title}`"
      class="dataset-result-unavailable-metrics"
    >
      <summary class="dataset-result-unavailable-metrics__summary">
        <span class="dataset-result-unavailable-metrics__label">
          {{ text('metricsResultsSection.unavailableMetrics') }} ({{ unavailableMetrics.length }})
        </span>
        <v-icon class="dataset-result-unavailable-metrics__chevron" icon="$mdi-chevron-right" size="20" />
      </summary>
      <ul class="dataset-result-unavailable-metrics__list">
        <li
          v-for="{ metric, metricIndex, placeholders } in unavailableMetrics"
          :key="resolveMetricKey(metric, metricIndex)"
          class="dataset-result-unavailable-metric"
        >
          <a
            v-if="enableTitleLinks"
            :href="getMetricRouteHref(metric.category)"
            target="_blank"
            rel="noopener noreferrer"
            class="dataset-result-metric-title dataset-result-metric-title--link"
            :title="text('metricsResultsSection.viewMoreAboutValue1', { value1: displayText(getMetricDisplayName(metric.category)) })"
          >{{ displayText(getMetricDisplayName(metric.category)) }}</a>
          <h4
            v-else
            class="dataset-result-metric-title"
            :class="{ 'dataset-result-metric-title--spatial': shouldUseSpatialMetricTitleStyle(metric.category) }"
          >{{ displayText(getMetricDisplayName(metric.category)) }}</h4>
          <div class="dataset-result-unavailable-metric__states">
            <ResultImagePlaceholder
              v-for="(placeholder, index) in placeholders"
              :key="index"
              :placeholder="placeholder.mode === 'metric' && placeholder.reason ? { ...placeholder, reason: null } : placeholder"
            />
          </div>
        </li>
      </ul>
      <p
        v-for="group in unavailableReasonGroups"
        :key="group.reason"
        class="dataset-result-unavailable-metrics__reason"
      >
        <span v-if="group.categories.size < unavailableMetrics.length">{{ Array.from(group.categories, category => displayText(getMetricDisplayName(category))).join(', ') }}: </span>
        {{ displayText(group.reason) }}
      </p>
    </details>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { text, displayText } from '@/utils/locale'
import MetricHeatmaps from '@/components/common/MetricHeatmaps.vue';
import MetricSubplotDisplay from '@/components/common/MetricSubplotDisplay.vue';
import ResultImagePlaceholder from '@/components/common/ResultImagePlaceholder.vue';
import { getUnavailableMetricPlaceholders } from '@/utils/result/metricAvailability';
import { getMetricById, getMetricDisplayName } from '@/constants/metrics';
import { isSimulationSpecificMetric } from '@/constants/measurement-policy';
import { MEASUREMENT_GENERAL_METRICS_PATHS } from '@/constants/paths';
import { getUsabilityMethodName } from '@/constants/tools';
import { normalizeEfficiencyToolName, parseDatasetIdToEfficiencyFilters } from '@/constants/efficiency-tools';
import type { MetricCategorySection, MetricImageEntry } from '@/types';

interface Props {
  // 指标数据：包含所有要展示的指标类别和图片
  metrics: MetricCategorySection[];
  // 区域标题：默认为 'Evaluation Metrics'
  title?: string;
  // 是否启用标题链接：为指标标题添加跳转到详情页的超链接
  enableTitleLinks?: boolean;
  // 自定义指标键生成函数：用于生成指标类别的唯一键
  getMetricKey?: (metric: MetricCategorySection, index: number) => string | number;
  // 当前工具内部名称：用于构建 Usability 指标的链接参数
  currentTool?: string;
  // 当前数据集 ID（仅用于构建 Simulation-specific metrics 的跳转参数）
  currentDatasetId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Evaluation Metrics',
  enableTitleLinks: false,
  currentTool: '',
  currentDatasetId: ''
});

const USABILITY_AUTO_SCROLL_STORAGE_KEY = 'lab-template:usability:autoScroll';

const metricEntries = computed(() => props.metrics.map((metric, metricIndex) => ({
  metric,
  metricIndex,
  placeholders: getUnavailableMetricPlaceholders(metric)
})));
const availableMetrics = computed(() => metricEntries.value.filter(entry => !entry.placeholders.length));
const unavailableMetrics = computed(() => metricEntries.value.filter(entry => entry.placeholders.length));
const unavailableReasonGroups = computed(() => {
  const groups = new Map<string, Set<string>>();
  for (const { metric, placeholders } of unavailableMetrics.value) {
    for (const placeholder of placeholders) {
      if (placeholder.mode !== 'metric' || !placeholder.reason) continue;
      const categories = groups.get(placeholder.reason) ?? new Set<string>();
      categories.add(metric.category);
      groups.set(placeholder.reason, categories);
    }
  }
  return Array.from(groups, ([reason, categories]) => ({ reason, categories }));
});

const emit = defineEmits<{
  // 指标图片加载成功事件
  (e: 'image-load', image: MetricImageEntry): void;
  // 指标图片加载失败事件
  (e: 'image-error', image: MetricImageEntry): void;
}>();

// 判断是否为真子图指标：Angle consistency / Consistency score detailed
const isSubplotMetric = (category: string): boolean => {
  const normalized = category.trim();
  return (
    normalized === 'Angle consistency' ||
    normalized === 'Consistency score detailed'
  );
};

const shouldUseSpatialMetricTitleStyle = (category: string): boolean => {
  const normalized = category.trim();
  return normalized === 'Time consistency' || normalized === 'Velocity consistency';
};

// 根据指标名称获取详情页路由
const getMetricRoute = (metricName: string): string => {
  const metricId = metricName.toLowerCase().replace(/\s+/g, '-');
  const metricMetadata = getMetricById(metricId);

  if (metricMetadata) {
    return metricMetadata.route;
  }

  // 兜底：返回测度根页面并记录警告
  console.warn(
    `[MetricsResultsSection] Unknown metric: ${metricName}, falling back to measurement home`
  );
  return MEASUREMENT_GENERAL_METRICS_PATHS.ICCOH;
};

// 根据指标名称获取详情页 href（用于新标签页打开）
const getMetricRouteHref = (metricName: string): string => {
  const baseRoute = getMetricRoute(metricName);
  if (metricName === 'Usability' && props.currentTool) {
    const csvMethod = getUsabilityMethodName(props.currentTool);
    // autoScroll=true 标识从 DataResult/MethodResult 跳转，需要自动滚动到工具卡片
    return `#${baseRoute}?tool=${encodeURIComponent(csvMethod)}&autoScroll=true`;
  }

  if ((metricName === 'Running time' || metricName === 'Memory efficiency') && props.currentDatasetId) {
    const parsed = parseDatasetIdToEfficiencyFilters(props.currentDatasetId);
    if (parsed) {
      const params = new URLSearchParams({
        modality: parsed.modality,
        scale: parsed.scale,
        autoSelect: 'true'
      });

      if (parsed.topology) {
        params.set('topology', parsed.topology);
      }

      if (props.currentTool) {
        const efficiencyTool = normalizeEfficiencyToolName(props.currentTool);
        if (efficiencyTool) {
          params.set('tool', efficiencyTool);
        }
      }

      return `#${baseRoute}?${params.toString()}`;
    }
  }
  return `#${baseRoute}`;
};

const handleMetricTitleClick = (metricName: string) => {
  if (metricName !== 'Usability') {
    return;
  }
  if (!props.currentTool) {
    return;
  }
  const csvMethod = getUsabilityMethodName(props.currentTool);
  try {
    localStorage.setItem(
      USABILITY_AUTO_SCROLL_STORAGE_KEY,
      JSON.stringify({ tool: csvMethod, ts: Date.now(), source: 'tool-card' })
    );
  } catch {
    // 忽略存储失败（例如隐身模式禁用 storage），此时 Usability 将不会自动滚动
  }
};

// 解析指标键：优先使用自定义函数，否则使用 category-index 组合
const resolveMetricKey = (metric: MetricCategorySection, index: number) => {
  if (props.getMetricKey) {
    return props.getMetricKey(metric, index);
  }
  return `${metric.category}-${index}`;
};

// 处理图片加载成功：透传事件
const handleLoad = (image: MetricImageEntry) => {
  emit('image-load', image);
};

// 处理图片加载失败：透传事件
const handleError = (image: MetricImageEntry) => {
  emit('image-error', image);
};
</script>
