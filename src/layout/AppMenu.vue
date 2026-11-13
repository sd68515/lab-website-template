<!-- 顶部导航菜单：Vuetify 版 -->
<template>
<v-app-bar
  class="top-menu-bar"
  height="64"
  flat
  elevate-on-scroll
  app
  color="surface"
  role="banner"
  :aria-label="text('appMenu.mainHeader')"
>
    <v-container ref="containerRef" class="top-menu-container" fluid>
      <div ref="leftWrapperRef" class="top-menu-left">
        <button
          :class="[
            'top-menu-arrow',
            'top-menu-arrow--left',
            { 'is-hidden': !showLeftArrow, 'is-visible': canScroll }
          ]"
          type="button"
          :aria-label="text('appMenu.scrollLeft')"
          :tabindex="showLeftArrow ? 0 : -1"
          @click="scrollLeft"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>

        <nav
          ref="navMenuRef"
          :class="['top-menu-nav', { 'is-scrollable': canScroll }]"
          role="navigation"
          :aria-label="text('appMenu.mainNavigation')"
          @scroll="updateArrowVisibility"
          @keydown="handleKeydown"
        >
          <v-btn
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            variant="text"
            class="top-menu-btn"
            :class="{ 'is-active': isActive(item.path) }"
            :aria-current="isActive(item.path) ? 'page' : undefined"
            height="64"
            :ripple="false"
          >
            {{ displayText(item.label) }}
          </v-btn>
        </nav>

        <button
          :class="[
            'top-menu-arrow',
            'top-menu-arrow--right',
            { 'is-hidden': !showRightArrow, 'is-visible': canScroll }
          ]"
          type="button"
          :aria-label="text('appMenu.scrollRight')"
          :tabindex="showRightArrow ? 0 : -1"
          @click="scrollRight"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>

      <div ref="actionsRef" class="top-menu-actions">
        <span
          ref="brandRef"
          translate="no"
          :class="['top-menu-brand', { 'top-menu-brand--hidden': hideBrand }]"
          :aria-label="text('appMenu.velocityBenchmarkingBrandTag')"
        > {{ text('appMenu.velocityBenchmarking') }} </span>
        <v-menu v-model="languageMenuOpen" location="bottom end" offset="8" content-class="language-menu" :close-on-content-click="false">
          <template #activator="{ props: menuProps }">
            <v-btn v-bind="menuProps" class="language-toggle" variant="text" rounded="circle" :icon="mdiTranslate"
              :aria-label="text('language.select')" :title="text('language.select')" width="44" height="44" :ripple="false" />
          </template>
          <v-list role="menu" rounded="app" :aria-label="text('language.select')">
            <v-list-item v-for="option in languageOptions" :key="option.value" role="menuitemradio"
              :aria-checked="uiLocale === option.value" :active="uiLocale === option.value" :disabled="languageBusy" rounded="app"
              @click="changeLanguage(option.value)">
              <v-list-item-title :lang="option.value" translate="no">{{ option.label }}</v-list-item-title>
              <template #append><v-icon v-if="uiLocale === option.value" :icon="mdiCheck" size="18" aria-hidden="true" /></template>
            </v-list-item>
            <p v-if="languageError" class="language-menu__error" role="alert">{{ text('language.loadFailed') }}</p>
          </v-list>
        </v-menu>
        <v-tooltip :text="themeActionLabel" location="bottom" :eager="false">
          <template #activator="{ props: tooltipProps }">
            <v-btn
              v-bind="tooltipProps"
              class="theme-toggle"
              rounded="circle"
              type="button"
              variant="text"
              :icon="isDark ? mdiWhiteBalanceSunny : mdiWeatherNight"
              :aria-label="themeActionLabel"
              :ripple="false"
              width="44"
              height="44"
              @click="toggleAppearance"
            />
          </template>
        </v-tooltip>
      </div>
    </v-container>
  </v-app-bar>
</template>

