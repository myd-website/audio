<script lang="ts">
import { defineComponent, h } from "vue";
import AppSelect from "@/shared/components/AppSelect.vue";

// 保留旧的全局 YuiSelect 入口，统一使用 AppSelect 的属性、事件和交互。
export default defineComponent({
  name: "YuiSelect",
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () =>
      h(AppSelect, attrs as InstanceType<typeof AppSelect>["$props"], slots);
  },
});
</script>
