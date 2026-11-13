# 共享逻辑 / Composables

`useLocale.ts` 提供响应式语言设置、`t(english, chinese)` 和 `localize({ en, zh })`；语言保存在浏览器本地存储中，存储不可用时仍可切换。界面文字在渲染或 `computed` 中调用翻译函数，以便切换语言后立即更新。

`useLocale.ts` provides the reactive locale, `t(english, chinese)` and `localize({ en, zh })`. Language is saved in browser storage when available. Call translation helpers during rendering or in `computed` values so language changes update the interface immediately.

`useAppearance.ts` 提供明暗主题状态和切换；颜色定义在 `../constants/appearance.ts`。两个设置只保存在当前浏览器。

`useAppearance.ts` provides the current theme and toggle; colors are defined in `../constants/appearance.ts`. Both preferences are local to the current browser.
