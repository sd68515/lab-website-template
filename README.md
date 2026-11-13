# 科研网站模板 / Research Website Template

一个可独立运行的 Vue 前端模板，提供首页筛选、方法目录、结果浏览、示例指标、帮助和联系页面。所有示例数据均为虚构，图片和下载文件等待项目负责人自行配置；模板没有后端。

A standalone Vue frontend with search, a method catalogue, result browsing, sample metrics, help and contact pages. All data is fictional. Images and downloads are intentionally unconfigured, and no backend is included.

## 快速开始 / Quick start

安装 Node.js 22.18 以上的 22.x 版本或 24.11 以上版本，以及 pnpm 10。进入项目目录后：

Install Node.js 22.18+ in the 22.x line or 24.11+, and pnpm 10. From the project directory:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

打开命令输出中的本地地址。开发时修改源码会自动刷新页面。

Open the local address printed by the command. The page reloads as you edit the source.

```sh
pnpm type-check   # TypeScript 和 Vue 模板类型检查 / Type-check TypeScript and Vue templates
pnpm lint         # 检查 TypeScript 和 Vue 代码 / Lint TypeScript and Vue code
pnpm build:fast   # 构建静态网站到 dist/ / Build the static site into dist/
pnpm preview      # 本地预览构建结果 / Preview the build locally
```

## 从哪里开始修改 / Where to make changes

- `src/data/site.ts`：项目名称与页脚机构链接。Project name and footer links.
- `src/data/demo.ts`：示例数据集、方法、指标和数值。Sample datasets, methods, metrics and scores.
- `src/views/`：页面内容与页面交互。Page content and interactions.
- `src/components/`：页面共享组件。Shared interface components.
- `src/styles/` 与 `src/constants/appearance.ts`：字体、间距、圆角及明暗主题颜色。Typography, spacing, corner radius and light/dark colors.
- `src/router/`：页面地址和路由名称。Page paths and route names.
- `src/composables/useLocale.ts`：中英文切换和翻译辅助函数。English/Chinese language switching and translation helpers.

各主要目录的 README 说明入口、常见修改和注意事项。修改示例标识符时，请同时检查引用它的结果数据、链接和路由。页面中的占位状态用于提示尚未配置内容，而不是运行错误。

Each main directory has a README with its entry points and common edits. When changing sample IDs, also update the result records, links and routes that reference them. Placeholder states identify unconfigured content, not application failures.

## 本地图片与数据 / Adding your own assets and data

将有权使用的图片、数据或下载文件放入 `public/`，通过 `import.meta.env.BASE_URL` 构造地址，以便在子路径部署。为图片提供描述文字并保留加载失败状态。修改 `src/data/demo.ts` 中的数据与说明时，不要将虚构数值当作真实研究结论。

Place assets you have the right to use in `public/` and build their URLs with `import.meta.env.BASE_URL`, so they also work under a subpath. Provide alternative text and a failure state for images. Replace the fictional values in `src/data/demo.ts` with real project data before drawing research conclusions.

## 部署 / Deployment

站点使用 hash 路由，可作为静态文件部署。根路径部署使用默认配置；GitHub Pages 项目站点在构建时设置仓库子路径：

The site uses hash routes and can be hosted as static files. The default build targets the site root. For a GitHub Pages project site, set the repository subpath at build time:

```sh
VITE_BASE_PATH=/YOUR-REPOSITORY/ pnpm build:fast
```

PowerShell 中可先运行 `$env:VITE_BASE_PATH="/YOUR-REPOSITORY/"`，再运行 `pnpm build:fast`；完成后用 `Remove-Item Env:VITE_BASE_PATH` 清除临时设置。

In PowerShell, set `$env:VITE_BASE_PATH="/YOUR-REPOSITORY/"` before `pnpm build:fast`; remove it afterwards with `Remove-Item Env:VITE_BASE_PATH`.

首次发布可将 `dist/` 内容推送到独立的 `gh-pages` 分支，再在仓库 Settings > Pages 中选择该分支的根目录。该模板不自动发布；fork 后请使用自己仓库的名称重新构建。具体操作见 [GitHub Pages 文档](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。

For a first deployment, push the contents of `dist/` to a separate `gh-pages` branch, then select that branch's root in Settings > Pages. This template does not deploy automatically; after forking, rebuild with your own repository name. See the [GitHub Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## 许可 / Licenses

网站代码遵循 [MIT 许可](LICENSE)；原代码的版权声明予以保留。自托管字体各自的许可位于 `src/assets/fonts/`，详见 [NOTICE](NOTICE)。

The website code is covered by the [MIT License](LICENSE), with the original copyright notice retained. Licenses for the self-hosted fonts are under `src/assets/fonts/`; see [NOTICE](NOTICE).
