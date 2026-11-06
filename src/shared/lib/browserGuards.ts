/** 只拦截页面收到的常用调试入口，不构成源码或数据的访问控制。 */
export function installProductionBrowserGuards(target: Window = window) {
  if (import.meta.env.DEV) return;

  const prevent = (event: Event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  target.addEventListener(
    "keydown",
    (event) => {
      // Option 组合键可能改变 key 的字符，优先按物理键位识别快捷键。
      const key = event.code.startsWith("Key")
        ? event.code.slice(3).toLowerCase()
        : event.key.toLowerCase();
      const inspectorShortcut =
        ((event.ctrlKey && event.shiftKey && !event.altKey) ||
          (event.metaKey && event.altKey)) &&
        ["i", "j", "c", "k"].includes(key);
      const sourceShortcut =
        key === "u" &&
        ((event.ctrlKey && !event.shiftKey && !event.altKey) ||
          (event.metaKey && event.altKey));
      const contextMenuShortcut =
        key === "contextmenu" || (key === "f10" && event.shiftKey);
      if (
        key === "f12" ||
        event.code === "F12" ||
        inspectorShortcut ||
        sourceShortcut ||
        contextMenuShortcut
      )
        prevent(event);
    },
    { capture: true, passive: false },
  );
  target.addEventListener("contextmenu", prevent, {
    capture: true,
    passive: false,
  });
}
