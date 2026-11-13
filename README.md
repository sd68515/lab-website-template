# 科研网站模板 / Research Website Template

这是一个基于 Vue 3、Vuetify 和 Vite 的静态前端模板。它保留了原站的导航、首页级联选择器、工具目录筛选与表格、数据集和方法结果浏览、指标页面、帮助及联系页面。界面支持英语、简体中文和明暗主题。

所有示例名称与数值均为虚构内容，仅用于展示界面。模板不包含后端；结果图片和下载资源尚未配置，页面会显示相应占位状态。

This static frontend template uses Vue 3, Vuetify and Vite. It retains the original navigation, cascading home-page selectors, filterable tool catalogue and table, dataset and method result browsing, metric pages, help and contact pages. The interface supports English, Simplified Chinese, and light and dark themes.

All example names and values are fictional and exist only to demonstrate the interface. There is no backend. Result images and download resources are not configured; their pages show placeholders.

## 运行与构建 / Run and build

需要 Node.js `^22.18.0` 或 `>=24.11.0`，以及 pnpm 10。首次运行：

Requires Node.js `^22.18.0` or `>=24.11.0`, and pnpm 10. To start:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

打开终端输出的本地地址。其他命令 / Open the local address printed by the command. Other commands:

```sh
pnpm type-check   # 检查 TypeScript 和 Vue 模板 / Check TypeScript and Vue templates
pnpm lint         # 检查 TypeScript 和 Vue 源码 / Lint TypeScript and Vue source
pnpm build:fast   # 构建静态文件到 dist/ / Build static files into dist/
pnpm preview      # 本地预览构建产物 / Preview the production build locally
```

站点使用 hash 路由。默认构建以域名根路径为基础；部署到子路径时在构建前设置 `VITE_BASE_PATH`，例如 `VITE_BASE_PATH=/project/ pnpm build:fast`。将 `dist/` 的内容部署到对应路径；发布由使用者自行完成。

The site uses hash routing. The default build targets the domain root. For a subpath, set `VITE_BASE_PATH` before building, for example `VITE_BASE_PATH=/project/ pnpm build:fast`. Deploy the contents of `dist/` to that path; deployment is not automated.

预览子路径构建时，也使用相同的变量：`VITE_BASE_PATH=/project/ pnpm preview`。/ To preview a subpath build, pass the same setting: `VITE_BASE_PATH=/project/ pnpm preview`.

## 替换示例内容 / Replace the examples

请先保留一份示例作为字段格式参考，再同时检查数据文件、配置和页面。各处 ID 是连接筛选、结果、图表和路由的内部键，改名时必须保持一致；显示名称可与内部 ID 不同。

Keep a copy of the examples as a format reference, then review the data files, configuration and pages together. IDs connect filters, results, charts and routes: keep them consistent when renaming records. Display names may differ from internal IDs.

