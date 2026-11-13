/**
 * 结果页通用数据类型定义
 * 覆盖 Dataset/Method 结果、工具结果与指标图片占位
 */
import type { PlaceholderDisplay, ResultStatus } from './placeholders';

/**
 * 指标分类字面量类型，确保分类字段类型安全
 */
export type MetricCategory =
  | 'ICCoh'
  | 'CBDir'
  | 'Transition score'
  | 'Angle consistency'
  | 'Consistency score'
  | 'Time consistency'
  | 'Velocity consistency'
  | 'Ground-truth correlation'
  | 'Running time'
  | 'Memory efficiency'
  | 'Down-sampling'
  | 'Batch-run'
  | 'Usability';

export interface InfoLinkSegment {
  text: string;
  link: string | null;
}

export interface DatasetDetailEntry {
  key: string;
  label: string;
  value: string;
  isLong: boolean;
  // Dataset 详情表专用条目，支持图片/链接/消息
  type: 'text' | 'image' | 'message';
  message?: string | null;
  messageType?: 'muted' | 'alert' | 'warning';
  messageDisplay?: 'inline' | 'placeholder';
  link?: string | null;
  links?: InfoLinkSegment[] | null;
  icon?: string | null;
  tooltip?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
}

export interface MetricImageEntry {
  name: string;
  shortName: string;
  imageUrl: string;
  placeholder: PlaceholderDisplay | null;
  status: ResultStatus;
  predetermined: boolean;
}

export interface MetricCategorySection {
  category: MetricCategory;
  images: MetricImageEntry[];
  placeholder: PlaceholderDisplay | null;
}

export interface VelocityResultEntry {
  type: string;
  label: string;
  imageUrl: string;
  placeholder: PlaceholderDisplay | null;
  status: ResultStatus;
  predetermined: boolean;
}

export interface DatasetTool {
  name: string;
  displayName: string;
  category: string;
  description: string;
  note?: string | null;
  velocityResults: VelocityResultEntry[];
  metricsResults: MetricCategorySection[];
  velocitySectionPlaceholder: PlaceholderDisplay | null;
  metricsSectionPlaceholder: PlaceholderDisplay | null;
  velocityPlaceholder: PlaceholderDisplay | null;
  noResultTitle: string | null;
  noResultReason: string | null;
  noResultDetail: string | null;
}

export interface ToolMetadata {
  toolName: string;
  paperTitle: string;
  paperLink: string | null;
  pmid: string | null;
  pmidLink: string | null;
  journal: string | null;
  year: string | null;
  platform: string | null;
  deepLearning: string | null;
}

export interface DatasetSection {
  key: string;
  anchorId: string;
  type: 'real' | 'simulation';
  title: string;
  navigationLabel: string;
  noResultReason: string | null;
  noResultDetail: string | null;
  metadataEntries: DatasetDetailEntry[];
  velocityResults: VelocityResultEntry[];
  velocityPlaceholder: PlaceholderDisplay | null;
  metrics: MetricCategorySection[];
  simulation?: {
    shape: string;
    shapeKey: string;
    cells: string;
    genes: string;
    sizeKey: string;
    simulationMode: 'full' | 'efficiency-only';
    additionalId?: string;
  };
}
