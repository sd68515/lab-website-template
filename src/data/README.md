# 项目与示例数据 / Project and example data

`site.ts` 集中设置项目名称和页尾机构链接。`demo.ts` 是数据集、方法、指标、结果分数的唯一示例数据源；所有值都是虚构的。

`site.ts` holds the project name and footer links. `demo.ts` is the sample source for datasets, methods, metrics and result scores; all values are fictional.

每个记录的 `id` 是稳定标识符，用于结果记录、路由及图表查找；展示名称可以修改，修改 ID 时必须同步所有引用。`description` 的 `en` 和 `zh` 分别用于两种语言。`metrics` 的 `kind` 决定示例页面的图表形式，`scores` 的顺序与 `metrics` 数组一致。要配置结果图片，可为对应结果记录添加 `imageUrl`；本地图片放在 `public/` 并使用 `import.meta.env.BASE_URL` 构造地址。

Each record's `id` connects results, routes and charts. Display names can change freely; an ID change must be reflected in every reference. `description.en` and `description.zh` supply both languages. A metric's `kind` selects its example visualization, and each `scores` array follows the order of `metrics`. Add `imageUrl` to a result record to show an image; put local images in `public/` and build the URL with `import.meta.env.BASE_URL`.

接入真实数据或 API 时，可在保留页面所需字段的前提下替换数据读取方式，并同时处理加载、空数据和错误状态。

To use real files or an API, replace the data access while preserving the fields the pages consume, and handle loading, empty and error states.

例如，要为第一组结果加载本地图片，可在其记录中添加：

For example, add this field to the first result record to load a local image:

```ts
imageUrl: `${import.meta.env.BASE_URL}images/example.png`
```

将实际文件放在 `public/images/example.png`。增加指标时，应同时在每条结果的 `scores` 末尾添加对应数值。

Place the file at `public/images/example.png`. When adding a metric, append its corresponding value to every result's `scores` array.
