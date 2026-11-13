import { computed, onBeforeUnmount, onMounted, ref, type Ref } from 'vue';
import { debounce } from '@/utils/debounce';
import { getScrollbarWidth } from '@/utils/scrollbar';
import { NAV_HEIGHT, SUB_NAV_HEIGHT } from '@/constants/measurement-layout';
import { useScrollContainer } from '@/composables/useScrollContainer';

export interface NavigationSection {
  id: string;
  label: string;
  offsetTop?: number;
}

interface UseNavigationSyncOptions {
  sections: Ref<NavigationSection[]>;
  topOffset?: number;
  subNav?: boolean;
}

/**
 * 侧边导航与滚动同步
 * - 监听滚动并更新当前激活的 section
 * - 提供平滑滚动到指定 section 的方法
 */
export function useNavigationSync(options: UseNavigationSyncOptions) {
  const { sections, topOffset = NAV_HEIGHT, subNav = false } = options;
  const activeId = ref<string>('');
  const scrollOffset = computed(() => topOffset + (subNav ? SUB_NAV_HEIGHT : 0));
  const scrollContainer = useScrollContainer();
  let unsubscribe: (() => void) | null = null;

  const handleScroll = debounce(() => {
    const current = computeActiveSection(
      sections.value,
      scrollOffset.value,
      scrollContainer.containerRef.value,
      scrollContainer.scrollTop.value
    );
    if (current) activeId.value = current;
  }, 50);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    scrollContainer.scrollToElement(el, scrollOffset.value, 'smooth');
  };

  onMounted(() => {
    unsubscribe = scrollContainer.onScroll(() => handleScroll());
    handleScroll();
  });

  onBeforeUnmount(() => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  });

  return {
    activeId,
    scrollOffset,
    scrollbarWidth: getScrollbarWidth(),
    scrollToSection,
    refresh: handleScroll
  };
}

function computeActiveSection(
  sections: NavigationSection[],
  offset: number,
  container: HTMLElement | null,
  currentScrollTop: number
): string | null {
  let candidate: string | null = null;
  const containerRect = container ? container.getBoundingClientRect() : null;
  for (const section of sections) {
    const el = document.getElementById(section.id);
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    const absoluteTop = container && containerRect
      ? rect.top - containerRect.top + currentScrollTop
      : rect.top + currentScrollTop;
    const top = absoluteTop - offset;

    if (currentScrollTop >= top) {
      candidate = section.id;
    } else {
      break;
    }
  }
  return candidate;
}
