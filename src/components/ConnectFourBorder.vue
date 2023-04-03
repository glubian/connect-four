<script lang="ts" setup>
import { FIELD_SIZE_UI } from "@/game-ui";
import { TAU } from "@/math";
import { computed } from "vue";

const props = defineProps<{ start: number; end: number }>();

const STROKE_WIDTH = 2; // px
const RECT_SIZE = FIELD_SIZE_UI + STROKE_WIDTH;
const SIZE = RECT_SIZE + STROKE_WIDTH + 1;
const R = 24; //px
const RX = R + STROKE_WIDTH;
const CIRCUMFERENCE = 4 * (RECT_SIZE - R - R) + TAU * R;
const OFFSET = FIELD_SIZE_UI / 2 - R;

function genDashArray(start: number, end: number) {
  if (Math.abs(start - end) >= CIRCUMFERENCE) {
    return [CIRCUMFERENCE];
  }

  start = (start + OFFSET + CIRCUMFERENCE) % CIRCUMFERENCE;
  end = (end + OFFSET + CIRCUMFERENCE) % CIRCUMFERENCE;

  if (end < start) {
    // reverse direction
    return [end, start - end, CIRCUMFERENCE - start, 0];
  }

  return [0, start, end - start, CIRCUMFERENCE - end];
}

const dashArray = computed(() =>
  genDashArray(CIRCUMFERENCE * props.start, CIRCUMFERENCE * props.end).join(" ")
);
</script>

<template>
  <svg :width="SIZE" :height="SIZE">
    <rect
      fill="transparent"
      class="bg"
      :stroke-width="STROKE_WIDTH"
      :x="STROKE_WIDTH"
      :y="STROKE_WIDTH"
      :width="RECT_SIZE"
      :height="RECT_SIZE"
      :rx="RX"
    />
    <rect
      fill="transparent"
      class="bg-dots"
      :stroke-dasharray="STROKE_WIDTH + ' ' + 3 * STROKE_WIDTH"
      :stroke-dashoffset="STROKE_WIDTH + STROKE_WIDTH"
      :stroke-width="STROKE_WIDTH"
      :x="STROKE_WIDTH"
      :y="STROKE_WIDTH"
      :width="RECT_SIZE"
      :height="RECT_SIZE"
      :rx="RX"
    />
    <rect
      fill="transparent"
      class="bar"
      :stroke-width="STROKE_WIDTH"
      :stroke-dasharray="dashArray"
      :x="STROKE_WIDTH"
      :y="STROKE_WIDTH"
      :width="RECT_SIZE"
      :height="RECT_SIZE"
      :rx="RX"
    />
  </svg>
</template>

<style lang="scss" scoped>
$stroke-width: 3px;
svg {
  position: absolute;
  top: -$stroke-width;
  left: -$stroke-width;
}

.bg {
  stroke: var(--c-slot-none-background);
}

.bg-dots {
  stroke: var(--c-text-tertiary-solid);
}

.bar {
  stroke: var(--c-text-secondary-solid);
}
</style>
