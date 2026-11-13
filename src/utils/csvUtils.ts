import Papa from 'papaparse';

/**
 * 将 CSV 文本解析为对象数组
 * - 使用 PapaParse 处理引号与逗号
 * - 自动移除 BOM
 * - 去掉空行
 */
export function csvTextToObjects<T extends Record<string, string | undefined> = Record<string, string>>(
  text: string
): T[] {
  if (!text) return [];
  const cleaned = text.replace(/^\uFEFF/, '');
  const { data } = Papa.parse<T>(cleaned, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    transformHeader: header => header.trim()
  });
  return (data || []).map((record) => {
    const normalized: Record<string, string> = {};
    Object.entries(record || {}).forEach(([key, value]) => {
      normalized[key] = value?.toString().trim() ?? '';
    });
    return normalized as T;
  });
}
