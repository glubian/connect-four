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

<style lang="scss">
.context-menu :is(button, button:hover, button:active) {
  display: flex;
  align-items: center;
  justify-content: space-between;

  border-radius: 0;
  color: var(--c-text);
  background: none;
  border: none;
  box-shadow: none;
  transition: none;
  transform: none;
}

.context-menu button:is(:hover, :active, :focus-visible) {
  background: var(--c-context-menu-hover);
}

.context-menu button:not(.app-setting-toggle):is(:focus-visible) {
  text-decoration: underline;
}

.context-menu .section {
  display: flex;
  flex-direction: column;
  align-items: stretch;

  padding-bottom: 8px;

  .title {
    box-sizing: border-box;
    display: flex;
    align-items: flex-end;

    height: 40px;
    padding: 0 0 8px 16px;
  }
}

.context-menu .section:not(:first-child) {
  border-top: var(--c-context-menu-separator);
}
</style>
