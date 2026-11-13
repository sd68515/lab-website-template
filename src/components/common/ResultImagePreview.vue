<!--
  结果图片预览组件
  - 全屏 Vuetify Dialog，支持缩放（0.5x-3x）与拖拽
  - Escape / 点击遮罩 / Close 按钮关闭时触发 close 事件，由父组件负责卸载
  - 当图片缺失且提供占位符时，使用 ResultImagePlaceholder 展示占位信息
-->
<template>
  <v-dialog
    v-model="isOpen"
    class="result-image-overlay"
    :z-index="2000"
    fullscreen
    scroll-strategy="none"
    :aria-label="alt || text('preview.title')"
    :aria-describedby="instructionsId"
    @after-leave="handleAfterLeave"
  >
    <div
      class="result-image-overlay__content"
      @keydown="handleKeydown"
    >
      <p :id="instructionsId" class="visually-hidden">
        {{ text('preview.instructions') }}
      </p>
      <div
        class="result-image-overlay__toolbar"
        role="group"
        :aria-label="text('preview.controls')"
      >
        <button
          class="result-image-overlay__reset result-image-overlay__zoom"
          type="button"
          :disabled="!canZoom || scale <= minScale"
          :aria-label="text('preview.zoomOut')"
          @click="handleZoomOut"
        >
          {{ text('preview.zoomOut') }}
        </button>
        <button
          class="result-image-overlay__reset result-image-overlay__zoom"
          type="button"
          :disabled="!canZoom || scale >= maxScale"
          :aria-label="text('preview.zoomIn')"
          @click="handleZoomIn"
        >
          {{ text('preview.zoomIn') }}
        </button>
        <span
          class="result-image-overlay__zoom-status"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {{ text('preview.zoomLevel', { value: zoomPercentage }) }}
        </span>
        <button
          class="result-image-overlay__reset"
          type="button"
          :disabled="!canZoom || !canReset"
          :aria-label="text('preview.reset')"
          @click="handleReset"
        >
          {{ text('preview.reset') }}
        </button>
        <button
          class="result-image-overlay__close"
          type="button"
          :aria-label="text('preview.close')"
          @click="handleClose"
        >
          {{ text('preview.close') }}
        </button>
      </div>

      <!-- 图片区域：支持滚轮缩放与拖拽 -->
      <div
        ref="wrapperRef"
        class="result-image-overlay__image-wrapper"
        role="region"
        tabindex="0"
        :aria-label="alt || text('preview.image')"
        :aria-describedby="instructionsId"
        :aria-busy="isImageLoading"
        @wheel.prevent="handleWheel"
        @mousedown.prevent="handleMouseDown"
      >
        <img
          v-if="hasImage && !hasLoadError"
          :key="src"
          :src="src"
          :alt="alt || text('preview.image')"
          :class="[
            'result-image-overlay__image',
            { 'result-image-overlay__image--dragging': isDragging }
          ]"
          :style="[imageStyle, { opacity: isImageLoading ? 0 : 1 }]"
          decoding="async"
          draggable="false"
          @load="handleImageLoad"
          @error="handleImageError"
        />

        <!-- 无图片时使用占位符展示 -->
        <ResultImagePlaceholder
          v-else
          class="result-image-overlay__placeholder"
          :placeholder="placeholder || null"
          :load-error="hasLoadError"
        />
        <ImageLoadingSkeleton v-if="isImageLoading" class="result-image-overlay__loading" />
      </div>
    </div>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, onUnmounted, ref, useId, watch } from 'vue';
import type { PlaceholderDisplay } from '@/types';
import ResultImagePlaceholder from '@/components/common/ResultImagePlaceholder.vue';
import ImageLoadingSkeleton from '@/components/common/ImageLoadingSkeleton.vue';
import { text } from '@/utils/locale';

