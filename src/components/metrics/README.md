# Metric views / 指标页面

`MetricView.vue` looks up the route's `metricId` in `src/data/demo.ts` and selects a display from the metric's `kind`. The records and scores in that module are fictional. Replace the records, descriptions and chart logic together when adapting this template to real data.

`MetricView.vue` 根据路由的 `metricId` 在 `src/data/demo.ts` 中查找指标，并通过 `kind` 选择展示方式。该模块中的记录和分数均为虚构示例；用于真实项目时，应一并替换数据、说明及图表逻辑。

- `heatmap`: dataset × method scores and a dataset breakdown.
- `assessment`: method selector and per-dataset entries.
- `line`: a five-step illustrative trend derived from each score.
- `sampling`: score multiplied by each sample fraction; selecting one fraction switches to bars.
- `bar`: dataset and method comparison.

The line and sampling series are demonstrations, not measured values. `tableValue` mirrors their calculations for keyboard and screen-reader access. If the formulas change, update both the chart option and table. The controls filter by stable dataset/method IDs; missing values are omitted, and an empty selection result shows a recovery message.

折线和采样序列只是演示，不是实测值。`tableValue` 与图表使用相同的计算，方便键盘和屏幕阅读器访问；修改公式时请同步更新两处。筛选使用数据集和方法的稳定 ID，缺失值会被省略；无匹配值时会显示恢复提示。

`MetricChart.vue` registers the ECharts chart types, components and canvas renderer it needs, updates options reactively, resizes with its container and disposes on unmount. Register any additional ECharts features there before using them in an option. Language and appearance changes cause the option to be rebuilt.

`MetricChart.vue` 按需注册 ECharts 图表、组件和画布渲染器；配置响应式更新，容器尺寸变化时调整大小，并在卸载时释放实例。新增 ECharts 功能时，应先在此组件中注册。语言与主题变化会触发图表配置更新。

For verification, run `pnpm type-check` and `pnpm build:fast`, then visit `/#/metrics/metric-a`, `/#/metrics/metric-f`, `/#/metrics/metric-h`, `/#/metrics/metric-j` and `/#/metrics/metric-k`. Check filters and reset, sampling fraction switching, chart tooltips and data tables, keyboard navigation, both languages and both themes. The remaining heatmap and line IDs use the same display paths with different example scores.

验证时运行 `pnpm type-check` 和 `pnpm build:fast`，然后访问上述路径，检查筛选与重置、采样比例切换、图表提示和数据表、键盘操作、中英与明暗主题。其余热图和折线指标复用相同的展示路径，示例分数不同。
