<!-- Based on https://css-tricks.com/building-progress-ring-quickly/ -->

<script lang="ts" setup>
import { TAU } from "@/math";
import { userStore } from "@/user-store";
import { computed, nextTick, ref, watch, type Ref } from "vue";

const props = defineProps<{
  size: number;
  width: number;
  start: number;
  end: number;
}>();

const circleRef: Ref<SVGCircleElement | null> = ref(null);
const sizeHalf = computed(() => props.size / 2);
const radius = computed(() => sizeHalf.value - props.width / 2);
const circumference = computed(() => TAU * radius.value);

let animation: Animation | null = null;

function startAnimation(el: SVGCircleElement) {
  if (animation) {
    animation.cancel();
  }

  const { start, end } = props;
  const now = Date.now();
  const duration = end - start;
  const remainingDuration = end - now;
  if (duration <= 0 || remainingDuration <= 0) {
    el.style.strokeDashoffset = circumference.value + "px";
    return;
  }

  el.style.strokeDashoffset = "";

  const elapsed = (now - start) / duration;
  const offset = circumference.value * elapsed;

  const keyframes = [
    { offset: 0, strokeDashoffset: offset + "px" },
    { offset: 1, strokeDashoffset: circumference.value + "px" },
  ];
  animation = el.animate(keyframes, {
    duration: remainingDuration,
    easing: "linear",
    fill: "both",
  });
}

watch(
  [circleRef, props],
  ([el]) => {
    if (el) {
      startAnimation(el);
    }
  },
  { immediate: true }
);
watch(userStore, () => {
  const el = circleRef.value;
  if (el) {
    nextTick(() => startAnimation(el));
  }
});
</script>

<template>
  <svg :width="size" :height="size">
    <circle
      fill="transparent"
      class="bar-background"
      :stroke-width="width"
      :r="sizeHalf - width / 2"
      :cx="sizeHalf"
      :cy="sizeHalf"
    />
    <circle
      fill="transparent"
      class="bar"
      :stroke-dasharray="circumference + ' ' + circumference"
      :stroke-width="width"
      :r="sizeHalf - width / 2"
      :cx="sizeHalf"
      :cy="sizeHalf"
      ref="circleRef"
    />
  </svg>
</template>

<style lang="scss" scoped>
.bar-background {
  stroke: var(--bar-background);
}

.bar {
  stroke: var(--bar);
  transform: rotate(-90deg);
  transform-origin: center;
}
</style>
