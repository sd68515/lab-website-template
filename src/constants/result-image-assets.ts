/** Map generated result-image identifiers to explicitly supplied image URLs.
 * Leave empty when the project has no images. Add only assets you intend to serve.
 * 将生成的结果图片标识映射到明确提供的图片 URL；没有图片时保持为空。
 */
export const RESULT_IMAGE_ASSETS: Readonly<Record<string, string>> = {}

export function configuredResultImage(generatedPath: string): string {
  return RESULT_IMAGE_ASSETS[generatedPath]?.trim() ?? ''
}
