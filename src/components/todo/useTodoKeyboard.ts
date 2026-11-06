import { nextTick, onBeforeUnmount, onMounted, ref, type Ref } from "vue";

/** 根据实际可视区域避让软键盘，保留文档滚动，不锁定页面高度。 */
export function useTodoKeyboard(root: Ref<HTMLElement | undefined>) {
  const bottomSpace = ref(0);
  let frame = 0;
  let disposed = false;
  let observedViewport: VisualViewport | null = null;

  async function update() {
    frame = 0;
    const input = document.activeElement as HTMLElement | null;
    const viewport = window.visualViewport;
    if (
      !input ||
      !root.value?.contains(input) ||
      !input.matches('input[type="text"], textarea') ||
      (viewport && viewport.scale > 1.05)
    ) {
      // 缩放时沿用浏览器原生平移，避免把双指缩放误判成键盘。
      bottomSpace.value = 0;
      return;
    }
    const top = (viewport?.offsetTop ?? 0) + 12;
    let bottom =
      (viewport?.offsetTop ?? 0) +
      (viewport?.height ?? window.innerHeight) -
      12;
    bottomSpace.value = Math.max(0, window.innerHeight - bottom - 12);
    await nextTick();
    if (disposed || document.activeElement !== input) return;

    const tabbar = document
      .querySelector(".van-tabbar--fixed")
      ?.getBoundingClientRect();
    if (tabbar && tabbar.top < bottom && tabbar.bottom > top) {
      bottom = Math.max(top, tabbar.top - 12);
    }
    const form = input.closest("form")?.getBoundingClientRect();
    // 竖屏优先露出整个表单和保存按钮；横屏空间不足时先保证输入框可见。
    const region =
      form && form.height <= bottom - top
        ? form
        : input.getBoundingClientRect();
    const delta =
      region.bottom > bottom
        ? region.bottom - bottom
        : region.top < top
          ? region.top - top
          : 0;
    if (Math.abs(delta) > 1) window.scrollBy({ top: delta, behavior: "auto" });
  }

  function scheduleUpdate() {
    if (frame) window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(update);
  }

  onMounted(() => {
    observedViewport = window.visualViewport;
    window.addEventListener("resize", scheduleUpdate);
    observedViewport?.addEventListener("resize", scheduleUpdate);
  });
  onBeforeUnmount(() => {
    disposed = true;
    if (frame) window.cancelAnimationFrame(frame);
    window.removeEventListener("resize", scheduleUpdate);
    observedViewport?.removeEventListener("resize", scheduleUpdate);
  });

  return { bottomSpace, scheduleUpdate };
}
