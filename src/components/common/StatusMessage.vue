<!--
  状态消息通用组件
  用于展示加载、空状态、错误等各类状态提示信息
-->
<template>
  <!-- 状态消息容器：根据状态类型应用不同样式 -->
  <div
    :class="['status-message', `status-message--${state}`, { 'status-message--centered': centered }]"
    :role="state === 'error' ? 'alert' : state === 'loading' ? 'status' : undefined"
  >
    <!-- 状态图标区域：显示加载动画、空文件夹、错误警告等 -->
    <div class="status-message__icon">
      <!-- 图标插槽：允许自定义图标 -->
      <slot name="icon">
        <!-- 加载状态：显示旋转动画 -->
        <span
          v-if="state === 'loading'"
          class="status-message__spinner"
          role="presentation"
        ></span>
        <!-- 空状态：显示文件夹图标 -->
        <v-icon
          v-else-if="state === 'empty'"
          :size="28"
          class="status-message__icon-symbol"
          icon="$mdi-folder-open-outline"
        />
        <!-- 错误状态：显示警告图标 -->
        <v-icon
          v-else-if="state === 'error'"
          :size="28"
          class="status-message__icon-symbol"
          icon="$mdi-alert-circle-outline"
        />
        <!-- 默认状态：显示点状符号 -->
        <span v-else class="status-message__dot" role="presentation"></span>
      </slot>
    </div>
    <!-- 内容区域：展示标题、描述和操作按钮 -->
    <div class="status-message__content">
      <!-- 状态标题 -->
      <p class="status-message__title">{{ displayText(title) }}</p>
      <!-- 状态描述（可选） -->
      <p v-if="description" class="status-message__description">{{ displayText(description) }}</p>
      <!-- 操作按钮区域（可选） -->
      <div v-if="$slots.default" class="status-message__actions">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { displayText } from '@/utils/locale'
// Props：组件属性定义
// state：状态类型（加载、空、错误），默认无特定状态
// title：必需的状态标题，使用共享标题排版令牌
// description：可选的状态描述文本
defineProps<{
  state?: 'loading' | 'empty' | 'error';
  title: string;
  description?: string;
  centered?: boolean;
}>();
</script>

<style lang="scss">
@use '@/styles/components/status-message.scss';
</style>