| 内容 / Content | 入口 / Where to edit |
| --- | --- |
| 数据集资料 / Dataset metadata | `public/sheets/realdata_info.csv`；显示标签还需与 `src/constants/generated/realDatasetLabels.ts`、`src/constants/datasets.ts` 中的 ID 范围一致。/ Keep display labels and IDs in these files consistent. |
| 工具目录 / Tool catalogue | `public/sheets/tool_list.csv` 提供目录表；`src/constants/tools.ts` 与 `src/constants/generated/toolScientificTypes.json` 定义首页筛选使用的方法及类别。/ The CSV supplies the catalogue; the configuration defines methods and categories used by home filters. |
| 示例指标 / Example metrics | `src/constants/metrics.ts` 定义指标 ID、显示名与描述；`public/sheets/batch-run.csv`、`down-sampling.csv`、`running-time/`、`memory-efficiency/` 和 `tool_usability.csv` 提供不同图表的数据。/ The metadata defines metric IDs, display names and descriptions; these CSV files supply chart data. |
| 可用范围与结果状态 / Availability and result status | 检查 `src/constants/generated/benchmarkCatalogue.json`、`benchmarkResultManifest.json`、`src/constants/benchmark-results.ts` 及相关范围配置。当前清单的图像、汇总和受管理工具列表为空，示例组合沿用 `null`（旧规则）状态；完整接入还需检查图片映射和适用性。/ The manifest currently has empty figure, aggregate and managed-tool entries. Example combinations fall back to the `null` (legacy-rule) state; image mappings and applicability still need review. |
| 下载 / Downloads | `public/sheets/download_link.csv` 是单数据集下载链接表；下载页 `src/components/about/DownloadContent.vue` 当前是静态“未配置”内容。要启用资源下载，需添加文件和链接，并修改下载页；不要只填写 `src/constants/downloads.ts`。/ The CSV supplies per-dataset links. The download page currently displays static unconfigured placeholders: add files and links and update the page itself, rather than only filling `downloads.ts`. |
| 项目名称与联系信息 / Identity and contact | 首页及导航文案位于 `src/locales/`，浏览器标题还需修改 `index.html` 和 `src/router/pageTitle.ts`。团队和示例邮箱位于 `src/views/AboutView.vue`，页脚链接位于 `src/layout/AppFooter.vue`。/ Update locale text, `index.html` and `pageTitle.ts` for the title; update About and the footer for contacts and links. |

`src/constants/generated/` 中的文件虽名为 generated，但当前模板没有提供数据生成命令。修改数据范围或 ID 时，请检查这些文件及其引用，不要假定构建会自动更新它们。`src/constants/simulation.ts` 和相关筛选逻辑定义了模拟数据选项，需按项目实际输入一并调整。

Despite their directory name, the files in `src/constants/generated/` have no data-generation command in this template. Review them and their consumers when changing IDs or coverage; the build does not update them automatically. Adapt `src/constants/simulation.ts` and the related filter logic to your own simulated inputs.

## 图片 / Images

页脚保留了西安电子科技大学和 UTHealth Houston 的机构标识，位于 `public/images/ui/branding/`。复用时请根据合作关系和机构标识使用规定替换或移除；这些标识不属于网站代码的 MIT 授权范围。

The footer retains the Xidian University and UTHealth Houston institutional logos in `public/images/ui/branding/`. Replace or remove them according to your collaboration and the institutions' branding rules; the code's MIT license does not cover these marks.

首页示意图目前是 `src/views/HomeView.vue` 中的占位元素；在该组件中替换为自己的图片并提供合适的替代文本。结果页的图片映射位于 `src/constants/result-image-assets.ts` 的 `RESULT_IMAGE_ASSETS`，默认是空对象，因此未配置的图片直接显示占位，不会仅因文件存在而显示。

结果页先根据数据集 ID、内部方法 ID 和图形类型生成带部署基础路径的键，再查找映射；映射值是实际显示的 URL。对于放在 `public/` 的文件，键和值都应使用现有路径工具处理基础路径。例如，下面为真实类型的 Dataset A（内部 ID `1`）和 Method A（内部 ID `MethodA`）配置一张图；将它加入 `result-image-assets.ts`，并放置对应文件：

```ts
import { buildVelocityImagePath } from '@/utils/result/imagePathBuilder'
import { resolvePublicAsset } from '@/utils/path'

export const RESULT_IMAGE_ASSETS: Readonly<Record<string, string>> = {
  [buildVelocityImagePath('MethodA', '1', 'cell_map', false)]:
    resolvePublicAsset('images/my-project/dataset-a-method-a.webp')
}
```

其他结果图的键可参考 `src/utils/result/imagePathBuilder.ts`、`src/constants/measurement-paths.ts` 和 `src/composables/useResultsData.ts` 的调用。工具会处理 `VITE_BASE_PATH`；不要在映射中写死部署域名或根路径。结果是否显示还取决于数据集/方法的支持范围、`src/constants/benchmark-results.ts` 的适用性、`src/constants/generated/benchmarkResultManifest.json` 和缺失结果配置。当前 `scRnaTools` 及图像条目为空时，示例组合使用 `null` 旧规则，卡片可以显示占位；若启用清单管理，需为相应组合和图形配置正确状态，并检查缺失和不适用规则。`pending` 组合可能不会显示卡片，其他非就绪状态也会阻止图片显示。通用指标热图另由 `src/constants/general-heatmap-assets.ts` 控制，当前始终返回待配置状态，接入时须修改该函数。完成后验证相应筛选、占位和图片加载失败状态。

