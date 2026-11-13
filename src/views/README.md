# 页面 / Views

- `HomeView.vue`：首页介绍和数据/方法筛选。
- `CatalogView.vue`：方法目录和搜索。
- `ResultView.vue`：数据集和方法两种结果浏览。
- `MetricView.vue`：指标筛选与图表。
- `InfoView.vue`：下载、帮助和联系示例。
- `NotFound.vue`：找不到页面时的提示。

对应地址与组件的绑定在 `../router/index.ts`。新增页面时先创建视图，再添加路由和导航链接；新增项目文字时同时填写英文和中文。

- `HomeView.vue`: introduction and dataset/method search.
- `CatalogView.vue`: method catalogue and search.
- `ResultView.vue`: dataset and method results.
- `MetricView.vue`: metric filters and charts.
- `InfoView.vue`: download, help and contact examples.
- `NotFound.vue`: missing-page feedback.

`../router/index.ts` maps URLs to views. For a new page, create the view, add its route and navigation link, and supply both English and Chinese copy.
