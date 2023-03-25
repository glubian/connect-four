<script setup lang="ts">
import { computed } from "vue";
import AppPopover from "./AppPopover.vue";

const props = defineProps({
  shown: Boolean,
  contextMenuPosition: Object,
});
const emit = defineEmits(["update:shown"]);

const isShown = computed({
  get() {
    return props.shown;
  },
  set(v) {
    emit("update:shown", v);
  },
});
</script>

<template>
  <AppPopover v-model:shown="isShown">
    <div class="context-menu">
      <slot></slot>
    </div>
  </AppPopover>
</template>

<style scoped lang="scss">
.context-menu {
  display: flex;
  align-items: stretch;
  flex-direction: column;
  min-width: 260px;
}
</style>
