# 样式 / Styles

`variables.scss` 定义颜色变量映射、字体、间距、字号和 `--app-border-radius`。实际的明暗主题色在 `../constants/appearance.ts`；`vuetify-settings.scss` 将统一字体和圆角应用到 Vuetify。`global.scss` 放基础布局与通用规则，其余样式由对应页面或组件引入。

`variables.scss` maps colors and defines typography, spacing, type scale and `--app-border-radius`. The light/dark palettes live in `../constants/appearance.ts`; `vuetify-settings.scss` applies shared typography and radius to Vuetify. `global.scss` holds base layout and common rules; other styles are imported by their pages or components.

修改颜色时同时检查明暗主题、正文对比度和图表；修改布局时检查常用桌面宽度与小屏。字体文件及许可证见 `../assets/fonts/`。

Check both themes, text contrast and charts when changing colors; check desktop and small screens when changing layout. Font files and licenses are in `../assets/fonts/`.
