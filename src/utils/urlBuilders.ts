/**
 * URL 构建与规范化工具
 * 用于基因/出版物链接和通用 URL 处理
 */
import type { InfoLinkSegment } from '@/types/results';
export type { InfoLinkSegment } from '@/types/results';

/**
 * 规范化 URL，返回 null 表示无效或空
 */
export function normalizeUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) return null;
  try {
    return new URL(trimmed).href;
  } catch {
    return null;
  }
}

const isUrl = (value: string) => /^https?:\/\//i.test(value);

/**
 * 构建 Accession 链接（支持常见数据库前缀）
 */
export function buildAccessionLink(value: string): string | null {
  if (!value || value === 'NA') return null;
  const trimmed = value.trim();
  if (isUrl(trimmed)) return trimmed;
  const patterns = [
    { regex: /^GSE\d+$/i, base: 'https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=' },
    { regex: /^GSM\d+$/i, base: 'https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=' },
    { regex: /^SRP\d+$/i, base: 'https://www.ncbi.nlm.nih.gov/sra/?term=' },
    { regex: /^PRJNA\d+$/i, base: 'https://www.ncbi.nlm.nih.gov/search/all/?term=' },
    { regex: /^CNP\d+$/i, base: 'https://db.cngb.org/data_resources/?query=' },
    { regex: /^E-MTAB-\d+$/i, base: 'https://www.ebi.ac.uk/biostudies/studies?query=' }
  ];
  const matched = patterns.find(pattern => pattern.regex.test(trimmed));
  if (matched) {
    return `${matched.base}${encodeURIComponent(trimmed)}`;
  }
  return null;
}

/**
 * 将 accession 文本拆分为可点击段落
 */
export function buildAccessionSegments(value: string): InfoLinkSegment[] | null {
  if (!value || value === 'NA') return null;
  const trimmed = value.trim();
  if (isUrl(trimmed)) {
    return [{ text: value, link: trimmed }];
  }
  const text = value;
  const segments: InfoLinkSegment[] = [];
  const regex = /(GSE\d+|GSM\d+)/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let matchedAny = false;

  while ((match = regex.exec(text)) !== null) {
    matchedAny = true;
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), link: null });
    }
    const accession = match[0];
    segments.push({
      text: accession,
      link: `https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=${accession}`
    });
    lastIndex = regex.lastIndex;
  }

  if (!matchedAny) {
    return null;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), link: null });
  }

  return segments;
}

/**
 * 构建出版物链接，支持 PMID / DOI / 直接 URL
 */
export function buildPublicationLink(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || /^(?:NA|N\/A)$/i.test(trimmed)) return null;
  if (/^\d+$/.test(trimmed)) {
    return `https://pubmed.ncbi.nlm.nih.gov/${trimmed}`;
  }
  if (isUrl(trimmed)) {
    return normalizeUrl(trimmed);
  }
  const doi = trimmed.replace(/^doi:\s*/i, '');
  if (!/^10\.\d{4,9}\/\S+$/i.test(doi)) return null;
  return `https://doi.org/${encodeURIComponent(doi).replace(/%2F/gi, '/')}`;
}
