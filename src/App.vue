<template>
  <div class="wrapper">
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
    <van-tabbar placeholder route v-model="active" @change="onChange">
      <van-tabbar-item icon="home-o" replace to="/home">首页</van-tabbar-item>
      <van-tabbar-item icon="search" replace to="/maths">数学</van-tabbar-item>
      <van-tabbar-item icon="friends-o" replace to="/todoList"
        >备忘录</van-tabbar-item
      >
      <van-tabbar-item icon="setting-o" replace to="/luckdraw"
        >我的</van-tabbar-item
      >
    </van-tabbar>
  </div>
</template>

<script>
import { defineComponent, ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";

export default defineComponent({
  name: "App",
  setup() {
    const routr = useRoute();
    const showFooter = computed(() => routr.path.split("/").length < 3);
    const active = ref(0);
    const onChange = (index) => {
      console.log(`当前切换的是：${index}`);
    };
    onMounted(() => {
      onChange(2);
    });
    return {
      showFooter,
      onChange,
    };
  },
});
</script>
<style>
.van-tabbar__placeholder {
  display: block !important;
}
</style>