const props = defineProps<{
  src: string;
  alt?: string;
  placeholder?: PlaceholderDisplay | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const previousFocusedElement = ref<HTMLElement | null>(null);

const wrapperRef = ref<HTMLDivElement | null>(null);
const wrapperSize = ref({ width: 0, height: 0 });
const imageNaturalSize = ref({ width: 0, height: 0 });
const hasLoadError = ref(false);
const componentId = useId();
const instructionsId = `${componentId}-result-image-preview-instructions`;

let resizeObserver: ResizeObserver | null = null;
let hasRestoredFocus = false;

// Overlay 打开状态：组件挂载时即打开，关闭时向外发出 close 事件，交由父组件卸载
const isOpen = ref(true);

// 图片是否可用：src 非空
const hasImage = computed(() => !!props.src && !props.placeholder);
const isImageLoading = computed(() => hasImage.value && !hasLoadError.value && imageNaturalSize.value.width === 0);

function updateWrapperSize() {
  const el = wrapperRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  wrapperSize.value = {
    width: rect.width,
    height: rect.height
  };
}

// 缩放与平移状态
const minScale = 0.5;
const maxScale = 3;

const scale = ref(1);
const translateX = ref(0);
const translateY = ref(0);

const canReset = computed(
  () => scale.value !== 1 || translateX.value !== 0 || translateY.value !== 0
);
const canZoom = computed(
  () => hasImage.value
    && !hasLoadError.value
    && imageNaturalSize.value.width > 0
    && imageNaturalSize.value.height > 0
);
const zoomPercentage = computed(() => Math.round(scale.value * 100));

function getContainSize() {
  const wrapperWidth = wrapperSize.value.width;
  const wrapperHeight = wrapperSize.value.height;
  const naturalWidth = imageNaturalSize.value.width;
  const naturalHeight = imageNaturalSize.value.height;

  if (!wrapperWidth || !wrapperHeight || !naturalWidth || !naturalHeight) {
    return null;
  }

  const naturalAspect = naturalWidth / naturalHeight;
  const wrapperAspect = wrapperWidth / wrapperHeight;

  if (naturalAspect > wrapperAspect) {
    const width = wrapperWidth;
    const height = width / naturalAspect;
    return { width, height };
  }

  const height = wrapperHeight;
  const width = height * naturalAspect;
  return { width, height };
}

function getPanBounds(targetScale: number) {
  const containSize = getContainSize();
  if (!containSize) {
    return { maxX: 0, maxY: 0 };
  }

  const scaledWidth = containSize.width * targetScale;
  const scaledHeight = containSize.height * targetScale;
  // 允许在图片小于容器时也能平移（例如缩小后、或 contain 后上下/左右留白的情况）：
  // - 图片比容器大：max = (scaled - wrapper) / 2，避免把图片完全拖出导致大面积空白
  // - 图片比容器小：max = (wrapper - scaled) / 2，允许把图片从居中拖到贴边（仍保持完整可见）
  const maxX = Math.abs(scaledWidth - wrapperSize.value.width) / 2;
  const maxY = Math.abs(scaledHeight - wrapperSize.value.height) / 2;

  return { maxX, maxY };
}

function clampTranslate(nextX: number, nextY: number, targetScale: number) {
  const { maxX, maxY } = getPanBounds(targetScale);
  return {
    x: Math.min(maxX, Math.max(-maxX, nextX)),
    y: Math.min(maxY, Math.max(-maxY, nextY))
  };
}

function clampCurrentTransform() {
  const clamped = clampTranslate(translateX.value, translateY.value, scale.value);
  translateX.value = clamped.x;
  translateY.value = clamped.y;
}

const isPannable = computed(() => {
  const { maxX, maxY } = getPanBounds(scale.value);
  return maxX > 0 || maxY > 0;
});

const imageStyle = computed(() => ({
  transform: `translate3d(${translateX.value}px, ${translateY.value}px, 0) scale(${scale.value})`,
  cursor: isDragging.value ? 'grabbing' : (isPannable.value ? 'grab' : 'default')
}));

// 拖拽状态
const isDragging = ref(false);
const dragStart = ref<{
  x: number;
  y: number;
  startX: number;
  startY: number;
} | null>(null);

function handleWheel(event: WheelEvent) {
  if (!canZoom.value) return;
  const wrapper = event.currentTarget as HTMLElement | null;
  if (!wrapper) return;

  const rect = wrapper.getBoundingClientRect();
  const mouseX = event.clientX - (rect.left + rect.width / 2);
  const mouseY = event.clientY - (rect.top + rect.height / 2);

  const prevScale = scale.value;
  const zoomFactor = Math.exp(-event.deltaY * 0.001);
  const unclampedScale = prevScale * zoomFactor;
  const nextScale = Math.min(maxScale, Math.max(minScale, unclampedScale));
  applyScale(nextScale, mouseX, mouseY);
}

function applyScale(targetScale: number, anchorX = 0, anchorY = 0) {
  if (!canZoom.value) return;
  const nextScale = Number(Math.min(maxScale, Math.max(minScale, targetScale)).toFixed(2));
  if (nextScale === scale.value) return;

  const scaleRatio = nextScale / scale.value;
  const nextTranslateX = anchorX - (anchorX - translateX.value) * scaleRatio;
  const nextTranslateY = anchorY - (anchorY - translateY.value) * scaleRatio;
  const clamped = clampTranslate(nextTranslateX, nextTranslateY, nextScale);
  translateX.value = clamped.x;
  translateY.value = clamped.y;
  scale.value = nextScale;
}

function handleZoomIn() {
  applyScale(scale.value + 0.1);
}

function handleZoomOut() {
  applyScale(scale.value - 0.1);
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable
    || target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]') !== null;
}

