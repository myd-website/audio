import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";

function activeEditor(): HTMLElement | null {
  const element = document.activeElement as HTMLElement | null;
  if (!element || element.matches(":disabled, [readonly], [inputmode='none']"))
    return null;
  return element.matches(
    "textarea,input:not([type]),input[type=text],input[type=search],input[type=email],input[type=url],input[type=tel],input[type=password],input[type=number]",
  ) || element.isContentEditable
    ? element
    : null;
}

function scrollDelta(
  input: HTMLElement,
  top: number,
  bottom: number,
  container?: HTMLElement,
) {
  if (bottom <= top) return 0;
  const form = input.closest("form");
  const formRect =
    form && (!container || container.contains(form))
      ? form.getBoundingClientRect()
      : null;
  // 短表单连同提交按钮一起露出；长表单和横屏优先当前输入框。
  const rect =
    formRect && formRect.height <= bottom - top
      ? formRect
      : input.getBoundingClientRect();
  if (rect.height > bottom - top || rect.top < top) return rect.top - top;
  return Math.max(0, rect.bottom - bottom);
}

function revealEditor(input: HTMLElement, top: number, bottom: number) {
  // 旧待办自带局部键盘处理，避免两套逻辑重复移动页面。
  if (input.closest(".todo-board")) return;
  let parent = input.parentElement;
  while (
    parent &&
    parent !== document.body &&
    parent !== document.documentElement
  ) {
    const style = window.getComputedStyle(parent);
    if (
      /(auto|scroll)/.test(style.overflowY) &&
      parent.scrollHeight > parent.clientHeight
    ) {
      const rect = parent.getBoundingClientRect();
      const innerTop = rect.top + parent.clientTop;
      const delta = scrollDelta(
        input,
        Math.max(top, innerTop),
        Math.min(bottom, innerTop + parent.clientHeight),
        parent,
      );
      if (Math.abs(delta) > 1) parent.scrollTop += delta;
    }
    // 弹层锁住 body 时，只滚动弹层内容，不移动其后方页面。
    if (style.position === "fixed") return;
    parent = parent.parentElement;
  }
  for (const bar of document.querySelectorAll(
    ".bottom-nav,.mini-player,.van-tabbar--fixed",
  )) {
    const rect = bar.getBoundingClientRect();
    if (rect.height > 0 && rect.top > top && rect.top < bottom)
      bottom = rect.top - 12;
  }
  const delta = scrollDelta(input, top, bottom);
  if (Math.abs(delta) > 1) window.scrollBy({ top: delta, behavior: "auto" });
}

/** 兼容键盘压缩布局视口和仅压缩可视视口两种模式，缩放时不干预。 */
export function useMobileViewport() {
  const keyboardOpen = ref(false);
  const viewportStyle = ref<Record<string, string>>({});
  let frame = 0;
  let revision = 0;
  let disposed = false;
  let shouldReveal = false;
  let baselineHeight = 0;
  let baselineWidth = 0;
  let observedViewport: VisualViewport | null = null;

  async function update() {
    frame = 0;
    const currentRevision = revision;
    const viewport = window.visualViewport;
    if (viewport && Math.abs(viewport.scale - 1) > 0.05) {
      keyboardOpen.value = false;
      viewportStyle.value = {};
      shouldReveal = false;
      return;
    }
    const input = activeEditor();
    // 同一方向保留未压缩高度；旋转屏幕后重新建立基准，避免沿用竖屏高度。
    if (baselineWidth !== window.innerWidth) {
      baselineWidth = window.innerWidth;
      baselineHeight = window.innerHeight;
    }
    baselineHeight = Math.max(baselineHeight, window.innerHeight);
    const height = viewport?.height ?? window.innerHeight;
    const offsetTop = viewport?.offsetTop ?? 0;
    const offset = Math.max(0, window.innerHeight - height - offsetTop);
    keyboardOpen.value =
      !!input && Math.max(offset, baselineHeight - height) > 120;
    viewportStyle.value = {
      "--aide-visible-height": `${Math.round(height)}px`,
      "--aide-keyboard-offset": `${input ? Math.round(offset) : 0}px`,
    };
    // 等待弹层高度、底部留白及导航显隐生效，再按实际坐标滚动。
    await nextTick();
    if (disposed || currentRevision !== revision) return;
    if (shouldReveal && input && document.activeElement === input) {
      revealEditor(input, offsetTop + 16, offsetTop + height - 20);
    }
    shouldReveal = false;
  }
  function schedule(reveal: boolean) {
    shouldReveal ||= reveal;
    revision++;
    window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(update);
  }
  const reveal = () => schedule(true);
  // 可视视口平移时仅更新弹层位置，保留用户手动滚动的控制权。
  const reposition = () => schedule(false);
  onMounted(() => {
    observedViewport = window.visualViewport;
    baselineWidth = window.innerWidth;
    baselineHeight = window.innerHeight;
    observedViewport?.addEventListener("resize", reveal);
    observedViewport?.addEventListener("scroll", reposition);
    window.addEventListener("resize", reveal);
    document.addEventListener("focusin", reveal);
    document.addEventListener("focusout", reposition);
    reveal();
  });
  onBeforeUnmount(() => {
    disposed = true;
    window.cancelAnimationFrame(frame);
    observedViewport?.removeEventListener("resize", reveal);
    observedViewport?.removeEventListener("scroll", reposition);
    window.removeEventListener("resize", reveal);
    document.removeEventListener("focusin", reveal);
    document.removeEventListener("focusout", reposition);
  });
  return { keyboardOpen, viewportStyle };
}
