<script setup lang="ts">
import { computed, ref, watch, type Ref } from "vue";

const props = defineProps({
  shown: Boolean,
  popoverPosition: Object,
});
const emit = defineEmits(["update:shown"]);

const POPOVER_HEIGHT = "--popover-height";

const popoverRef: Ref<HTMLDivElement | null> = ref(null);
const closePopoverRef: Ref<HTMLDivElement | null> = ref(null);

const focusTrapModel = computed({
  get() {
    return props.shown;
  },
  set(v) {
    emit("update:shown", v);
  },
});

function updateHeight(el: HTMLDivElement) {
  el.style.setProperty(POPOVER_HEIGHT, el.offsetHeight + "px");
}

function closePopover(this: HTMLDivElement, ev: MouseEvent) {
  const closePopoverEl = closePopoverRef.value;
  if (ev.target === closePopoverEl) {
    const popoverEl = popoverRef.value;
    if (popoverEl) {
      updateHeight(popoverEl);
    }

    focusTrapModel.value = false;
  }
}

watch(popoverRef, (el) => {
  if (el) {
    updateHeight(el);
  }
});
</script>
<template>
  <Teleport to="body">
    <Transition name="appear">
      <div
        v-if="shown"
        @click="closePopover"
        ref="closePopoverRef"
        class="close-popover"
      >
        <FocusTrap v-model:active="focusTrapModel">
          <div>
            <div class="popover c1" :style="popoverPosition" ref="popoverRef">
            <slot></slot>
            </div>
          </div>
        </FocusTrap>
      </div>
    </Transition>
  </Teleport>
</template>
<style lang="scss" scoped>
$desktop-popover-min-width: 580px;
$appear-duration: 200ms;

.popover {
  position: absolute;
  top: var(--popover-top);
  left: var(--popover-left);
  bottom: var(--popover-bottom);
  right: var(--popover-right);

  border-radius: 4px;

  background: var(--c);
  color: var(--c-text);
  box-shadow: var(--c-context-menu-drop-shadow);

  z-index: 100;
}

.close-popover {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;

  z-index: 99;
  overflow-y: hidden;
}

@media (max-width: $desktop-popover-min-width) {
  .popover {
    top: initial;
    right: initial;
    bottom: 0;
    left: 0;

    width: 100%;
    border-radius: 16px 16px 0 0;
    padding: 4px 0 8px 0;

    box-shadow: none;

    transform: translateY(0);
  }

  .close-popover {
    background-color: var(--c-dialog-background);
  }

  .close-popover:is(.appear-enter-from, .appear-leave-to) {
    background-color: transparent;
    .popover {
      transform: translateY(var(--popover-height, 100vh));
    }
  }

  .close-popover.appear-enter-active {
    transition: background-color $appear-duration ease-out;
    .popover {
      transition: transform $appear-duration ease-out;
    }
  }

  .close-popover.appear-leave-active {
    transition: background-color $appear-duration ease-in;
    .popover {
      transition: transform $appear-duration ease-in;
    }
  }
}
</style>
