import { computed } from 'vue';
import { isMetricSupportedInScope } from '@/constants/metric-scope-policy';
import { getBenchmarkFigureState } from '@/constants/benchmark-results';
import { getMetricById } from '@/constants/metrics';
import {
  getRealDatasetOptionsForMetric,
  isRealDatasetOutOfMetric,
  isRealDatasetUnableToCompute
} from '@/constants/measurement-datasets';
import { SIM_FULL_COMBOS } from '@/constants/datasets';
import {
  DATASET_ID_SIMULATION_DATASETS,
  topologyKeyToLabel
} from '@/constants/simulation';
import { buildSimulationIdentifier, normalizeSimulationShapeKey } from '@/utils/formatters';

export interface MetricDatasetOption {
  label: string;
  value: string | number;
  type: 'real' | 'simulation';
  shape?: string | undefined;
  shapeKey?: string | undefined;
  sizeKey?: string | undefined;
  simulationMode?: 'full' | 'efficiency-only' | undefined;
}

export function useMetricDatasets(metricId: string) {
  const realDatasetOptions = (role: 'aggregate' | 'tool'): MetricDatasetOption[] =>
    getRealDatasetOptionsForMetric(metricId, { role }).map(({ label, value }) => ({
      label: label.startsWith(`${value}_`) ? label : `${value} · ${label}`,
      value,
      type: 'real' as const
    }));
  const realOptions = computed(() => realDatasetOptions('tool'));
  const aggregateRealOptions = computed(() => realDatasetOptions('aggregate'));
  const totalRealOptions = computed(() => getRealDatasetOptionsForMetric(metricId, { includeInapplicable: true }).length);
  const excludedRealDatasetCount = computed(() => totalRealOptions.value - realOptions.value.length);
  const aggregateExcludedRealDatasetCount = computed(() => totalRealOptions.value - aggregateRealOptions.value.length);

  const simulationOptions = computed<MetricDatasetOption[]>(() => {
    const options: MetricDatasetOption[] = [];
    for (const [shape, combos] of Object.entries(SIM_FULL_COMBOS)) {
      const shapeKey = normalizeSimulationShapeKey(shape);
      // 完整模拟数据（包含全部指标）
      combos.full.forEach(([cells, genes]) => {
        const sizeKey = `${cells}*${genes}`;
        const datasetId = buildSimulationIdentifier(shape, sizeKey);
        options.push({
          label: datasetId,
          value: datasetId,
          type: 'simulation',
          shape,
          shapeKey,
          sizeKey,
          simulationMode: 'full'
        });
      });
    }

    // 基于 Dataset ID 的模拟数据（Additional / Bursting tree / Lineage tracing）
    DATASET_ID_SIMULATION_DATASETS.forEach((item) => {
      if (item.modality && !isMetricSupportedInScope(metricId, item.modality)) return;
      const shapeLabel = topologyKeyToLabel(item.topologyKey);
      const sizeKey =
        typeof item.cells === 'number' && typeof item.genes === 'number'
          ? `${item.cells}*${item.genes}`
          : undefined;
      const shapeKey = normalizeSimulationShapeKey(shapeLabel);
      options.push({
        label: item.id,
        value: item.id,
        type: 'simulation',
        shape: shapeLabel,
        shapeKey,
        ...(sizeKey ? { sizeKey } : {}),
        simulationMode: 'full'
      });
    });

    return options;
  });

  const isOutOfMetric = (datasetId: string | number) =>
    isRealDatasetOutOfMetric(metricId, datasetId);

  const isUnableToCompute = (datasetId: string | number) =>
    isRealDatasetUnableToCompute(metricId, datasetId);

  const aggregateSimulationOptions = computed(() => simulationOptions.value.filter(option =>
    getBenchmarkFigureState('*', String(option.value), 'simulation', getMetricById(metricId)?.name ?? metricId) !== 'not_applicable'
  ));

  return {
    realOptions,
    aggregateRealOptions,
    excludedRealDatasetCount,
    aggregateExcludedRealDatasetCount,
    simulationOptions,
    aggregateSimulationOptions,
    isOutOfMetric,
    isUnableToCompute
  };
}
