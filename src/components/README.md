# 组件 / Components

`AppShell.vue` 负责公共导航、页面容器与页尾。`result/` 存放结果浏览的组件，`metrics/` 存放指标展示组件。与某一页面强相关的内容可留在对应视图；只有需要共享的界面才放入组件目录。

`AppShell.vue` provides navigation, the page container and footer. `result/` contains result-browsing components and `metrics/` contains metric components. Keep page-specific content in its view and extract a component when it is shared.

图片、下载或数据缺失时，应保留可理解的提示和恢复方式；组件若依赖项目数据，优先从属性或 `../data/` 获取，不要硬编码原项目链接。

Keep missing-image, missing-download and missing-data states understandable and actionable. Pass project content through props or `../data/` instead of hard-coding project-specific URLs.
