import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

/**
 * 计算底部偏移，用于“返回顶部”按钮或浮动导航避免遮挡 footer
 */
export function useFooterOffset(footerSelector = 'footer') {
  const offset = ref(0);

  const measure = () => {
    const footer = document.querySelector<HTMLElement>(footerSelector);
    if (!footer) {
      offset.value = 0;
      return;
    }
    const rect = footer.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    offset.value = Math.max(0, viewportHeight - rect.top);
  };

  const footerOffset = computed(() => offset.value);

  onMounted(() => {
    measure();
    window.addEventListener('resize', measure);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('resize', measure);
  });

  return {
    footerOffset,
    refresh: measure
  };
}
