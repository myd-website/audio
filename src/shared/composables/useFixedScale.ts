import { onMounted, onBeforeUnmount } from "vue";

export function useFixedScale() {
  const preventGesture = (event: Event) => {
    if (event.cancelable) event.preventDefault();
  };
  const preventPinch = (event: TouchEvent) => {
    // 单指滚动和竖式区域横向滚动保留，只拦截多指缩放手势。
    if (event.touches.length > 1) preventGesture(event);
  };
  onMounted(() => {
    document.addEventListener("touchmove", preventPinch, { passive: false });
    document.addEventListener("gesturestart", preventGesture, {
      passive: false,
    });
    document.addEventListener("gesturechange", preventGesture, {
      passive: false,
    });
  });
  onBeforeUnmount(() => {
    document.removeEventListener("touchmove", preventPinch);
    document.removeEventListener("gesturestart", preventGesture);
    document.removeEventListener("gesturechange", preventGesture);
  });
}
