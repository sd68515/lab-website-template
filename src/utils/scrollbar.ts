/**
 * 滚动条相关工具：用于布局偏移与宽度计算
 */

let cachedScrollbarWidth: number | null = null;

/**
 * 获取浏览器原生滚动条宽度（含缓存）
 * 用于 fixed 定位元素避开滚动条区域
 */
export function getScrollbarWidth(): number {
  if (cachedScrollbarWidth !== null) {
    return cachedScrollbarWidth;
  }
  if (typeof document === 'undefined') {
    return 0;
  }
  const scrollDiv = document.createElement('div');
  scrollDiv.style.width = '100px';
  scrollDiv.style.height = '100px';
  scrollDiv.style.overflowY = 'scroll';
  scrollDiv.style.position = 'absolute';
  scrollDiv.style.top = '-9999px';
  document.body.appendChild(scrollDiv);
  cachedScrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
  document.body.removeChild(scrollDiv);
  return cachedScrollbarWidth || 0;
}
