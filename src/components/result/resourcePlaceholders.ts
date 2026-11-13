import type { MetricImageEntry, VelocityResultEntry } from '@/types'

// A missing resource must be an explicit placeholder, not an image request.
// 未配置资源时显示占位，避免向当前页面或缺失地址发起图片请求。
export function withImagePlaceholders<T extends MetricImageEntry | VelocityResultEntry>(images: T[]): T[] {
  return images.map(image => image.imageUrl || image.placeholder
    ? image
    : { ...image, placeholder: { mode: 'upload' } })
}
