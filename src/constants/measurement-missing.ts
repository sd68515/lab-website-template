/** Scientific failure truth and picture delivery share one result-state query. */
import truth from './generated/resultMissingTruth.json';
import { getBenchmarkFigureState } from './benchmark-results';

export type MissingReason = 'Out of metric' | 'Unable to compute' | 'Pending';
export type DatasetType = 'real' | 'simulated';

export interface MissingMetricConfig {
  metric: string;
  tool: string;
  datasets: string[];
  datasetType: DatasetType;
  reason: MissingReason;
}

/** Read-only compatibility export for tooling; calculation failures come from CSV. */
const missingMetricKeys: readonly string[] = truth.metricUnable
export const MISSING_METRICS_CONFIG: MissingMetricConfig[] = missingMetricKeys.flatMap(key => {
  const [type, id, tool, metric] = key.split('|');
  if (!id || !tool || !metric) throw new Error(`Invalid metric truth key: ${key}`);
  return (metric === 'Consistency score' ? [metric, 'Consistency score detailed'] : [metric])
    .map(name => ({
      metric: name,
      tool,
      datasets: [id],
      datasetType: type === 'real' ? 'real' as const : 'simulated' as const,
      reason: 'Unable to compute' as const
    }));
});

export function isMetricMissing(
  metric: string,
  tool: string,
  datasetId: number | string,
  datasetType: DatasetType
): { missing: boolean; reason?: MissingReason } {
  const state = getBenchmarkFigureState(
    tool, String(datasetId), datasetType === 'real' ? 'real' : 'simulation', metric
  );
  if (state === 'not_applicable') return { missing: true, reason: 'Out of metric' };
  if (state === 'unable_to_compute') return { missing: true, reason: 'Unable to compute' };
  if (state === 'pending') return { missing: true, reason: 'Pending' };
  return { missing: false };
}
