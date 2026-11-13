import { computed, type Ref } from 'vue';
import {
  MULTI_MODAL_REAL_DATASET_ID_SET,
  MULTI_MODAL_REAL_DATASET_TOOL_SUPPORT,
  REAL_RESULT_DATASET_ID_SET,
  TOOL_REAL_DATASET_MODAL_RANGE_SETS
} from '@/constants/datasets';
import {
  getToolPublicName,
  SIMULATION_SUPPORTED_TOOLS,
  TOOL_DEFINITIONS,
  hasPublishedToolResults,
  isSimulationSupportedTool
} from '@/constants/tools';
import { TOOL_REAL_DATASET_WHITELIST_SETS } from '@/constants/tool-dataset-support';
import { getBenchmarkCombinationState, isToolInSimulationModality } from '@/constants/benchmark-results';
import { excludesMetricResults } from '@/constants/result-display';

export interface MetricToolOption {
  label: string;
  value: string;
  category: string;
}

export function useMetricTools(params: {
  datasetType: Ref<'real' | 'simulated'>;
  datasetId?: Ref<string | number>;
}) {
  const { datasetType, datasetId } = params;

  const options = computed<MetricToolOption[]>(() => {
    const type = datasetType.value === 'real' ? 'real' : 'simulation';
    const id = datasetId?.value;

    if (type === 'real' && id && !REAL_RESULT_DATASET_ID_SET.has(String(id))) {
      return [];
    }

    const filtered = TOOL_DEFINITIONS.filter((tool) => {
      if (excludesMetricResults(tool.name)) return false;
      if (!hasPublishedToolResults(tool.name)) return false;
      if (id && getBenchmarkCombinationState(tool.name, String(id), type) === 'pending') return false;
      if (type === 'simulation') {
        if (!isSimulationSupportedTool(tool.name)) return false;
        if (id && !isToolInSimulationModality(tool.name, String(id))) return false;
        return true;
      }
      // 真实多组学数据集：仅允许列入白名单的工具
      if (id && MULTI_MODAL_REAL_DATASET_ID_SET.has(String(id))) {
        const allowed = MULTI_MODAL_REAL_DATASET_TOOL_SUPPORT[tool.name];
        if (Array.isArray(allowed) && allowed.length > 0) {
          return allowed.includes(String(id));
        }
        // 多组学数据集上，非白名单工具默认拒绝
        return false;
      }
      const modalRange = TOOL_REAL_DATASET_MODAL_RANGE_SETS[tool.name];
      if (modalRange && id) {
        return modalRange.has(String(id));
      }
      // 真实数据：结果集白名单检查。ATAC 工具选项已在多模态分支按模态范围处理。
      const whitelist = TOOL_REAL_DATASET_WHITELIST_SETS[tool.name];
      if (whitelist && id && !whitelist.has(String(id))) {
        return false;
      }

      return true;
    });

    const categoryOrder = ['Category A', 'Category C'];
    const toolOrderIndex = new Map(TOOL_DEFINITIONS.map((tool, index) => [tool.name, index]));
    const categoryIndex = (category: string) => {
      const index = categoryOrder.indexOf(category);
      return index === -1 ? categoryOrder.length : index;
    };

    return filtered
      .slice()
      .sort((a, b) => {
        const categoryDiff = categoryIndex(a.category) - categoryIndex(b.category);
        if (categoryDiff !== 0) return categoryDiff;
        return (toolOrderIndex.get(a.name) ?? 0) - (toolOrderIndex.get(b.name) ?? 0);
      })
      .map((tool) => ({
        label: getToolPublicName(tool.name),
        value: tool.name,
        category: tool.category
      }));
  });

  const simulationSupported = computed(() =>
    SIMULATION_SUPPORTED_TOOLS.filter(tool => !excludesMetricResults(tool))
  );

  return {
    options,
    simulationSupported
  };
}
