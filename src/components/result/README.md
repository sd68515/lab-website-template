# 结果组件 / Result components

`ResultBrowser.vue` 是数据集/方法的悬浮快捷浏览器；视口宽度不大于 760px 或高度不大于 500px 时，结果页会卸载整个浏览器。`ResultImage.vue` 展示结果图片：无 URL 时显示未配置提示，URL 加载失败时显示重试按钮。

`ResultBrowser.vue` is the floating dataset/method browser. The result page unmounts it when the viewport is at most 760px wide or 500px high. `ResultImage.vue` displays a result image, an unconfigured placeholder when no URL is supplied, or a retry action if loading fails.

结果图片的 URL 来自 `../../data/demo.ts` 中对应记录的 `imageUrl`。模板故意展示一处失败状态，但不会请求不存在的图片；为该记录设置 URL 后会正常加载。

The result image URL comes from `imageUrl` on the corresponding record in `../../data/demo.ts`. One result deliberately shows a failure-state example without requesting a missing image; setting a URL for that record displays the image instead.
