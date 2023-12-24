<script lang="ts" setup>
import { FIELD_SIZE_UI } from "@/game-ui";
import { TAU, PI_HALF } from "@/math";
import { computed } from "vue";

const props = defineProps<{ value: number; isActive?: boolean }>();

const ACTIVE_CLASS = "active";
const activeClass = computed(() => (props.isActive ? ACTIVE_CLASS : ""));

const STROKE_WIDTH = 2; // px
const RECT_SIZE = FIELD_SIZE_UI + STROKE_WIDTH;
const SIZE = RECT_SIZE + STROKE_WIDTH + 1;
const R = 24; //px
const RX = R + STROKE_WIDTH;
const CIRCUMFERENCE = 4 * (RECT_SIZE - R - R) + TAU * R;
const DOTS = genDots(STROKE_WIDTH, 3 * STROKE_WIDTH).join(" ");

function genDots(filled: number, gap: number): number[] {
  const segmentLength = filled + gap;

  const sideLength = RECT_SIZE - RX - RX;
  const sideSpace = (sideLength - filled) / 2;
  const sideSegments = Math.floor(sideSpace / segmentLength);
  const sideOffset = sideSpace - sideSegments * segmentLength;

  const cornerLength = RX * PI_HALF;
  const cornerFullLength = cornerLength + sideOffset * 2;
  const cornerSegments = Math.floor((cornerFullLength - gap) / segmentLength);
  const cornerEmptySpace = cornerFullLength - filled * cornerSegments;
  const cornerGap = cornerEmptySpace / (cornerSegments + 1);

  const res = [0, sideOffset, filled];
  let accum = sideOffset + filled;

  for (let i = 0; i < sideSegments * 2; i++) {
    res.push(gap, filled);
    accum += gap + filled;
  }

  for (let i = 0; i < cornerSegments; i++) {
    res.push(cornerGap, filled);
    accum += cornerGap + filled;
  }

  const error = sideLength + cornerLength - accum;
  res.push(cornerGap - sideOffset - error / 4);

  return res;
}

const barDashArray = computed(() => {
  const strokeLength = Math.max(CIRCUMFERENCE * props.value, 2);
  return [strokeLength, CIRCUMFERENCE - strokeLength].join(" ");
});
</script>

<template>
  <svg :width="SIZE" :height="SIZE" :class="activeClass">
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
      :stroke-dasharray="DOTS"
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
      :stroke-dasharray="barDashArray"
      :stroke-dashoffset="-(RECT_SIZE - RX - RX) / 2 + 1"
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
  stroke: transparent;
  .active & {
    stroke: var(--c-text-tertiary-solid);
  }
}

.bar {
  stroke: var(--c-text-secondary-solid);
  transition: stroke 120ms ease-in-out;
  .active & {
    stroke: var(--c-text-solid);
  }
}
</style>