<script setup lang="ts">
import { text, uiLocale, setUiLocale, type SupportedLocale, displayText } from '@/utils/locale'
import { computed, onMounted, onUnmounted, nextTick, ref, type ComponentPublicInstance } from 'vue';
import { useRoute } from 'vue-router';
import { resolveScrollBehavior } from '@/utils/motion';
import { mdiWeatherNight, mdiWhiteBalanceSunny, mdiTranslate, mdiCheck } from '@mdi/js';
import { useAppearance } from '@/composables/useAppearance';

const languageMenuOpen = ref(false);
const languageBusy = ref(false);
const languageError = ref(false);
const languageOptions: { value: SupportedLocale; label: string }[] = [
  { value: 'en', label: 'English' }, { value: 'zh-Hans', label: '简体中文' }
];
async function changeLanguage(locale: SupportedLocale) {
  if (languageBusy.value) return;
  languageBusy.value = true;
  languageError.value = false;
  try {
    await setUiLocale(locale);
    languageMenuOpen.value = false;
    await nextTick();
    updateBrandVisibility();
    updateArrowVisibility();
  } catch (error) {
    languageError.value = true;
    console.error('Language resources could not be loaded.', error);
  } finally {
    languageBusy.value = false;
  }
}

const route = useRoute();
const { isDark, toggleAppearance } = useAppearance();
const themeActionLabel = computed(() => text(isDark.value ? 'appearance.switchToLight' : 'appearance.switchToDark'));
const hideBrand = ref(false);
const containerRef = ref<HTMLElement | ComponentPublicInstance | null>(null);
const leftWrapperRef = ref<HTMLElement | null>(null);
const brandRef = ref<HTMLElement | null>(null);
const actionsRef = ref<HTMLElement | null>(null);
const navMenuRef = ref<HTMLElement | null>(null);

const showLeftArrow = ref(false);
const showRightArrow = ref(false);
const canScroll = ref(false);

const SCROLL_STEP = 200;

const resolveDomElement = (candidate: unknown): HTMLElement | null => {
  if (candidate instanceof HTMLElement) {
    return candidate;
  }
  if (candidate && typeof candidate === 'object' && '$el' in (candidate as Record<string, unknown>)) {
    const el = (candidate as { $el?: unknown }).$el;
    return el instanceof HTMLElement ? el : null;
  }
  return null;
};

type NavItem = {
  label: string;
  path: string;
};

const navItems = computed<NavItem[]>(() => [
  { label: text('common.home'), path: '/' },
  { label: text('common.tools'), path: '/tools' },
  { label: text('common.download'), path: '/download' },
  { label: text('common.help'), path: '/Help' },
  { label: text('common.contact'), path: '/about' }
]);

const activePath = computed(() => route.path.toLowerCase());

// 精确匹配路径，避免子路由误激活首页导航。
const isActive = (path: string) => {
  const currentPath = activePath.value;
  const targetPath = path.toLowerCase();

  return currentPath === targetPath;
};

const updateArrowVisibility = () => {
  const el = navMenuRef.value;
  if (!el) {
    showLeftArrow.value = false;
    showRightArrow.value = false;
    canScroll.value = false;
    return;
  }

  const { scrollLeft: scrollLeftValue, scrollWidth, clientWidth } = el;
  const maxScroll = scrollWidth - clientWidth;

  if (maxScroll <= 1) {
    showLeftArrow.value = false;
    showRightArrow.value = false;
    canScroll.value = false;
    return;
  }

  canScroll.value = true;
  showLeftArrow.value = scrollLeftValue > 1;
  showRightArrow.value = scrollLeftValue < maxScroll - 1;
};

const scrollLeft = () => {
  const el = navMenuRef.value;
  if (!el) return;
  el.scrollBy({ left: -SCROLL_STEP, behavior: resolveScrollBehavior('smooth') });
};

const scrollRight = () => {
  const el = navMenuRef.value;
  if (!el) return;
  el.scrollBy({ left: SCROLL_STEP, behavior: resolveScrollBehavior('smooth') });
};

