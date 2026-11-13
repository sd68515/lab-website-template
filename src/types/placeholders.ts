/**
 * 占位符与结果状态类型
 * 供结果页、占位组件和 placeholderUtils 复用
 */

export type PlaceholderMode = 'upload' | 'compute' | 'metric' | 'pending' | 'empty' | 'unknown';

/**
 * 占位符展示对象
 * mode 表示当前状态；message/label/reason 作为提示文案
 */
export interface PlaceholderDisplay {
  mode: PlaceholderMode;
  message?: string | null;
  label?: string | null;
  reason?: string | null;
}

/**
 * 占位符解析配置（原始输入，可为字符串或对象）
 */
export type PlaceholderSpec =
  | string
  | null
  | undefined
  | {
      mode?: PlaceholderMode;
      message?: string | null;
      label?: string | null;
      reason?: string | null;
    };

/**
 * 静态业务状态与图片运行状态；idle 表示尚未发起图片请求，不是待交付
 */
export type ResultStatus = PlaceholderMode | 'idle' | 'loaded' | 'error';
