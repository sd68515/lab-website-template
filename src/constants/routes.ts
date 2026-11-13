import { MEASUREMENT_GENERAL_METRICS_PATHS } from './paths';

/**
 * 路由常量配置
 * 定义所有路由的名称和路径，确保路由配置的一致性
 */

// 路由名称常量：用于编程式导航和路由守卫
export const ROUTE_NAMES = {
  HOME: 'home',
  TOOLS: 'tools',
  DATASET_RESULT: 'datasetResult',
  METHOD_RESULT: 'methodResult',
  HELP: 'Help',
  ABOUT: 'about',
  DOWNLOAD: 'download',

  // Measurement 父路由
  MEASUREMENT: 'measurement',

  // General Metrics 子路由（名称常量沿用原有标识）
  ICCOH: 'ICCoh',
  CBDIR: 'CBDir',
  TRANSITION_SCORE: 'TransitionScore',
  ANGLE_CONSISTENCY: 'AngleConsistency',
  CONSISTENCY_SCORE: 'ConsistencyScore',
  USABILITY: 'Usability',

  // Simulation-Specific Metrics 子路由
  GROUND_TRUTH_CORRELATION: 'GroundTrueCorrelation',
  RUNNING_TIME: 'RunningTime',
  MEMORY_EFFICIENCY: 'MemoryEfficiency',
  SCALENE_ANALYSIS: 'ScaleneAnalysis',
  SCALENE_REPORT_VIEWER: 'ScaleneReportViewer',
  DOWN_SAMPLING: 'DownSampling',
  BATCH_RUN: 'BatchRun'
} as const

// 路由路径常量：URL 路径定义
export const ROUTE_PATHS = {
  HOME: '/',
  TOOLS: '/tools',
  DATASET_RESULT: '/datasetResult',
  METHOD_RESULT: '/methodResult',
  HELP: '/Help',
  ABOUT: '/about',
  DOWNLOAD: '/download',

  // Measurement 父路径
  MEASUREMENT: '/measurement',

  // General Metrics 子路径
  ICCOH: MEASUREMENT_GENERAL_METRICS_PATHS.ICCOH,
  CBDIR: MEASUREMENT_GENERAL_METRICS_PATHS.CBDIR,
  TRANSITION_SCORE: MEASUREMENT_GENERAL_METRICS_PATHS.TRANSITION_SCORE,
  ANGLE_CONSISTENCY: MEASUREMENT_GENERAL_METRICS_PATHS.ANGLE_CONSISTENCY,
  CONSISTENCY_SCORE: MEASUREMENT_GENERAL_METRICS_PATHS.CONSISTENCY_SCORE,
  USABILITY: MEASUREMENT_GENERAL_METRICS_PATHS.USABILITY,

  // Simulation-Specific Metrics 子路径
  GROUND_TRUTH_CORRELATION: '/measurement/simulation/metric-g',
  RUNNING_TIME: '/measurement/simulation/metric-h',
  MEMORY_EFFICIENCY: '/measurement/simulation/metric-i',
  SCALENE_ANALYSIS: '/measurement/simulation/scalene-analysis/:tool/:dataType',
  SCALENE_REPORT_VIEWER: '/measurement/simulation/scalene-report-viewer/:tool/:dataset',
  DOWN_SAMPLING: '/measurement/simulation/metric-j',
  BATCH_RUN: '/measurement/simulation/metric-k'
} as const

// 路由名称类型：从 ROUTE_NAMES 提取所有可能的值作为类型
export type RouteName = (typeof ROUTE_NAMES)[keyof typeof ROUTE_NAMES]