function handleKeydown(event: KeyboardEvent) {
  if (event.defaultPrevented || event.isComposing || isEditableTarget(event.target)) return;
  if (event.ctrlKey || event.altKey || event.metaKey) return;
  // Shift is reserved for producing the '+' key on common keyboard layouts.
  if (event.shiftKey && event.key !== '+') return;

  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    handleClose();
    return;
  }

  // Image shortcuts work only while the preview region itself has focus.
  if (event.target !== wrapperRef.value || !canZoom.value) return;

  if (event.key === '+') {
    event.preventDefault();
    handleZoomIn();
    return;
  }

  if (event.key === '-') {
    event.preventDefault();
    handleZoomOut();
    return;
  }

  if (event.key === 'Home') {
    event.preventDefault();
    handleReset();
    return;
  }

  let nextX = translateX.value;
  let nextY = translateY.value;
  const panStep = 40;
  switch (event.key) {
    case 'ArrowLeft':
      nextX -= panStep;
      break;
    case 'ArrowRight':
      nextX += panStep;
      break;
    case 'ArrowUp':
      nextY -= panStep;
      break;
    case 'ArrowDown':
      nextY += panStep;
      break;
    default:
      return;
  }

  event.preventDefault();
  const clamped = clampTranslate(nextX, nextY, scale.value);
  translateX.value = clamped.x;
  translateY.value = clamped.y;
}

function handleMouseDown(event: MouseEvent) {
  if (!hasImage.value) return;
  if (event.button !== 0) return;
  if (!isPannable.value) return;
  isDragging.value = true;
  dragStart.value = {
    x: event.clientX,
    y: event.clientY,
    startX: translateX.value,
    startY: translateY.value
  };
  bindDragListeners();
}

function handleMouseMove(event: MouseEvent) {
  if (!isDragging.value || !dragStart.value) return;
  const dx = event.clientX - dragStart.value.x;
  const dy = event.clientY - dragStart.value.y;
  const nextX = dragStart.value.startX + dx;
  const nextY = dragStart.value.startY + dy;
  const clamped = clampTranslate(nextX, nextY, scale.value);
  translateX.value = clamped.x;
  translateY.value = clamped.y;
}

function handleMouseUp() {
  if (!isDragging.value) return;
  isDragging.value = false;
  dragStart.value = null;
  unbindDragListeners();
}

function handleReset() {
  if (!canZoom.value) return;
  scale.value = 1;
  translateX.value = 0;
  translateY.value = 0;
}

function handleClose() {
  handleMouseUp();
  isOpen.value = false;
}

function restorePreviousFocus() {
  if (hasRestoredFocus) return;
  hasRestoredFocus = true;

  const el = previousFocusedElement.value;
  if (el?.isConnected && typeof el.focus === 'function') {
    el.focus({ preventScroll: true });
  }
}

function handleAfterLeave() {
  restorePreviousFocus();
  emit('close');
}

// 监听全局鼠标事件，保证拖拽在超出图片区域时也能正常结束
function bindDragListeners() {
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
}

function unbindDragListeners() {
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('mouseup', handleMouseUp);
}

async function handleImageLoad(event: Event) {
  const target = event.target as HTMLImageElement | null;
  if (!target || !wrapperRef.value?.contains(target) || target.getAttribute('src') !== props.src) return;
  try {
    await target.decode();
  } catch {
    handleImageError(event, target);
    return;
  }
  if (!wrapperRef.value?.contains(target) || target.getAttribute('src') !== props.src) return;
  hasLoadError.value = false;
  imageNaturalSize.value = {
    width: target.naturalWidth,
    height: target.naturalHeight
  };
  clampCurrentTransform();
}

function handleImageError(event: Event, target = event.target) {
  if (!(target instanceof HTMLImageElement) || !wrapperRef.value?.contains(target) || target.getAttribute('src') !== props.src) return;
  hasLoadError.value = true;
  imageNaturalSize.value = { width: 0, height: 0 };
  scale.value = 1;
  translateX.value = 0;
  translateY.value = 0;
}

onMounted(() => {
  previousFocusedElement.value = (document.activeElement as HTMLElement | null) ?? null;
  void nextTick(() => wrapperRef.value?.focus({ preventScroll: true }));

  if (typeof ResizeObserver !== 'undefined') {
    const el = wrapperRef.value;
    if (el) {
      resizeObserver = new ResizeObserver(() => {
        updateWrapperSize();
        clampCurrentTransform();
      });
      resizeObserver.observe(el);
      updateWrapperSize();
    }
  } else {
    updateWrapperSize();
  }
});

onBeforeUnmount(() => {
  unbindDragListeners();
  resizeObserver?.disconnect();
  resizeObserver = null;

});

onUnmounted(restorePreviousFocus);

watch(
  () => [props.src, props.placeholder],
  () => {
    hasLoadError.value = false;
    imageNaturalSize.value = { width: 0, height: 0 };
    scale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
  }
);
</script>

<style lang="scss">
@use '@/styles/components/result-image-preview.scss';
</style>
