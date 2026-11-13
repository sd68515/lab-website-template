export function resolveBaseUrl(): string {
  const baseUrl = import.meta.env.BASE_URL
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
}

function encodePath(path: string): string {
  return path.split('/').map(segment => encodeURIComponent(decodeURIComponent(segment))).join('/')
}

export function resolvePublicAsset(relativePath: string): string {
  let path = relativePath.replace(/^\/+/, '')
  if (path.startsWith('images/home/')) path = path.replace('images/home/', 'images/ui/home/')
  if (path.startsWith('images/icon/measurements/')) path = path.replace('images/icon/measurements/', 'images/ui/icons/metrics/')
  if (path.startsWith('images/footer/')) path = path.replace('images/footer/', 'images/ui/branding/')
  return `${resolveBaseUrl()}${encodePath(path)}`
}

const figureScopes: Record<string, string> = {
  base: 'real', sim_base: 'simulation', atac_base: 'real', atac_sim_base: 'simulation',
  spatial_base: 'real', spatial_sim_base: 'simulation', lineage_base: 'real',
  chromatin_base: 'real'
}

const metricScopes: Record<string, string> = {
  General_Metrics_real: 'real', General_Metrics_sim: 'simulation',
  General_Metrics_atac: 'real', General_Metrics_atac_sim: 'simulation',
  General_Metrics_spatial: 'real', General_Metrics_spatial_sim: 'simulation',
  General_Metrics_lineage: 'real'
}

const heatmapMetrics: Record<string, string> = {
  ICCoh: 'iccoh', CBDir: 'cbdir', Transition_score: 'transition_score',
  Angle_consistency: 'angle_consistency', Consistency_score: 'consistency_score',
  'Ground-truth_correlation': 'ground_truth_correlation'
}

/** Translate old published paths while page callers move to canonical paths. */
export function mapBenchmarkImageToWebp(relativePath: string): string {
  const normalized = relativePath.replace(/^\/+/, '')
  const legacy = normalized
    .replace(/^images\/velocity_result_webp\//, 'images/velocity_result/')
    .replace(/^images\/measurements_webp\//, 'images/measurements/')
    .replace(/\.webp$/i, '.png')
  if (legacy.startsWith('images/benchmark/')) return legacy.replace(/\.png$/i, '.webp')

  const figure = legacy.match(/^images\/velocity_result\/([^/]+)\/(.+)\.png$/i)
  if (figure) {
    const folder = figure[1] ?? ''
    const remainder = figure[2] ?? ''
    if (folder === 'groundtruthstream' || folder === 'atac_groundtruthstream') {
      const dataset = remainder.replace(/_groundtruthstream$/, '')
      return `images/benchmark/datasets/simulation/${dataset}/groundtruth_stream.webp`
    }
    const scope = figureScopes[folder]
    if (scope) {
      const parts = remainder.split('/')
      const file = parts[parts.length - 1] ?? ''
      const role = folder === 'chromatin_base' ? 'stream'
        : folder === 'sim_base' && remainder.startsWith('dimred/')
          ? file.match(/_(umap|tsne|dimred)$/)?.[1]
          : remainder.split('/')[0]
      if (role && file.endsWith(`_${role}`)) {
        const identity = file.slice(0, -role.length - 1)
        const separator = identity.indexOf('_')
        if (separator > 0) {
          const method = identity.slice(0, separator)
          const dataset = identity.slice(separator + 1)
          const canonicalRole = ['umap', 'dimred', 'tsne', 'spatial_visualization'].includes(role)
            ? 'cell_map' : role
          return `images/benchmark/results/${scope}/${dataset}/${method}/${canonicalRole}.webp`
        }
      }
    }
  }

  const measurement = legacy.match(/^images\/measurements\/([^/]+)\/(.+)\.png$/i)
  if (measurement) {
    const folder = measurement[1] ?? ''
    const remainder = measurement[2] ?? ''
    const scope = metricScopes[folder]
    if (scope) {
      const [metric, filename] = remainder.split('/')
      if (metric && filename?.endsWith(`_${metric}`)) {
        const identity = filename.slice(0, -metric.length - 1)
        if (metric === 'angle_consistency' || metric === 'consistency_score_detailed') {
          const separator = identity.indexOf('_')
          if (separator > 0) {
            return `images/benchmark/results/${scope}/${identity.slice(separator + 1)}/${identity.slice(0, separator)}/metrics/${metric}.webp`
          }
        } else {
          return `images/benchmark/datasets/${scope}/${identity}/metrics/${metric}.webp`
        }
      }
    }
    if (folder === 'Spatial_Metrics') {
      const match = remainder.match(/^(time_consistency|velocity_consistency)_(real|sim)$/)
      if (match) {
        const overviewScope = match[2] === 'real' ? 'real' : 'simulation'
        return `images/benchmark/overviews/${overviewScope}/spatial/${match[1]}.webp`
      }
    }
    if (folder === 'real_all_heatmap' || folder === 'sim_all_heatmap') {
      const overviewScope = folder === 'real_all_heatmap' ? 'real' : 'simulation'
      const suffix = overviewScope === 'real' ? '_real_heatmap' : '_sim_heatmap'
      const metric = heatmapMetrics[remainder.replace(new RegExp(`${suffix}$`), '')]
      if (metric) return `images/benchmark/overviews/${overviewScope}/scrna/${metric}.webp`
    }
  }
  return normalized
}

export function resolveBenchmarkImageAsset(relativePath: string): string {
  return resolvePublicAsset(mapBenchmarkImageToWebp(relativePath))
}
