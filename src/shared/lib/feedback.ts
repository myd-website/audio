import { showToast } from "vant";
export function message(cause: unknown) {
  return cause instanceof Error ? cause.message : "操作失败，请重试。";
}
export function act(action: () => void) {
  try {
    action();
    return true;
  } catch (cause) {
    showToast(message(cause));
    return false;
  }
}
