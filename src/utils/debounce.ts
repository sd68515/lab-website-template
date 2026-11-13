/**
 * 简单防抖工具
 * @param fn 目标函数
 * @param delay 延迟毫秒
 */
export function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  delay = 200
): (...args: TArgs) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: TArgs) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}
