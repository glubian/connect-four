<script lang="ts" setup>
import { gameUIStore } from "@/game-ui-store";
import { store } from "@/store";
import { computed } from "vue";

const props = defineProps<{
  hintShown?: boolean;
  disabled?: boolean;
  focusVisible?: boolean;
}>();

const { round } = Math;

const FOCUS_VISIBLE_CLASS = "focus-visible";
const STAGGER = 40; // ms
const DURATION = 120; // ms
const ENTER_DURATION = 3 * STAGGER + DURATION; // ms

const enabled = computed(() => {
  return store.timeCap !== 0 && !gameUIStore.state.result && !store.lobby;
});
const focusVisibleClass = computed(() => {
  return props.focusVisible ? FOCUS_VISIBLE_CLASS : "";
});

const top = computed(() => round(store.timeCap / 1000));
const left = computed(() => round((3 * store.timeCap) / 4000));
const bottom = computed(() => round(store.timeCap / 2000));
const right = computed(() => round(store.timeCap / 4000));

const topStyle = computed(() => {
  const { disabled, hintShown } = props;
  return { opacity: !disabled || hintShown ? "0" : "" };
});
</script>

<template>
  <Transition
    name="appear"
    :duration="{ enter: ENTER_DURATION, leave: DURATION }"
  >
    <div class="timer" :class="focusVisibleClass" v-if="enabled">
      <div class="top" :style="topStyle">
        <span class="time">{{ top }}</span>
        <span class="vert-dash"></span>
      </div>
      <div class="left">
        <span class="time">{{ left }}</span>
        <span class="horiz-dash"></span>
      </div>
      <div class="right">
        <span class="horiz-dash"></span>
        <span class="time">{{ right }}</span>
      </div>
      <div class="bottom">
        <span class="vert-dash"></span>
        <span class="time">{{ bottom }}</span>
      </div>
    </div>
  </Transition>
</template>

<style lang="scss" scoped>
@use "@/game-ui.scss" as g;

$offset: g.$field-size-ui + g.$border-width + g.$border-width + 8px;
$offset-focus-visible: $offset + g.$focus-ring-width + g.$focus-ring-offset;

$stagger: 40ms;

.timer {
  display: none;
}

.top,
.left,
.right,
.bottom {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 8px;

  $dur: g.$raise-duration;
  transition-property: top, bottom, left, right, opacity;
  transition-duration: $dur, $dur, $dur, $dur, 120ms;
  transition-timing-function: linear;

  :is(.appear-enter-from, .appear-leave-to) & {
    opacity: 0;
  }
}

.top,
.bottom {
  flex-direction: column;
  width: 100%;
}

.left,
.right {
  flex-direction: row;
  height: 100%;
}

.top {
  bottom: $offset;
  .focus-visible & {
    bottom: $offset-focus-visible;
  }
}

.left {
  right: $offset;
  .appear-enter-active & {
    transition-delay: 0ms, 0ms, 0ms, 0ms, #{$stagger};
  }
  .focus-visible & {
    right: $offset-focus-visible;
  }
}

.right {
  left: $offset;
  .appear-enter-active & {
    transition-delay: 0ms, 0ms, 0ms, 0ms, #{3 * $stagger};
  }
  .focus-visible & {
    left: $offset-focus-visible;
  }
}

.bottom {
  top: $offset;
  .appear-enter-active & {
    transition-delay: 0ms, 0ms, 0ms, 0ms, #{2 * $stagger};
  }
  .focus-visible & {
    top: $offset-focus-visible;
  }
}

.vert-dash {
  display: inline-block;
  width: 2px;
  height: 8px;
  background: var(--c-text-tertiary);
}

.horiz-dash {
  display: inline-block;
  width: 8px;
  height: 2px;
  background-color: var(--c-text-tertiary);
}

$width-00: 20px; // Maximum expected width of a number
$min-width: g.$field-size-ui + 2 * (g.$border-width + 48px + $width-00);
@media (min-width: $min-width) {
  .timer {
    display: block;
  }
}
</style>
