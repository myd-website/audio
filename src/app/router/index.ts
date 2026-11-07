import { createRouter, createWebHashHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
import ProfilesPage from "@/modules/account/pages/ProfilesPage.vue";
import { useProfileStore } from "@/shared/stores/profile";

declare module "vue-router" {
  interface RouteMeta {
    tab?: string;
    keepAlive?: boolean;
    name?: string;
  }
}

const routes: RouteRecordRaw[] = [
  { path: "/", redirect: "/today" },
  {
    path: "/profiles",
    component: ProfilesPage,
  },
  {
    path: "/today",
    component: () => import("@/modules/dashboard/pages/TodayPage.vue"),
    meta: { tab: "/today", keepAlive: true, name: "TodayPage" },
  },
  {
    path: "/study",
    component: () => import("@/modules/study/pages/StudyPage.vue"),
    meta: { tab: "/study", keepAlive: true, name: "StudyPage" },
  },
  {
    path: "/calculator",
    component: () => import("@/modules/study/pages/CalculatorPage.vue"),
    meta: { tab: "/study" },
  },
  { path: "/maths", redirect: "/calculator?mode=vertical" },
  {
    path: "/study/courses",
    component: () => import("@/modules/study/pages/CoursesPage.vue"),
    meta: { tab: "/study" },
  },
  {
    path: "/study/dictionary",
    component: () => import("@/modules/study/pages/DictionaryPage.vue"),
    meta: { tab: "/study" },
  },
  {
    path: "/music",
    component: () => import("@/modules/music/pages/MusicPage.vue"),
    meta: { tab: "/music", keepAlive: true, name: "MusicPage" },
  },
  {
    path: "/music/tools",
    component: () => import("@/modules/music/pages/AudioToolsPage.vue"),
    meta: { tab: "/music" },
  },
  {
    path: "/planner",
    component: () => import("@/modules/planner/pages/PlannerPage.vue"),
    meta: { tab: "/planner", keepAlive: true, name: "PlannerPage" },
  },
  {
    path: "/planner/legacy",
    component: () => import("@/views/TodoList.vue"),
    meta: { tab: "/planner" },
  },
  {
    path: "/fun",
    component: () => import("@/modules/fun/pages/FunPage.vue"),
    meta: { tab: "/fun", keepAlive: true, name: "FunPage" },
  },
  {
    path: "/settings",
    component: () => import("@/modules/account/pages/SettingsPage.vue"),
    meta: { tab: "/today" },
  },
  {
    path: "/address/list",
    component: () => import("@/views/address/AddressList"),
    meta: { tab: "/today" },
  },
  {
    path: "/address/edit",
    component: () => import("@/views/address/AddressEdit"),
    meta: { tab: "/today" },
  },
  {
    path: "/chat/list",
    component: () => import("@/views/chat"),
    meta: { tab: "/today" },
  },
  { path: "/home", redirect: "/today" },
  { path: "/audio", redirect: "/music/tools" },
  { path: "/musicList", redirect: "/music" },
  { path: "/todoList", redirect: "/planner" },
  { path: "/luckdraw", redirect: "/fun" },
  { path: "/:pathMatch(.*)*", redirect: "/today" },
];
const router = createRouter({
  // Hash 路由无需 GitHub Pages 提供服务器重写规则，子页面刷新也能进入应用。
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});
router.beforeEach((to) => {
  // 在守卫执行时获取 store，确保 Pinia 已安装；兼容路由同样受入口限制。
  if (to.path !== "/profiles" && !useProfileStore().current)
    return { path: "/profiles", replace: true };
});
export default router;
