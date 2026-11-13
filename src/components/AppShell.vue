<template>
  <div class="site-shell">
    <a class="skip-link" href="#main-content" @click.prevent="focusMain">
      {{ t('Skip to content', '跳转到主要内容') }}
    </a>
    <header class="site-header">
      <nav class="site-nav" :aria-label="t('Main navigation', '主导航')">
        <RouterLink
          v-for="item in navigation"
          :key="item.name"
          :to="{ name: item.name }"
          :class="{ active: isActive(item.name) }"
          :aria-current="isActive(item.name) ? 'page' : undefined"
        >
          {{ t(item.en, item.zh) }}
        </RouterLink>
      </nav>
      <div class="header-actions">
        <span class="site-brand">{{ localize(site.title) }}</span>
        <v-menu location="bottom end">
          <template #activator="{ props }">
            <button
              v-bind="props"
              class="icon-button"
              type="button"
              :aria-label="t('Select language', '选择语言')"
              :title="t('Select language', '选择语言')"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="mdiTranslate" /></svg>
            </button>
          </template>
          <v-list class="language-list" role="menu" :aria-label="t('Select language', '选择语言')">
            <v-list-item
              role="menuitemradio"
              lang="en"
              :aria-checked="locale === 'en'"
              :active="locale === 'en'"
              @click="setLocale('en')"
            >English</v-list-item>
            <v-list-item
              role="menuitemradio"
              lang="zh-Hans"
              :aria-checked="locale === 'zh-Hans'"
              :active="locale === 'zh-Hans'"
              @click="setLocale('zh-Hans')"
            >简体中文</v-list-item>
          </v-list>
        </v-menu>
        <button
          class="icon-button"
          type="button"
          :aria-label="themeActionLabel"
          :title="themeActionLabel"
          @click="toggleAppearance"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="isDark ? mdiWhiteBalanceSunny : mdiWeatherNight" /></svg>
        </button>
      </div>
    </header>
    <main id="main-content" ref="mainContent" class="site-main" tabindex="-1">
      <RouterView />
    </main>
    <footer class="site-footer">
      <p>
        {{ t('Developed by', '共同建设：') }}
        <a :href="site.lab.href" target="_blank" rel="noopener noreferrer">{{ site.lab.name }}</a>
        {{ t('and', '与') }}
        <a :href="site.partner.href" target="_blank" rel="noopener noreferrer">{{ site.partner.name }}</a>.
      </p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { mdiTranslate, mdiWeatherNight, mdiWhiteBalanceSunny } from '@mdi/js'
import { useRoute } from 'vue-router'
import { useLocale } from '@/composables/useLocale'
import { useAppearance } from '@/composables/useAppearance'
import { site } from '@/data/site'

// These shared composables keep the selected language and theme across pages.
// 共享组合式函数让语言和主题设置在页面切换时保持一致。
const { locale, t, localize, setLocale } = useLocale()
const { isDark, toggleAppearance } = useAppearance()
const themeActionLabel = computed(() => isDark.value
  ? t('Switch to light theme', '切换到浅色主题')
  : t('Switch to dark theme', '切换到深色主题'))
const mainContent = ref<HTMLElement | null>(null)
const route = useRoute()
const navigation = [
  { name: 'home', en: 'Home', zh: '首页' },
  { name: 'methods', en: 'Tools', zh: '工具' },
  { name: 'download', en: 'Download', zh: '下载' },
  { name: 'help', en: 'Help', zh: '帮助' },
  { name: 'about', en: 'Contact', zh: '联系我们' }
]

// Focus directly so the fragment does not replace the hash-based route.
// 直接移动焦点，避免锚点覆盖 hash 路由。
function focusMain() {
  mainContent.value?.focus()
}

function isActive(name: string) {
  return route.name === name || (
    name === 'home' && ['dataset-result', 'method-result', 'metric'].includes(String(route.name))
  )
}
</script>
