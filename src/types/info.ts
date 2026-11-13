/**
 * 元数据与信息条目类型
 * 用于 MethodResult 元数据卡、通用信息列表等（链接/图片/消息均可）
 */

export type InfoEntryType = 'text' | 'link' | 'image' | 'message';

export interface InfoEntry {
  key: string;
  label: string;
  value: string;
  type: InfoEntryType;
  href?: string | null;
  imageUrl?: string | null;
  alt?: string | null;
  message?: string | null;
  messageType?: 'muted' | 'alert' | 'warning';
  messageDisplay?: 'inline' | 'placeholder';
  isLong?: boolean;
}
