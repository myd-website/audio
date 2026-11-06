export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 160);
  document.body.appendChild(link);
  link.click();
  link.remove();
  // 手机浏览器可能异步读取资源，不能在 click 后立即撤销。
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
