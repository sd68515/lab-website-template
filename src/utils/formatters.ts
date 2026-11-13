/**
 * 模拟数据标识与格式化工具
 * 提供形状归一化、尺寸格式化、标识符拼接等方法
 */
import { formatNumber } from './locale'

/**
 * 将模拟数据形状归一化为 key（用于路径/文件名）
 */
export function normalizeSimulationShapeKey(shape: string): string {
  if (!shape) return 'custom';
  const normalized = shape.trim().toLowerCase();
  const predefined: Record<string, string> = {
    'linear simple': 'linear-simple',
    'cycle simple': 'cycle-simple',
    bifurcating: 'bifurcating',
    'bifurcating loop': 'bifurcating-loop',
    'consecutive bifurcating': 'consecutive-bifurcating',
    trifurcating: 'trifurcating',
    'disconnected structure': 'disconnected',
    disconnected: 'disconnected',
    'bursting tree': 'bursting-tree',
    'lineage tracing': 'lineage-tracing'
  };
  if (predefined[normalized]) {
    return predefined[normalized];
  }
  return normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-+/, '').replace(/-+$/, '') || 'custom';
}

/**
 * 将尺寸字符串（如 "1000*10000"）格式化成人类可读形式
 */
export function formatSimulationScale(size: string | undefined): string {
  const { cells, genes } = parseSimulationSize(size);
  return `${formatNumberWithCommas(cells)} × ${formatNumberWithCommas(genes)}`;
}

/**
 * 生成模拟数据唯一标识：{shapeKey}_cell{cells}_gene{genes}
 */
export function buildSimulationIdentifier(shape: string | undefined, size: string | undefined): string {
  const shapeKey = normalizeSimulationShapeKey(shape ?? '');
  const { cells, genes } = parseSimulationSize(size);
  return `${shapeKey}_cell${sanitizeNumericSegment(cells)}_gene${sanitizeNumericSegment(genes)}`;
}

function parseSimulationSize(size: string | undefined): { cells: string; genes: string } {
  if (!size) return { cells: '', genes: '' };
  const [cellsRaw = '', genesRaw = ''] = size.split('*');
  return { cells: cellsRaw.trim(), genes: genesRaw.trim() };
}

function sanitizeNumericSegment(value: string): string {
  return value ? value.replace(/,/g, '') : 'custom';
}

function formatNumberWithCommas(value: string): string {
  if (!value) return value;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? formatNumber(numeric, { useGrouping: true, maximumFractionDigits: 0 }) : value;
}
