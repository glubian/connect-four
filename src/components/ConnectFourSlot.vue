<script lang="ts">
import { Player } from "@/game";
import { playerClass } from "@/game-ui";
import { ref, watch, type Ref } from "vue";

export interface SlotConfig {
  value: Player | null;
  duration: number;
  delay: number;
}

const SLOT_BORDER = "1px";
const CHIP_BORDER = "2px";
const SLOT_SIZE = "8px";
const CHIP_SIZE = "32px";

/**
 * Generates the keyframes for transitioning between an empty and
 * taken slot states.
 */
/* global Keyframe */
function genKeyframes(player: Player): Keyframe[] {
  const playerNumber = (player + 1).toString();
  const borderColor = `var(--c0-slot-p${playerNumber}-border-color)`;
  const backgroundColor = `var(--c0-slot-p${playerNumber}-background)`;
  const backgroundImage = `var(--c-p${playerNumber}-image)`;
  return [
    {
      offset: 0,
      width: SLOT_SIZE,
      height: SLOT_SIZE,
      borderWidth: SLOT_BORDER,
      borderColor: "var(--c0-slot-none-border-color)",
      backgroundColor: "var(--c0-slot-none-background)",
      backgroundImage: "none",
    },
    {
      offset: 0.2 - 0.000001,
      backgroundImage: "none",
    },
    {
      offset: 0.2,
      borderWidth: CHIP_BORDER,
      borderColor,
      backgroundColor,
      backgroundImage,
    },
    {
      offset: 1,
      width: CHIP_SIZE,
      height: CHIP_SIZE,
      borderWidth: CHIP_BORDER,
      borderColor,
      backgroundColor,
      backgroundImage,
    },
  ];
}

/** Keyframes for transitioning between empty and taken slot states. */
const SLOT_KEYFRAMES = [genKeyframes(Player.P1), genKeyframes(Player.P2)];
</script>

<script lang="ts" setup>
const props = defineProps<{
  config: {
    value: Player | null;
    duration: number;
    delay: number;
  };
}>();

const slotRef: Ref<HTMLElement | null> = ref(null);

let animation: Animation | null = null;
watch([slotRef, () => props.config], ([el, curr], [_, prev]) => {
  if (animation) {
    animation.finish();
    animation = null;
  }

  if (!el) {
    return;
  }

  const { value, duration, delay } = curr;
  if (prev.value !== null) {
    el.classList.remove(playerClass(prev.value));
  }

  if (value !== null) {
    el.classList.add(playerClass(value));
  }

  if (duration) {
    animation = el.animate(SLOT_KEYFRAMES[(value ?? prev.value) as Player], {
      easing: "linear",
      duration: duration,
      delay: delay,
      direction: value === null ? "reverse" : "normal",
      fill: "backwards",
    });
  }
});
</script>

<template>
  <div class="slot" ref="slotRef"></div>
</template>
