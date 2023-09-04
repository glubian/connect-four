<script setup lang="ts">
import { usePreventContextMenu } from "@/composables/prevent-context-menu";
import { useTimer } from "@/composables/timer";
import { HALF_CONT_SIZE } from "@/game-ui";
import { store } from "@/store";
import { computed, onMounted, onUnmounted, ref, watch, type Ref } from "vue";
import type { ExtendedTouch } from "../extended-touch";
import { extendTouch } from "../extended-touch";
import { slotAnimation } from "../slot-animation";
import ConnectFourInputHint from "./ConnectFourInputHint.vue";

const props = defineProps<{ disabled?: boolean }>();
const emit = defineEmits<{
  (ev: "update:chip-visible", isVisible: boolean): void;
  (ev: "update:hint-shown", isShown: boolean): void;
  (ev: "update-focus-visible", isFocusVisible: boolean): void;
}>();

const eventAreaRef: Ref<HTMLDivElement | null> = ref(null);
const areaRef: Ref<HTMLDivElement | null> = ref(null);
const contRef: Ref<HTMLDivElement | null> = ref(null);
const slotRef: Ref<HTMLDivElement | null> = ref(null);
const slotAnimRef: Ref<ReturnType<typeof slotAnimation> | null> = ref(null);
const gameRef = store.getGame();

const chipVisible = ref(false);
const chipPosition = ref(0);
const hintVisible = ref(false);
const hasMoved = ref(false);

usePreventContextMenu(eventAreaRef);
const inactivityTimer = useTimer(2000, showHint);
const turnDebounceTimer = useTimer(1000, () => {
  hasMoved.value = false;
  const slotAnim = slotAnimRef.value;
  if (slotAnim && store.timePerTurn > 0) {
    showHint();
  }
});

function trackEvent(ts: number) {
  if (!(props.disabled || store.isUntouched || turnDebounceTimer.isRunning)) {
    inactivityTimer.reset(ts);
  }
}

function showHint() {
  const slotAnim = slotAnimRef.value;
  if (slotAnim && !store.isUntouched) {
    slotAnim.hint();
  }
}

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
  hasMoved.value = true;
  const slotAnim = slotAnimRef.value;
  if (trackedTouch || !slotAnim) {
    return;
  }

  trackEvent(ev.timeStamp);
  trackedTouch = extendTouch(ev.changedTouches.item(0) as Touch, {
    rect: (ev.target as HTMLElement).getBoundingClientRect(),
  });
  slotAnim.continuousInput(false);
  // A temporary fix that allows mode transition to happen.
  // FIXME: Handle this within `slot-animation.ts`
  if (!hintVisible.value) {
    slotAnim.pointer(true);
  }
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
      trackEvent(ev.timeStamp);
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
      trackEvent(ev.timeStamp);
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
  hasMoved.value = true;
  const slotAnim = slotAnimRef.value;
  if (slotAnim) {
    trackEvent(ev.timeStamp);
    slotAnim.continuousInput(true);
    slotAnim.pointer(true);
    slotAnim.pointerMove(ev);
  }
}

function onMouseLeave(ev: MouseEvent) {
  const slotAnim = slotAnimRef.value;
  if (slotAnim) {
    trackEvent(ev.timeStamp);
    slotAnim.continuousInput(true);
    slotAnim.pointer(false);
  }
}

function onMouseMove(ev: MouseEvent) {
  hasMoved.value = hasMoved.value || !!(ev.buttons & 1);
  const slotAnim = slotAnimRef.value;
  if (slotAnim) {
    trackEvent(ev.timeStamp);
    slotAnim.continuousInput(true);
    slotAnim.pointer(true);
    slotAnim.pointerMove(ev);
  }
}

function onMouseDown(ev: MouseEvent) {
  hasMoved.value = hasMoved.value || !!(ev.buttons & 1);
  const slotAnim = slotAnimRef.value;
  if (slotAnim) {
    trackEvent(ev.timeStamp);
    slotAnim.continuousInput(true);
    slotAnim.pointerPressed(true);
  }
}

function onMouseUp(ev: MouseEvent) {
  const slotAnim = slotAnimRef.value;
  if (slotAnim) {
    trackEvent(ev.timeStamp);
    slotAnim.continuousInput(true);
    slotAnim.pointerPressed(false);
  }
}

function onFocus(ev: FocusEvent) {
  hasMoved.value = true;
  const slotAnim = slotAnimRef.value;
  if (slotAnim) {
    trackEvent(ev.timeStamp);
    slotAnim.keyboard(true);
  }
}

function onBlur(ev: FocusEvent) {
  const slotAnim = slotAnimRef.value;
  if (slotAnim) {
    trackEvent(ev.timeStamp);
    slotAnim.keyboard(false);
  }
}

function onKeyDown(ev: KeyboardEvent) {
  hasMoved.value = true;
  const slotAnim = slotAnimRef.value;
  if (slotAnim) {
    trackEvent(ev.timeStamp);
    slotAnim.continuousInput(true);
    slotAnim.keyboardKeyDown(ev);
  }
}

function onKeyUp(ev: KeyboardEvent) {
  const slotAnim = slotAnimRef.value;
  if (slotAnim) {
    trackEvent(ev.timeStamp);
    slotAnim.continuousInput(true);
    slotAnim.keyboardKeyUp();
  }
}

function onDisabled(isDisabled: boolean) {
  const slotAnim = slotAnimRef.value;
  if (slotAnim) {
    slotAnim.disabled(isDisabled);
    if (isDisabled) {
      inactivityTimer.clear();
    } else {
      inactivityTimer.reset();
    }
  }
}

function updateChipVisible(isVisible: boolean) {
  chipVisible.value = isVisible;
  emit("update:chip-visible", isVisible);
}

const hintStyle = computed(() => {
  const x = chipPosition.value;
  const isVisible = chipVisible.value;
  const clipPath = isVisible ? `inset(0 0 0 ${x + HALF_CONT_SIZE}px)` : "";
  return { clipPath };
});

watch(
  () => gameRef.value.state.turn,
  () => {
    hasMoved.value = false;
    inactivityTimer.reset();
    turnDebounceTimer.reset();
  }
);

watch(props, (v) => onDisabled(!!v.disabled), { immediate: true });

onMounted(() => {
  const slotEl = slotRef.value as HTMLDivElement;
  const slotAnim = slotAnimation({
    el: slotEl,
    updateVisible: updateChipVisible,
    updatePosition: (x) => void (chipPosition.value = x),
    updateHint: (v) => void (hintVisible.value = v),
    updateFocusVisible: (v) => emit("update-focus-visible", v),
  });
  slotAnim.disabled(!!props.disabled);
  slotAnimRef.value = slotAnim;
  inactivityTimer.reset();
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
    :tabindex="-(!!store.lobby && store.isConnected)"
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
    <ConnectFourInputHint
      :chip-visible="chipVisible"
      :hint-visible="hintVisible"
      :has-moved="hasMoved && !turnDebounceTimer.isRunning"
      :style="hintStyle"
      @update:shown="(v) => emit('update:hint-shown', v)"
    />
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
