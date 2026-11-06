import { ref } from "vue";
import { useRouter } from "vue-router";
import { useProfileStore } from "../stores/profile";
import { message } from "../lib/feedback";
import { showToast } from "vant";

export function useProfileActions() {
  const router = useRouter();
  const profile = useProfileStore();
  const exiting = ref(false);
  async function exitProfile() {
    if (exiting.value) return;
    exiting.value = true;
    try {
      // 先经过页面的离开保护；取消练习/编辑退出时，仍保留当前档案。
      const failure = await router.push("/profiles");
      if (failure || router.currentRoute.value.path !== "/profiles") return;
      profile.exit();
      // 当前文档绑定原档案，完整刷新后释放旧播放器、计时器和异步任务。
      window.location.reload();
    } catch (cause) {
      showToast(message(cause));
    } finally {
      exiting.value = false;
    }
  }
  return { exitProfile, exiting };
}
