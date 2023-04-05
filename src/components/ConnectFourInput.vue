<script setup lang="ts">
import { usePreventContextMenu } from "@/composables/prevent-context-menu";
import { store } from "@/store";
import { onMounted, onUnmounted, ref, watch, type Ref } from "vue";
import type { ExtendedTouch } from "../extended-touch";
import { extendTouch } from "../extended-touch";
import { slotAnimation } from "../slot-animation";

const props = defineProps<{ disabled?: boolean }>();
const emit = defineEmits<{
  (ev: "update-focus-visible", isFocusVisible: boolean): void;
}>();

const eventAreaRef: Ref<HTMLDivElement | null> = ref(null);
const areaRef: Ref<HTMLDivElement | null> = ref(null);
const contRef: Ref<HTMLDivElement | null> = ref(null);
const slotRef: Ref<HTMLDivElement | null> = ref(null);
const slotAnimRef: Ref<ReturnType<typeof slotAnimation> | null> = ref(null);
const gameRef = store.getGame();

usePreventContextMenu(eventAreaRef);

function isWithinTarget(touch: ExtendedTouch) {
  const el = touch.target as HTMLElement;
  const width = el.offsetWidth;
  const height = el.offsetHeight;
  return (
    touch.offsetX >= 0 &&
    touch.offsetY >= 0 &&
    touch.offsetX < width &&
    touch.offsetY < height
  );
}

let trackedTouch: ExtendedTouch | null = null;
function onTouchStart(ev: TouchEvent) {
  ev.preventDefault();
  const slotAnim = slotAnimRef.value;
  if (trackedTouch || !slotAnim) {
    return;
  }

  trackedTouch = extendTouch(ev.changedTouches.item(0) as Touch, {
    rect: (ev.target as HTMLElement).getBoundingClientRect(),
  });
  slotAnim.continuousInput(false);
  slotAnim.pointer(true);
  slotAnim.pointerMove(trackedTouch);
  slotAnim.pointerPressed(true);
}

function onTouchMove(ev: TouchEvent) {
  ev.preventDefault();
  const slotAnim = slotAnimRef.value;
  if (!(trackedTouch && slotAnim)) {
    return;
  }

  for (const t of ev.changedTouches) {
    if (t.identifier === trackedTouch.identifier) {
      const touchMove = extendTouch(t, {
        rect: (ev.target as HTMLElement).getBoundingClientRect(),
        prevTouch: trackedTouch,
      });

      if (!isWithinTarget(touchMove)) {
        slotAnim.continuousInput(false);
        slotAnim.pointer(false);
        slotAnim.pointerPressed(false);
        slotAnim.pointerMove(touchMove);
        trackedTouch = null;
        return;
      }

      slotAnim.continuousInput(false);
      slotAnim.pointerMove(trackedTouch);
      trackedTouch = touchMove;
      return;
    }
  }
}

function onTouchEndOrCancel(ev: TouchEvent) {
  ev.preventDefault();
  const slotAnim = slotAnimRef.value;
  if (!(trackedTouch && slotAnim)) {
    return;
  }

  for (const t of ev.changedTouches) {
    if (t.identifier === trackedTouch.identifier) {
      const touchEnd = extendTouch(t, {
        rect: (ev.target as HTMLElement).getBoundingClientRect(),
        prevTouch: trackedTouch,
      });
      slotAnim.continuousInput(false);
      slotAnim.pointerPressed(false);
      slotAnim.pointerMove(touchEnd);
      slotAnim.pointer(false);
      trackedTouch = null;
      return;
    }
  }
}

function onMouseEnter(ev: MouseEvent) {
  const slotAnim = slotAnimRef.value;
  if (slotAnim) {
    slotAnim.continuousInput(true);
    slotAnim.pointer(true);
    slotAnim.pointerMove(ev);
  }
}

function onMouseLeave() {
  const slotAnim = slotAnimRef.value;
  if (slotAnim) {
    slotAnim.continuousInput(true);
    slotAnim.pointer(false);
  }
}

