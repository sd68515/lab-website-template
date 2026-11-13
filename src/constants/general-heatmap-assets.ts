export type GeneralHeatmapMetric = 'iccoh' | 'cbdir' | 'transition-score' | 'angle-consistency' | 'consistency-score'
export type GeneralHeatmapAssetMetric = GeneralHeatmapMetric | 'ground-truth-correlation'
export type GeneralHeatmapScope = 'scRNA' | 'ATAC' | 'SPATIAL' | 'LINEAGE'
export type GeneralHeatmapSource = 'real' | 'simulation'

export type GeneralHeatmapAsset =
  | { status: 'ready'; src: string; width: number; height: number; alt: string }
  | { status: 'pending' }

/** No benchmark figures are shipped with the template. */
export function getGeneralHeatmapAsset(
  _metric: GeneralHeatmapAssetMetric,
  _scope: GeneralHeatmapScope,
  _source: GeneralHeatmapSource
): GeneralHeatmapAsset {
  return { status: 'pending' }
}
