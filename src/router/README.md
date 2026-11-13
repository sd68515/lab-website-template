# 路由 / Router

`index.ts` 使用 hash 路由，并校验示例数据集、方法和指标的 ID。新增页面时添加具名路由，再从导航或页面使用该名称跳转。项目部署在子路径时通过构建时的 `VITE_BASE_PATH` 配置，不要在组件中写死站点前缀。

`index.ts` uses hash routes and checks dataset, method and metric IDs. Add a named route for a new page and link to that name from navigation or other views. Set `VITE_BASE_PATH` at build time for subpath hosting rather than hard-coding a site prefix in components.
