import type { LocalizedText } from '@/composables/useLocale'

// Replace this file with your project's records. These numbers are invented examples.
// 将本文件替换为项目自己的记录。所有数值均为虚构示例。
export interface DemoDataset {
  id: string
  name: string
  category: string
  type: string
  description: LocalizedText
  sampleCount: number
}
export interface DemoMethod {
  id: string
  name: string
  category: string
  description: LocalizedText
}
export type MetricKind = 'heatmap' | 'assessment' | 'line' | 'sampling' | 'bar'
export interface DemoMetric {
  id: string
  name: string
  group: 'general' | 'additional'
  kind: MetricKind
  description: LocalizedText
}
export interface DemoResult {
  datasetId: string
  methodId: string
  scores: number[]
  imageUrl?: string
}

export const datasets: DemoDataset[] = [
  { id: 'dataset-a', name: 'Dataset A', category: 'Group A', type: 'Type A', sampleCount: 1200,
    description: { en: 'An illustrative dataset for exploring the template.', zh: '用于体验模板的虚构数据集。' } },
  { id: 'dataset-b', name: 'Dataset B', category: 'Group B', type: 'Type B', sampleCount: 800,
    description: { en: 'A second illustrative dataset for comparisons.', zh: '用于演示比较功能的第二个虚构数据集。' } }
]
export const methods: DemoMethod[] = [
  { id: 'method-a', name: 'Method A', category: 'Group A',
    description: { en: 'A fictional method for demonstrating the interface.', zh: '用于演示界面的虚构方法。' } },
  { id: 'method-b', name: 'Method B', category: 'Group B',
    description: { en: 'Another fictional method for comparing results.', zh: '用于比较结果的另一种虚构方法。' } }
]
const demoDescription: LocalizedText = {
  en: 'Illustrative values for this example. Replace the data, labels and explanation with your own research.',
  zh: '此页面仅展示虚构示例数值。请替换为自己项目的数据、标签和说明。'
}
export const metrics: DemoMetric[] = [
  { id: 'metric-a', name: 'Metric A', group: 'general', kind: 'heatmap', description: demoDescription },
  { id: 'metric-b', name: 'Metric B', group: 'general', kind: 'heatmap', description: demoDescription },
  { id: 'metric-c', name: 'Metric C', group: 'general', kind: 'heatmap', description: demoDescription },
  { id: 'metric-d', name: 'Metric D', group: 'general', kind: 'heatmap', description: demoDescription },
  { id: 'metric-e', name: 'Metric E', group: 'general', kind: 'heatmap', description: demoDescription },
  { id: 'metric-f', name: 'Metric F', group: 'general', kind: 'assessment', description: demoDescription },
  { id: 'metric-g', name: 'Metric G', group: 'additional', kind: 'heatmap', description: demoDescription },
  { id: 'metric-h', name: 'Metric H', group: 'additional', kind: 'line', description: demoDescription },
  { id: 'metric-i', name: 'Metric I', group: 'additional', kind: 'line', description: demoDescription },
  { id: 'metric-j', name: 'Metric J', group: 'additional', kind: 'sampling', description: demoDescription },
  { id: 'metric-k', name: 'Metric K', group: 'additional', kind: 'bar', description: demoDescription }
]
export const results: DemoResult[] = [
  { datasetId: 'dataset-a', methodId: 'method-a', scores: [0.82, 0.71, 0.69, 0.76, 0.83, 0.71, 0.77, 0.54, 0.61, 0.72, 0.85] },
  { datasetId: 'dataset-a', methodId: 'method-b', scores: [0.68, 0.79, 0.73, 0.65, 0.76, 0.67, 0.68, 0.67, 0.71, 0.64, 0.72] },
  { datasetId: 'dataset-b', methodId: 'method-a', scores: [0.72, 0.64, 0.81, 0.70, 0.68, 0.76, 0.69, 0.61, 0.55, 0.70, 0.79] },
  { datasetId: 'dataset-b', methodId: 'method-b', scores: [0.78, 0.68, 0.75, 0.82, 0.72, 0.80, 0.74, 0.72, 0.66, 0.78, 0.81] }
]

/** IDs, rather than translated labels, connect routes, tables and charts.
 * 使用稳定 ID 而非翻译后的名称连接路由、表格和图表。 */
export function getMetricValue(metricId: string, datasetId: string, methodId: string): number | undefined {
  const metricIndex = metrics.findIndex(metric => metric.id === metricId)
  if (metricIndex < 0) return undefined
  return results.find(result => result.datasetId === datasetId && result.methodId === methodId)?.scores[metricIndex]
}
