<script lang="ts" setup>
import { userStore } from "@/user-store";
import { nextTick, ref, watch, type Ref } from "vue";

// Use `--bar` and `--bar-background` properties to set color.
const props = defineProps<{ start: number; end: number }>();

const barRef: Ref<HTMLDivElement | null> = ref(null);

let animation: Animation | null = null;

function startAnimation(el: HTMLDivElement) {
  if (animation) {
    animation.cancel();
  }

  const { start, end } = props;
  const now = Date.now();
  const duration = end - start;
  const remainingDuration = end - now;
  if (duration <= 0 || remainingDuration <= 0) {
    el.style.backgroundSize = "0% 100%";
    return;
  }

  el.style.backgroundSize = "";

  const percentageRemaining = (remainingDuration / duration) * 100;
  const keyframes = [
    { offset: 0, backgroundSize: percentageRemaining + "% 100%" },
    { offset: 1, backgroundSize: "0% 100%" },
  ];
  animation = el.animate(keyframes, {
    duration: remainingDuration,
    easing: "linear",
    fill: "both",
  });
}

watch(
  props,
  () => {
    const el = barRef.value;
    if (el) {
      startAnimation(el);
    }
  },
  { immediate: true }
);
watch(barRef, (el) => {
  if (el) {
    startAnimation(el);
  }
});
watch(userStore, () => {
  const el = barRef.value;
  if (el) {
    nextTick(() => startAnimation(el));
  }
});
</script>

<template>
  <div class="bar" ref="barRef"></div>
</template>

<style lang="scss" scoped>
.bar {
  background-color: var(--bar-background);
  background-image: linear-gradient(90deg, var(--bar), var(--bar));
  background-position-x: 0;
  background-size: 100% 100%;
  background-repeat: no-repeat;
}
</style>