The home illustration is a placeholder in `src/views/HomeView.vue`; replace it there with your own image and suitable alternative text. Result images are registered in `RESULT_IMAGE_ASSETS` in `src/constants/result-image-assets.ts`. The map is empty by default, so an unconfigured image shows a placeholder even if a file exists.

Result pages construct a key from the dataset ID, internal method ID and figure role, including the deployment base path, then look it up in the map. The value is the URL actually displayed. For a file under `public/`, use the existing path helpers for both key and value. The example above maps the real-type Dataset A (internal ID `1`) and Method A (internal ID `MethodA`) to a project image.

For other keys, see the calls in `src/utils/result/imagePathBuilder.ts`, `src/constants/measurement-paths.ts` and `src/composables/useResultsData.ts`. The helpers account for `VITE_BASE_PATH`; avoid hard-coding the deployment domain or root path. Visibility also depends on dataset/method support, applicability in `src/constants/benchmark-results.ts`, `src/constants/generated/benchmarkResultManifest.json`, and missing-result rules. With the current empty `scRnaTools` and figure entries, example combinations fall back to the `null` legacy state and their cards can show placeholders. If using manifest-managed results, configure the appropriate combination and figure states and review missing and applicability rules: a `pending` combination may hide its card, and other non-ready states also prevent the image from displaying. General metric heatmaps are configured separately in `src/constants/general-heatmap-assets.ts`, which currently always returns pending. After integration, verify the relevant filters, placeholders and image-load failure states.

## 语言、主题与代码结构 / Language, theme and structure

- `src/locales/en.ts` 汇总英语消息，`pages.en.ts`、`info.en.ts`、`source.en.ts` 提供部分消息；`src/locales/zh-Hans.ts` 提供简体中文。增删消息时同步两种语言，并保持 `{name}` 一类占位符一致；`src/utils/locale.ts` 在切换语言时检查完整性。
- `src/constants/appearance.ts` 定义主题颜色；`src/plugins/vuetify.ts`、`src/styles/` 和 `src/assets/css/` 管理 Vuetify、样式与自托管字体。语言和主题偏好保存在浏览器本地存储中。
- `src/views/` 是页面入口；`src/components/` 包含结果、指标和公共界面组件；`src/composables/` 负责共享状态与数据加载；`src/router/` 管理页面路由。

- `src/locales/en.ts` assembles English messages from itself and the page, info and source files; `src/locales/zh-Hans.ts` contains Simplified Chinese. Keep keys and placeholders such as `{name}` aligned in both languages. `src/utils/locale.ts` checks them when the language changes.
- `src/constants/appearance.ts` defines theme colors. `src/plugins/vuetify.ts`, `src/styles/` and `src/assets/css/` configure Vuetify, styles and self-hosted fonts. Language and theme preferences are stored in the browser.
- `src/views/` contains page entry points; `src/components/` contains result, metric and shared UI components; `src/composables/` holds shared state and data loading; `src/router/` defines routes.

## 许可 / Licenses

网站代码遵循 [MIT 许可](LICENSE)，保留原版权声明。自托管的 Inter、Source Serif、Source Han Sans 和 Source Han Serif 字体分别遵循其目录中的 SIL Open Font License；详见 [NOTICE](NOTICE) 和 `src/assets/fonts/`。生产构建会将代码与字体许可文件写入 `dist/licenses/`。

The website code is distributed under the [MIT License](LICENSE), with the original copyright notice retained. The self-hosted Inter, Source Serif, Source Han Sans and Source Han Serif fonts have separate SIL Open Font License notices in their respective directories; see [NOTICE](NOTICE) and `src/assets/fonts/`. Production builds include the code and font licenses in `dist/licenses/`.
