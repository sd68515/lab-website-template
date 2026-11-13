import { MEASUREMENT_GENERAL_METRICS_PATHS } from './paths';

// 指标元数据配置

/**
 * 指标元数据类型定义
 */
export interface MetricMetadata {
  id: string;                       // 指标唯一标识（用于路由和文件名）
  name: string;                     // 原始名称，兼容图片路径与结果状态查询
  displayName?: string;             // 界面显示名，省略时使用原始名称
  category: 'general' | 'simulation-specific';  // 指标分类
  description: string;              // 指标描述
  hasRankHeatmap: boolean;          // 是否有 Rank 总图
  hasRealHeatmap: boolean;          // 是否有真实数据热图
  hasSimHeatmap: boolean;           // 是否有模拟数据热图
  hasToolDataSubplot: boolean;      // 是否有每个工具对每个数据的子图（真子图）
  hasDataAggregateSubplot: boolean; // 是否有每个数据的所有工具总评分图（伪子图）
  route: string;                    // 路由路径
}

/**
 * 所有指标的元数据配置
 */
export const METRICS_METADATA: MetricMetadata[] = [
// General Metrics

  {
    id: 'iccoh',
    name: 'ICCoh',
    displayName: 'Metric A',
    category: 'general',
    description: 'Illustrative example data. Replace it with your own project results.',
    hasRankHeatmap: true,
    hasRealHeatmap: true,
    hasSimHeatmap: true,
    hasToolDataSubplot: false,
    hasDataAggregateSubplot: true,
    route: MEASUREMENT_GENERAL_METRICS_PATHS.ICCOH
  },

  {
    id: 'cbdir',
    name: 'CBDir',
    displayName: 'Metric B',
    category: 'general',
    description: 'Illustrative example data. Replace it with your own project results.',
    hasRankHeatmap: true,
    hasRealHeatmap: true,
    hasSimHeatmap: true,
    hasToolDataSubplot: false,
    hasDataAggregateSubplot: true,
    route: MEASUREMENT_GENERAL_METRICS_PATHS.CBDIR
  },

  {
    id: 'transition-score',
    name: 'Transition score',
    displayName: 'Metric C',
    category: 'general',
    description: 'Illustrative example data. Replace it with your own project results.',
    hasRankHeatmap: true,
    hasRealHeatmap: true,
    hasSimHeatmap: true,
    hasToolDataSubplot: false,
    hasDataAggregateSubplot: true,
    route: MEASUREMENT_GENERAL_METRICS_PATHS.TRANSITION_SCORE
  },

  {
    id: 'angle-consistency',
    name: 'Angle consistency',
    displayName: 'Metric D',
    category: 'general',
    description: 'Illustrative example data. Replace it with your own project results.',
    hasRankHeatmap: true,
    hasRealHeatmap: true,
    hasSimHeatmap: true,
    hasToolDataSubplot: true,        // 特殊：有每个工具对每个数据的真子图
    hasDataAggregateSubplot: false,  // 特殊：没有数据总评分图（伪子图）
    route: MEASUREMENT_GENERAL_METRICS_PATHS.ANGLE_CONSISTENCY
  },

  {
    id: 'consistency-score',
    name: 'Consistency score',
    displayName: 'Metric E',
    category: 'general',
    description: 'Illustrative example data. Replace it with your own project results.',
    hasRankHeatmap: true,
    hasRealHeatmap: true,
    hasSimHeatmap: true,
    hasToolDataSubplot: true,  // 特殊：既有真子图也有伪子图
    hasDataAggregateSubplot: true,
    route: MEASUREMENT_GENERAL_METRICS_PATHS.CONSISTENCY_SCORE
  },

  {
    id: 'usability',
    name: 'Usability',
    displayName: 'Metric F',
    category: 'general',
    description: 'Illustrative example data. Replace it with your own project results.',
    hasRankHeatmap: false,
    hasRealHeatmap: false,
    hasSimHeatmap: false,
    hasToolDataSubplot: false,
    hasDataAggregateSubplot: false,  // 特殊：使用表格展示
    route: MEASUREMENT_GENERAL_METRICS_PATHS.USABILITY
  },

// Simulation-Specific Metrics

  {
    id: 'ground-truth-correlation',
    name: 'Ground-truth correlation',
    displayName: 'Metric G',
    category: 'simulation-specific',
    description: 'Illustrative example data. Replace it with your own project results.',
    hasRankHeatmap: false,
    hasRealHeatmap: false,
    hasSimHeatmap: false,
    hasToolDataSubplot: false,
    hasDataAggregateSubplot: false,
    route: '/measurement/simulation/metric-g'
  },

  {
    id: 'running-time',
    name: 'Running time',
    displayName: 'Metric H',
    category: 'simulation-specific',
    description: 'Illustrative example data. Replace it with your own project results.',
    hasRankHeatmap: false,
    hasRealHeatmap: false,
    hasSimHeatmap: false,
    hasToolDataSubplot: false,
    hasDataAggregateSubplot: false,
    route: '/measurement/simulation/metric-h'
  },

  {
    id: 'memory-efficiency',
    name: 'Memory efficiency',
    displayName: 'Metric I',
    category: 'simulation-specific',
    description: 'Illustrative example data. Replace it with your own project results.',
    hasRankHeatmap: false,
    hasRealHeatmap: false,
    hasSimHeatmap: false,
    hasToolDataSubplot: false,
    hasDataAggregateSubplot: false,
    route: '/measurement/simulation/metric-i'
  },

  {
    id: 'down-sampling',
    name: 'Down-sampling',
    displayName: 'Metric J',
    category: 'simulation-specific',
    description: 'Illustrative example data. Replace it with your own project results.',
    hasRankHeatmap: false,
    hasRealHeatmap: false,
    hasSimHeatmap: false,
    hasToolDataSubplot: false,
    hasDataAggregateSubplot: false,
    route: '/measurement/simulation/metric-j'
  },

  {
    id: 'batch-run',
    name: 'Batch-run',
    displayName: 'Metric K',
    category: 'simulation-specific',
    description: 'Illustrative example data. Replace it with your own project results.',
    hasRankHeatmap: false,
    hasRealHeatmap: false,
    hasSimHeatmap: false,
    hasToolDataSubplot: false,
    hasDataAggregateSubplot: false,
    route: '/measurement/simulation/metric-k'
  }
];

