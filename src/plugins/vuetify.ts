/**
 * Vuetify 插件配置
 * 负责创建并导出全局 Vuetify 实例（主题、图标等）
 */
import { createVuetify, type ThemeDefinition } from 'vuetify'
import { VSnackbarQueue } from 'vuetify/components'
import {
  mdiAlertCircleOutline,
  mdiArrowDownBold,
  mdiCheck,
  mdiChevronDown,
  mdiChevronRight,
  mdiChevronUp,
  mdiCompassOffOutline,
  mdiContentCopy,
  mdiDownload,
  mdiFilterVariant,
  mdiFolderOpenOutline,
  mdiImageOff,
  mdiInformationOutline,
  mdiPin,
  mdiPinOff,
  mdiTableOff,
  mdiZipBox
} from '@mdi/js'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'
import { appearances, type AppearanceName } from '@/constants/appearance'
import { getInitialAppearance } from '@/utils/appearance'
import { en, zhHans } from 'vuetify/locale'

function createAppearanceTheme(name: AppearanceName): ThemeDefinition {
  const colors = appearances[name]
  return {
    dark: name === 'dark',
    variables: {
      'app-divider-min-opacity': name === 'dark' ? 0.5 : 0
    },
    colors: {
      ...colors,
      primary: colors.accent,
      secondary: colors.brand,
      'on-surface': colors.text,
      'on-background': colors.text,
      'on-primary': colors.onAccent
    }
  }
}

const iconAliases = {
  ...aliases,
  'mdi-alert-circle-outline': mdiAlertCircleOutline,
  'mdi-arrow-down-bold': mdiArrowDownBold,
  'mdi-check': mdiCheck,
  'mdi-chevron-down': mdiChevronDown,
  'mdi-chevron-right': mdiChevronRight,
  'mdi-chevron-up': mdiChevronUp,
  'mdi-compass-off-outline': mdiCompassOffOutline,
  'mdi-content-copy': mdiContentCopy,
  'mdi-download': mdiDownload,
  'mdi-filter-variant': mdiFilterVariant,
  'mdi-folder-open-outline': mdiFolderOpenOutline,
  'mdi-image-off': mdiImageOff,
  'mdi-information-outline': mdiInformationOutline,
  'mdi-pin': mdiPin,
  'mdi-pin-off': mdiPinOff,
  'mdi-table-off': mdiTableOff,
  'mdi-zip-box': mdiZipBox
}

const vuetify = createVuetify({
  locale: {
    locale: 'en',
    fallback: 'en',
    messages: {
      en,
      'zh-Hans': {
        ...zhHans,
        loading: '加载中…',
        dataIterator: { ...zhHans.dataIterator, loadingText: '加载中…' },
        command: { ...zhHans.command, search: '输入命令或搜索…' }
      }
    }
  },
  components: {
    VSnackbarQueue
  },
  theme: {
    defaultTheme: getInitialAppearance(),
    themes: {
      light: createAppearanceTheme('light'),
      dark: createAppearanceTheme('dark')
    }
  },
  icons: {
    defaultSet: 'mdi',
    aliases: iconAliases,
    sets: {
      mdi
    }
  },
  defaults: {
    VBtn: {
      rounded: 'app'
    },
    VCard: {
      rounded: 'app',
      elevation: 2
    },
    VSelect: {
      menuProps: {
        contentClass: 'app-select-menu'
      }
    }
  }
})

export default vuetify
