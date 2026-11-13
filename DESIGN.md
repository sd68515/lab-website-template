# 界面设计约定 / Interface design guidelines

本文整理模板现有的设计变量及推荐用法，方便新页面延续整体风格。变量是默认值，不代表每个现有组件都完全一致；修改前请查看对应组件。/ This guide documents the existing tokens and recommended use. Tokens are defaults, not a claim that every component is identical; inspect the component before changing it.

## 字体与层级 / Typography

字体、字号、行高和字重集中在 `src/styles/variables.scss`；字体资源与声明在 `src/assets/fonts/` 和 `src/assets/css/`。界面、表格和数据默认使用 Inter，标题可使用 Source Serif 4；简体中文分别回退到自托管的 Lab Han Sans 和 Lab Han Serif。使用 `--font-family-ui`、`--font-family-editorial` 和 `--font-family-data`，不要在新组件重复写字体栈。

Typography tokens live in `src/styles/variables.scss`, with font files and declarations under `src/assets/fonts/` and `src/assets/css/`. Use Inter for UI and data and Source Serif 4 for editorial headings. Simplified Chinese falls back to the self-hosted Lab Han Sans and Lab Han Serif. Prefer the family variables above to repeating font stacks.

| 用途 / Role | 变量 / Token | 默认 / Default |
| --- | --- | --- |
| 首页主标题 / Hero | `--font-size-hero` | 2.25rem |
| 页面标题 / Page title | `--font-size-page` | 2rem |
| 章节、面板标题 / Section, panel | `--font-size-section`, `--font-size-panel` | 1.5rem |
| 次级标题 / Subheading | `--font-size-subheading` | 1.25rem |
| 正文 / Body copy | `--font-size-body` | 1.125rem |
| 控件、导航 / Controls, navigation | `--font-size-ui` | 1rem |
| 辅助信息 / Caption | `--font-size-caption` | 0.875rem |

这些是相对于根字号的 `rem` 值；默认浏览器根字号为 16px 时分别为 36、32、24、20、18、16、14px。对应行高及 400/500/600/700 字重也有变量，正文默认行高为 1.65。/ These values are relative to the root font size; at a 16px root they correspond to 36, 32, 24, 20, 18, 16 and 14px. Matching line-height and weight tokens are also provided; body copy defaults to 1.65 line-height.

## 容器、间距与颜色 / Surfaces, spacing and color

- 卡片、面板及普通控件优先使用 `--app-border-radius`（12px）与主题边框；圆形图标、胶囊、拼接区域和表格等有例外，不应机械覆盖。/ Use `--app-border-radius` (12px) for ordinary cards, panels and controls. Circular icons, pills, joined sections and tables have intentional exceptions.
- 原界面并非完全无阴影：部分指标卡和标题容器使用轻微阴影，首页卡片也有悬停阴影。新增内容应沿用同类组件，优先以边框、留白和颜色建立层级，避免不必要的重阴影。具体实例见 `src/styles/pages/home.scss`、`src/styles/pages/measurement-result.scss`。/ The existing UI is not entirely shadow-free: some metric cards and headers have subtle shadows, and home cards use a hover shadow. Match the closest component; prefer borders, spacing and color over heavy shadows.
- 间距优先使用 4、8、12、16、24、32、48px 的 `--space-*` 或 SCSS 变量。主导航高度为 64px、指标子导航为 52px；具体布局以组件样式为准。/ Use the 4, 8, 12, 16, 24, 32 and 48px spacing scale. The main and metric navigation heights are 64px and 52px respectively; component styles govern their actual layout.
- 浅色和深色主题的源值位于 `src/constants/appearance.ts`，通过 Vuetify 和 `src/styles/variables.scss` 提供语义变量，如 `--color-surface`、`--color-border`、`--color-accent` 和 `--text-muted-color`。不要只针对浅色背景硬编码颜色。/ Theme values are defined in `src/constants/appearance.ts` and exposed through Vuetify and semantic CSS variables. Use those variables so components work in both themes.

## 交互与复用 / Interaction and reuse

首页筛选使用 Vuetify 选择器和行内校验；新表单应提供明确标签、键盘焦点和跟随语言的错误提示。结果图使用现有的加载、缺失和错误占位组件，不依靠失效图片图标。图表需保留可访问的数据说明，链接和按钮应有可见焦点。/ Home filters use Vuetify selectors and inline validation. Give new fields clear labels, keyboard focus and localized errors. Reuse the result-image loading, missing and error states; preserve accessible chart descriptions and visible focus.

新增页面时先查看 `src/components/common/`、`src/components/result/`、`src/components/measurements/` 及 `src/styles/components/` 中的同类实现，再按需组合。站点主要面向桌面结果浏览；小视口保留核心内容和导航，辅助悬浮功能可省略。完成后检查英语、简体中文、明暗主题及占位状态。/ Before adding a page, inspect the existing common, result and measurement components and styles. The interface prioritizes desktop result browsing; on small viewports keep essential content and navigation, and omit auxiliary floating controls when space is insufficient. Check both languages, both themes and empty states.
