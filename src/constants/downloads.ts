// File downloads are not configured in this example template.
// 示例模板尚未配置文件下载。
export const DOWNLOAD_BUNDLES = {
  real: { url: '', bytes: 0 },
  simulation: { url: '', bytes: 0 }
} as const
export type BundleKey = keyof typeof DOWNLOAD_BUNDLES
export const getBundleSizeLabel = (_key: BundleKey): string => ''