function onMouseMove(ev: MouseEvent) {
  const slotAnim = slotAnimRef.value;
  if (slotAnim) {
    slotAnim.continuousInput(true);
    slotAnim.pointer(true);
    slotAnim.pointerMove(ev);
  }
}

function onMouseDown() {
  const slotAnim = slotAnimRef.value;
  if (slotAnim) {
    slotAnim.continuousInput(true);
    slotAnim.pointerPressed(true);
  }
}

function onMouseUp() {
  const slotAnim = slotAnimRef.value;
  if (slotAnim) {
    slotAnim.continuousInput(true);
    slotAnim.pointerPressed(false);
  }
}

function onFocus() {
  const slotAnim = slotAnimRef.value;
  if (slotAnim) {
    slotAnim.keyboard(true);
  }
}

function onBlur() {
  const slotAnim = slotAnimRef.value;
  if (slotAnim) {
    slotAnim.keyboard(false);
  }
}

function onKeyDown(ev: KeyboardEvent) {
  const slotAnim = slotAnimRef.value;
  if (slotAnim) {
    slotAnim.continuousInput(true);
    slotAnim.keyboardKeyDown(ev);
  }
}

function onKeyUp() {
  const slotAnim = slotAnimRef.value;
  if (slotAnim) {
    slotAnim.continuousInput(true);
    slotAnim.keyboardKeyUp();
  }
}

function onDisabled(isDisabled: boolean) {
  const slotAnim = slotAnimRef.value;
  if (slotAnim) {
    slotAnim.disabled(isDisabled);
  }
}

watch(props, (v) => onDisabled(!!v.disabled), { immediate: true });

onMounted(() => {
  const slotEl = slotRef.value as HTMLDivElement;
  const slotAnim = slotAnimation({
    el: slotEl,
    updateFocusVisible: (v) => emit("update-focus-visible", v),
  });
  slotAnim.disabled(!!props.disabled);
  slotAnimRef.value = slotAnim;
});

onUnmounted(() => {
  const slotAnim = slotAnimRef.value;
  if (slotAnim) {
    slotAnim.destroy();
  }

  slotAnimRef.value = null;
});

let prevMoves = 0;
let prevTimeout: number | null = null;
watch(gameRef, (game) => {
  const { turnTimeout } = store;
  const { moves } = game.state;
  const slotAnim = slotAnimRef.value;
  if (turnTimeout !== prevTimeout && moves === prevMoves && slotAnim) {
    slotAnim.disabled(true);
    slotAnim.disabled(false);
  }

  prevTimeout = turnTimeout;
  prevMoves = moves;
});
</script>

<template>
  <div
    class="event-area"
    :tabindex="-!!store.lobby"
    @touchstart="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="onTouchEndOrCancel"
    @touchcancel="onTouchEndOrCancel"
    @keydown="onKeyDown"
    @keyup="onKeyUp"
    @mouseenter="onMouseEnter"
    @mousemove="onMouseMove"
    @mouseleave="onMouseLeave"
    @mousedown="onMouseDown"
    @mouseup="onMouseUp"
    @focus="onFocus"
    @blur="onBlur"
    ref="eventAreaRef"
  ></div>
  <div class="new-area" ref="areaRef">
    <div class="slot-container" ref="contRef">
      <div class="slot animate p1" ref="slotRef"></div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.event-area {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;

  &:focus-visible {
    outline: none;
  }
}

.new-area {
  position: absolute;
  top: -50px;
  left: 0;
  width: 100%;
  height: 48px;
  pointer-events: none;
}

.slot {
  &.appear-enter-active {
    animation: appear 120ms;
  }

  &.appear-leave-active {
    animation: appear 120ms reverse;
  }
}

.slot.instant {
  animation-duration: 0.00000001ms;
}

@keyframes appear {
  0% {
    width: 0;
    height: 0;
  }

  9.99% {
    opacity: 0;
  }

  10% {
    opacity: 1;
  }

  100% {
    width: 32px;
    height: 32px;
  }
}
</style>
