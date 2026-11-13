import { getToolPublicName } from '@/constants/tools'

/**
 * 路由与路径常量
 * Hash 模式下使用的路径片段。
 */

export const DATASET_TYPE = {
  REAL: 'real',
  SIMULATION: 'simulation'
} as const;

export type DatasetType = (typeof DATASET_TYPE)[keyof typeof DATASET_TYPE];

/**
 * 页面路径片段（Hash 前缀由路由 history 处理）
 */
export const PATHS = {
  HOME: '/',
  TOOLS: '/tools',
  HELP: '/Help',
  ABOUT: '/about',
  DOWNLOAD: '/download',
  DATASET_RESULT: '/datasetResult',
  METHOD_RESULT: '/methodResult',
  MEASUREMENT: '/measurement',
  GENERAL_METRICS_BASE: '/measurement/general-metrics',  // 新前缀
  SIMULATION_BASE: '/measurement/simulation'
} as const;

/**
 * Measurement 子路径（便于生成导航）
 */
export const MEASUREMENT_GENERAL_METRICS_PATHS = {
  ICCOH: `${PATHS.GENERAL_METRICS_BASE}/metric-a`,
  CBDIR: `${PATHS.GENERAL_METRICS_BASE}/metric-b`,
  TRANSITION_SCORE: `${PATHS.GENERAL_METRICS_BASE}/metric-c`,
  ANGLE_CONSISTENCY: `${PATHS.GENERAL_METRICS_BASE}/metric-d`,
  CONSISTENCY_SCORE: `${PATHS.GENERAL_METRICS_BASE}/metric-e`,
  USABILITY: `${PATHS.GENERAL_METRICS_BASE}/metric-f`
} as const;

export const MEASUREMENT_SIMULATION_PATHS = {
  GROUND_TRUTH_CORRELATION: `${PATHS.SIMULATION_BASE}/metric-g`,
  RUNNING_TIME: `${PATHS.SIMULATION_BASE}/metric-h`,
  MEMORY_EFFICIENCY: `${PATHS.SIMULATION_BASE}/metric-i`,
  DOWN_SAMPLING: `${PATHS.SIMULATION_BASE}/metric-j`,
  BATCH_RUN: `${PATHS.SIMULATION_BASE}/metric-k`
} as const;

/**
 * 构建 DatasetResult / MethodResult 路径（Hash 路由使用）
 */
export const buildDatasetResultPath = (type: DatasetType, id?: string) =>
  `${PATHS.DATASET_RESULT}?type=${type}${id ? `&id=${id}` : ''}`;

export const buildMethodResultPath = (tool: string) =>
  `${PATHS.METHOD_RESULT}?tool=${encodeURIComponent(getToolPublicName(tool))}`;