const handleKeydown = (event: KeyboardEvent) => {
  if (!canScroll.value) return;
  const el = navMenuRef.value;
  if (!el) return;

  switch (event.key) {
    case 'ArrowLeft':
      scrollLeft();
      event.preventDefault();
      break;
    case 'ArrowRight':
      scrollRight();
      event.preventDefault();
      break;
    case 'Home':
      el.scrollTo({ left: 0, behavior: resolveScrollBehavior('smooth') });
      event.preventDefault();
      break;
    case 'End': {
      const maxScroll = (el.scrollWidth ?? 0) - (el.clientWidth ?? 0);
      el.scrollTo({ left: maxScroll, behavior: resolveScrollBehavior('smooth') });
      event.preventDefault();
      break;
    }
    default:
      break;
  }
};

const handleWheel = (event: WheelEvent) => {
  const el = navMenuRef.value;
  if (!el) return;

  const canScrollHorizontally = el.scrollWidth > el.clientWidth + 1;
  const isHorizontalIntent = Math.abs(event.deltaX) >= Math.abs(event.deltaY) || event.shiftKey;

  if (canScrollHorizontally) {
    const delta = isHorizontalIntent
      ? (event.deltaX !== 0 ? event.deltaX : event.deltaY)
      : event.deltaY;
    el.scrollLeft += delta;
    event.preventDefault();
    return;
  }
};

const updateBrandVisibility = () => {
  const container = resolveDomElement(containerRef.value);
  const left = leftWrapperRef.value;
  const brand = brandRef.value;
  const nav = navMenuRef.value;
  const actions = actionsRef.value;
  const actionButtons = actions ? Array.from(actions.querySelectorAll<HTMLElement>('.theme-toggle, .language-toggle')) : [];
  if (!container || !left || !brand || !nav || !actions || !actionButtons.length) return;

  const bufferHide = 8;
  const bufferShow = 32;
  const navStyles = getComputedStyle(nav);
  const leftStyles = getComputedStyle(left);
  const containerStyles = getComputedStyle(container);
  const actionStyles = getComputedStyle(actions);
  const items = Array.from(nav.children) as HTMLElement[];
  const navWidth = items.reduce((width, item) => width + item.offsetWidth, 0)
    + Math.max(0, items.length - 1) * Number.parseFloat(navStyles.columnGap);
  const requiredWidth = navWidth + Number.parseFloat(leftStyles.paddingLeft)
    + Number.parseFloat(leftStyles.paddingRight) + brand.scrollWidth
    + actionButtons.reduce((width, button) => width + button.offsetWidth, 0)
    + actionButtons.length * Number.parseFloat(actionStyles.columnGap);
  const availableWidth = container.clientWidth - Number.parseFloat(containerStyles.paddingLeft)
    - Number.parseFloat(containerStyles.paddingRight);
  const tooTight = requiredWidth + bufferHide > availableWidth;
  const roomy = requiredWidth + bufferShow < availableWidth;

  if (tooTight) {
    hideBrand.value = true;
  } else if (roomy) {
    hideBrand.value = false;
  }
};

let resizeObserver: ResizeObserver | null = null;
let navResizeObserver: ResizeObserver | null = null;

onMounted(() => {
  updateBrandVisibility();
  updateArrowVisibility();

  const container = resolveDomElement(containerRef.value);
  if (container) {
    resizeObserver = new ResizeObserver(updateBrandVisibility);
    resizeObserver.observe(container);
  }

  navMenuRef.value?.addEventListener('wheel', handleWheel, { passive: false });
  nextTick(() => updateArrowVisibility());

  if (navMenuRef.value) {
    navResizeObserver = new ResizeObserver(() => updateArrowVisibility());
    navResizeObserver.observe(navMenuRef.value);
  }

  window.addEventListener('resize', updateBrandVisibility);
  window.addEventListener('resize', updateArrowVisibility);
  setTimeout(updateBrandVisibility, 120);
  setTimeout(updateArrowVisibility, 120);
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
  navMenuRef.value?.removeEventListener('wheel', handleWheel);
  if (navResizeObserver) {
    navResizeObserver.disconnect();
  }
  window.removeEventListener('resize', updateBrandVisibility);
  window.removeEventListener('resize', updateArrowVisibility);
});
</script>

<style lang="scss">
@use '@/styles/components/menu.scss';
</style>