/**
 * 根据 ID 获取指标元数据
 */
export function getMetricById(id: string): MetricMetadata | undefined {
  return METRICS_METADATA.find(metric => metric.id === id);
}

/** Resolve presentation text without changing the legacy result/asset key. */
export function getMetricDisplayName(name: string): string {
  return METRICS_METADATA.find(metric => metric.name === name)?.displayName ?? name;
}

/**
 * 根据分类获取指标列表
 */
export function getMetricsByCategory(category: 'general' | 'simulation-specific'): MetricMetadata[] {
  if (category === 'general') {
    return GENERAL_METRICS_ORDER.map(name => {
      const metric = METRICS_METADATA.find(item => item.category === category && item.name === name);
      if (!metric) throw new Error(`Missing general metric metadata: ${name}`);
      return metric;
    });
  }
  return METRICS_METADATA.filter(metric => metric.category === category);
}

/**
 * 获取所有 General Metrics
 */
export function getGeneralMetrics(): MetricMetadata[] {
  return getMetricsByCategory('general');
}

/**
 * 获取所有 Simulation-Specific Metrics
 */
export function getSimulationSpecificMetrics(): MetricMetadata[] {
  return getMetricsByCategory('simulation-specific');
}

// 指标分类顺序配置

/**
 * 通用指标分类顺序（General Metrics）
 * 用于定义指标在界面上的显示顺序
 */
export const GENERAL_METRICS_ORDER = [
  'CBDir',
  'Transition score',
  'Angle consistency',
  'ICCoh',
  'Consistency score',
  'Usability'
] as const

/**
 * 模拟数据专属指标分类顺序 (Simulation-Specific Metrics)
 * 用于定义模拟数据特有指标在界面上的显示顺序
 */
export const SIMULATION_METRICS_ORDER = [
  'Ground-truth correlation',
  'Running time',
  'Memory efficiency',
  'Down-sampling',
  'Batch-run'
] as const

/**
 * Spatial 数据专属指标顺序（Spatial Metrics）
 * 用于空间模态数据的结果页。
 */
export const SPATIAL_METRICS_ORDER = [
  'Time consistency',
  'Velocity consistency'
] as const

// 指标短名称映射

/**
 * 获取结果项短名，用于缺失状态键和图像元数据。
 * General Metrics 的常用短名显式映射；其他指标转为小写并将空格替换为下划线。
 * 图像路径由调用方按指标类型确定，真子图不使用总评分图的命名规则。
 */
export function getMetricShortNames(category: string): string[] {
  const shortNameMappings: Record<string, string[]> = {
    // General Metrics 的结果项短名。
    'ICCoh': ['iccoh'],
    'iccoh': ['iccoh'],
    'CBDir': ['cbdir'],
    'cbdir': ['cbdir'],
    // Transition score 的结果项短名与图片文件名不同。
    'Transition score': ['transition'],
    'transition-score': ['transition'],
    'Consistency score': ['consistency_score'],
    'consistency-score': ['consistency_score']
  }

  return shortNameMappings[category] || [category.toLowerCase().replace(/\s+/g, '_')]
}
