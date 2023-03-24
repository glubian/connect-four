<script setup lang="ts">
import { useResize } from "@/composables/resize";
import { layoutStore } from "@/layout-store";
import { computed, ref, watch, type Ref } from "vue";

const props = defineProps({
  shown: Boolean,
  top: Number, // px
  left: Number, // px
  right: Number, // px
  bottom: Number, // px
});
const emit = defineEmits(["update:shown"]);

const POPOVER_HEIGHT = "--popover-height";
const POPOVER_TOP = "--popover-top";
const POPOVER_LEFT = "--popover-left";

const popoverRef: Ref<HTMLDivElement | null> = ref(null);
const { offsetWidth: popoverWidth, offsetHeight: popoverHeight } =
  useResize(popoverRef);
const closePopoverRef: Ref<HTMLDivElement | null> = ref(null);

const popoverTop = computed(() => {
  const size = popoverHeight.value;
  if (!size) {
    return 0;
  }
  const space = layoutStore.innerHeight;
  const { top, bottom } = props;
  const pos = typeof bottom === "number" ? space - bottom - size : top ?? 0;
  return adjustPosition(pos, size, space);
});
const popoverLeft = computed(() => {
  const size = popoverWidth.value;
  if (!size) {
    return 0;
  }
  const space = layoutStore.innerWidth;
  const { left, right } = props;
  const pos = typeof right === "number" ? space - right - size : left ?? 0;
  return adjustPosition(pos, size, space);
});
const popoverStyle = computed(() => ({
  [POPOVER_TOP]: popoverTop.value + "px",
  [POPOVER_LEFT]: popoverLeft.value + "px",
}));

/**
 * Adjusts position to fit the element on screen.
 * @param pos - position in pixels
 * @param size - size of the element in pixels
 * @param space - available space in pixels
 */
function adjustPosition(pos: number, size: number, space: number): number {
  const PADDING = 8; // px
  if (pos + size >= space - PADDING) {
    pos = space - PADDING - size;
  }

  return pos < PADDING ? PADDING : pos;
}

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
            <div class="popover c1" :style="popoverStyle" ref="popoverRef">
              <slot></slot>
            </div>
          </div>
        </FocusTrap>
      </div>
    </Transition>
  </Teleport>
</template>
<style lang="scss" scoped>
@use "@/layout.scss" as l;

$appear-duration: 200ms;

.popover {
  position: absolute;
  top: var(--popover-top);
  left: var(--popover-left);

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

@media (max-width: l.$popover-appearance-desktop) {
  .popover {
    top: auto;
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
