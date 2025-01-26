import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    redirect: "/home",
  },
  {
    path: '/home',
    name: 'Home',
    component: () => import(/* webpackChunkName: "audio" */ '@/views/AudioView.vue')
  },
  {
    path: '/maths',
    name: 'Maths',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "maths" */ '@/views/MathsView.vue')
  },
  {
    path: '/todoList',
    name: 'TodoList',
    component: () => import(/* webpackChunkName: "todo" */ '@/views/TodoList.vue')
  },
  {
    path: '/luckdraw',
    name: 'LuckDraw',
    component: () => import(/* webpackChunkName: "luckdraw" */ '@/views/LuckDraw.vue')
  },
  {
    path: '/address/list',
    name: 'Address',
    component: () => import(/* webpackChunkName: "address" */ '@/views/address/AddressList')
  },
  {
    path: '/address/edit',
    name: 'AddressEdit',
    component: () => import(/* webpackChunkName: "address" */ '@/views/address/AddressEdit')
  },
  {
    path: '/chat/list',
    name: 'Chat',
    component: () => import(/* webpackChunkName: "chatpage" */ '@/views/chat')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 添加全局前置守卫
router.beforeEach((to, from, next) => {
  console.log(from, 'from')
  // 检查目标路径是否为 /audio
  if (to.path === '/audio') {
    // 如果是，则重定向到 /home
    next('/home');
  } else {
    // 否则继续原来的导航
    next();
  }
});

export default router
