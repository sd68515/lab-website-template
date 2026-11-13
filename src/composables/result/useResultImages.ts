import type { MetricImageEntry, VelocityResultEntry } from '@/types'

export type ResultImageStatusEvent = {
  status: 'loaded' | 'error'
  imageUrl?: string
}

type ResultImageStatusListener = (event: ResultImageStatusEvent) => void

const imageStatusListeners = new Set<ResultImageStatusListener>()

function emitResultImageStatusChange(event: ResultImageStatusEvent): void {
  imageStatusListeners.forEach((listener) => listener(event))
}

export function onResultImageStatusChange(listener: ResultImageStatusListener): () => void {
  imageStatusListeners.add(listener)
  return () => imageStatusListeners.delete(listener)
}

export function useResultImages() {
  const handleVelocityImageLoad = (result: VelocityResultEntry): void => {
    result.status = 'loaded'
    emitResultImageStatusChange({ status: 'loaded', imageUrl: result.imageUrl })
  }

  const handleVelocityImageError = (result: VelocityResultEntry): void => {
    result.status = 'error'
    emitResultImageStatusChange({ status: 'error', imageUrl: result.imageUrl })
  }

  const handleMetricImageLoad = (image: MetricImageEntry): void => {
    image.status = 'loaded'
    emitResultImageStatusChange({ status: 'loaded', imageUrl: image.imageUrl })
  }

  const handleMetricImageError = (image: MetricImageEntry): void => {
    image.status = 'error'
    emitResultImageStatusChange({ status: 'error', imageUrl: image.imageUrl })
  }

  return {
    handleVelocityImageLoad,
    handleVelocityImageError,
    handleMetricImageLoad,
    handleMetricImageError
  }
}
