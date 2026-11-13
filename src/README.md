# 源码 / Source

应用入口是 `main.ts`，先初始化语言、路由和 Vuetify，再挂载 `App.vue`。页面从 `router/index.ts` 按需加载；公共布局位于 `components/AppShell.vue`。

`main.ts` initializes the locale, router and Vuetify before mounting `App.vue`. Routes in `router/index.ts` load pages on demand; `components/AppShell.vue` provides the shared layout.

修改顺序通常是：先改 `data/` 中的项目资料，再改 `views/` 的文字和布局，最后按需调整 `components/` 和 `styles/`。各目录有更具体的说明。

A useful editing order is `data/` for project content, `views/` for pages, then `components/` and `styles/` as needed. Each directory has more details.
