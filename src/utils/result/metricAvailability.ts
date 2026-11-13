import type { MetricCategorySection, PlaceholderDisplay } from '@/types'

function isUnavailable(placeholder: PlaceholderDisplay | null): placeholder is PlaceholderDisplay {
  return placeholder?.mode === 'compute' || placeholder?.mode === 'metric'
}

/** Only confirmed scientific states can move an entire metric out of the main results. */
export function getUnavailableMetricPlaceholders(metric: MetricCategorySection): PlaceholderDisplay[] {
  // Usability is a link-only metric, so an empty image list does not mean unavailable.
  if (metric.category === 'Usability') return []
  if (metric.placeholder) return isUnavailable(metric.placeholder) ? [metric.placeholder] : []
  if (!metric.images.length) return []

  const placeholders = metric.images.map(image => image.placeholder)
  // Preserve partially available metrics, pending images and runtime loading failures in place.
  return placeholders.every(isUnavailable) ? placeholders : []
}
