import type { PlaceholderSpec } from '@/types';
import truth from '../generated/resultMissingTruth.json';

export interface VelocityMissingConfig {
  section?: PlaceholderSpec;
  default?: PlaceholderSpec;
  items?: Record<string, PlaceholderSpec | null>;
}

export interface MetricsMissingCategoryConfig {
  section?: PlaceholderSpec;
  default?: PlaceholderSpec;
  items?: Record<string, PlaceholderSpec | null>;
}

export interface MetricsMissingConfig {
  section?: PlaceholderSpec;
  default?: PlaceholderSpec;
  categories?: Record<string, MetricsMissingCategoryConfig>;
}

export interface ToolMissingConfig {
  velocity?: VelocityMissingConfig | PlaceholderSpec;
  metrics?: MetricsMissingConfig | PlaceholderSpec;
}

export interface ToolNoResultConfig {
  type: 'full' | 'partial';
  reason: string;
  missing?: ToolMissingConfig;
}

/** Compatibility view of the shared CSV truth; do not maintain failure lists here. */
const map: Record<string, ToolNoResultConfig> = {};
const unavailableResults: readonly string[] = truth.unable
for (const key of unavailableResults) {
  const [, id, tool] = key.split('|');
  if (id && tool) map[`${tool}_${id}`] = { type: 'full', reason: 'Unable to compute' };
}

// No example result failures are configured by default.
// 默认没有配置示例结果失败记录。

export const DEFAULT_NO_RESULT_CONFIG: Record<string, ToolNoResultConfig> = map;
