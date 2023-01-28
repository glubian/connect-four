<script setup lang="ts">
import { FocusTrap } from "focus-trap-vue";
import { computed, ref, type Ref } from "vue";

const props = defineProps({
  shown: Boolean,
  contextMenuPosition: Object,
});
const emit = defineEmits(["update:shown"]);

const closeMenuRef: Ref<HTMLDivElement | null> = ref(null);

const focusTrapModel = computed({
  get() {
    return props.shown;
  },
  set(v) {
    emit("update:shown", v);
  },
});

function closeMenu(this: HTMLDivElement, ev: MouseEvent) {
  const closeMenuEl = closeMenuRef.value;
  if (ev.target === closeMenuEl) {
    focusTrapModel.value = false;
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="appear">
      <div
        v-if="shown"
        @click="closeMenu"
        ref="closeMenuRef"
        class="close-dialog"
      >
        <FocusTrap v-model:active="focusTrapModel">
          <div class="context-menu c1" :style="props.contextMenuPosition">
            <slot></slot>
          </div>
        </FocusTrap>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
$desktop-context-menu-min-width: 580px;
$appear-duration: 200ms;

.context-menu {
  display: flex;
  align-items: stretch;
  flex-direction: column;

  position: absolute;
  top: var(--context-menu-top);
  left: var(--context-menu-left);
  bottom: var(--context-menu-bottom);
  right: var(--context-menu-right);

  min-width: 260px;
  border-radius: 4px;

  background: var(--c);
  color: var(--c-text);
  box-shadow: var(--c-context-menu-drop-shadow);

  z-index: 100;
}

.close-dialog {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;

  z-index: 99;
  overflow-y: hidden;
}

@media (max-width: $desktop-context-menu-min-width) {
  .context-menu {
    top: initial;
    right: initial;
    bottom: 0;
    left: 0;

    width: 100%;
    border-radius: 16px 16px 0 0;
    padding-bottom: 8px;

    box-shadow: none;

    transform: translateY(0);

    &:first-child::before {
      content: "";
      box-sizing: border-box;
      width: 64px;
      height: 4px;
      margin: 6px auto;
      background-color: var(--c-context-menu-separator-color);
    }
  }

  .close-dialog {
    background-color: var(--c-dialog-background);
  }

  .close-dialog:is(.appear-enter-from, .appear-leave-to) {
    background-color: transparent;
    .context-menu {
      transform: translateY(370px);
    }
  }

  .close-dialog.appear-enter-active {
    transition: background-color $appear-duration ease-out;
    .context-menu {
      transition: transform $appear-duration ease-out;
    }
  }

  .close-dialog.appear-leave-active {
    transition: background-color $appear-duration ease-in;
    .context-menu {
      transition: transform $appear-duration ease-in;
    }
  }
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
