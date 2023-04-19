<script setup lang="ts">
import { useTimerAnimation } from "@/composables/timer-animation";
import { FIELD_SIZE, Player, type GameField } from "@/game";
import { playerClass, type PlayerClass } from "@/game-ui";
import { gameUIStore } from "@/game-ui-store";
import { randomRange } from "@/math";
import { PlayerSelection, store } from "@/store";
import { computed, ref, shallowRef, triggerRef, watch } from "vue";
import ConnectFourBorder from "./ConnectFourBorder.vue";
import ConnectFourInput from "./ConnectFourInput.vue";
import ConnectFourResult from "./ConnectFourResult.vue";
import ConnectFourTimer from "./ConnectFourTimer.vue";

const UPDATE_DURATION = 96; // ms
const DELAY_MIN = 0; // ms
const DELAY_MAX = 140; // ms
const CLEAR_DURATION_MIN = 160; // ms
const CLEAR_DURATION_MAX = 360; // ms

interface Slot {
  value: Player | null;
  playerClass: PlayerClass | "";
  style: { transitionDuration?: string; transitionDelay?: string };
}

const rootClassListRef = ref({ animate: false });
const showFocusRing = ref(false);
const slotsRef = shallowRef(createSlotArray(gameUIStore.field));
const timerAnimation = useTimerAnimation();
const hintShown = ref(false);
let displayedRound = 0;

const focusRingStyle = computed(() =>
  showFocusRing.value ? {} : { display: "none" }
);

function slotFromValue(value: Player | null): Slot {
  return {
    value,
    playerClass: playerClass(value),
    style: {},
  };
}

function createSlotArray(field: GameField): Slot[][] {
  return Array.from(field, (col) => Array.from(col, (v) => slotFromValue(v)));
}

function syncSlots() {
  const slots = slotsRef.value;
  const { field, playerMove } = gameUIStore;

  let px = -1;
  let py = -1;
  if (playerMove) {
    [px, py] = playerMove;
  }

  for (let x = 0; x < FIELD_SIZE; x++) {
    for (let y = 0; y < FIELD_SIZE; y++) {
      if (slots[x][y].value === field[x][y]) {
        continue;
      }

      const s = slotFromValue(field[x][y]);
      if (!(px === x && py === y)) {
        s.style.transitionDuration = UPDATE_DURATION + "ms";
      }

      slots[x][y] = s;
    }
  }

  triggerRef(slotsRef);
}

function randomDurations() {
  const slots = slotsRef.value;

  for (let x = 0; x < FIELD_SIZE; x++) {
    for (let y = 0; y < FIELD_SIZE; y++) {
      const del = randomRange(DELAY_MIN, DELAY_MAX);
      const dur = randomRange(CLEAR_DURATION_MIN, CLEAR_DURATION_MAX);
      slots[x][y].style = {
        transitionDuration: Math.floor(dur) + "ms",
        transitionDelay: Math.floor(del) + "ms",
      };
    }
  }

  triggerRef(slotsRef);
}

const isDisabled = computed(
  () =>
    gameUIStore.lockField ||
    !!gameUIStore.state.result ||
    gameUIStore.playerSelection !== PlayerSelection.Hidden ||
    (store.isConnected && gameUIStore.state.player !== store.remoteRole)
);

const gameMatches = computed(() => {
  const { result } = gameUIStore.state;
  return result ? result.matches : [];
});

watch(gameUIStore, () => {
  syncSlots();
  if (displayedRound !== gameUIStore.round) {
    randomDurations();
    displayedRound = gameUIStore.round;
  }
});
</script>

<template>
  <div class="connect-four" :class="rootClassListRef">
    <ConnectFourBorder
      :start="timerAnimation.start"
      :end="timerAnimation.end"
      :is-active="timerAnimation.isOngoing"
    />
    <ConnectFourTimer
      :disabled="isDisabled"
      :hint-shown="hintShown"
      :focus-visible="showFocusRing"
    />
    <ConnectFourInput
      :disabled="isDisabled"
      @update:hint-shown="(v) => (hintShown = v)"
      @update-focus-visible="(v) => (showFocusRing = v)"
    />
    <ConnectFourResult :matches="gameMatches" />
    <div class="focus-ring" :style="focusRingStyle"></div>
    <div v-for="(col, x) in slotsRef" :key="x" class="col">
      <div v-for="(slot, y) in col" :key="y" class="slot-container">
        <div class="slot" :class="slot.playerClass" :style="slot.style"></div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/game-ui" as g;

.connect-four {
  position: relative;
  box-sizing: border-box;
  display: flex;
  user-select: none;
}

.focus-ring {
  $position: g.$focus-ring-offset + g.$border-width + g.$focus-ring-width;
  $offset: calc(100% + #{2 * $position});
  position: absolute;
  top: -$position;
  left: -$position;
  box-sizing: border-box;
  width: $offset;
  height: $offset;
  border: g.$focus-ring-width solid var(--c-focus-visible-border-color);
  border-radius: 28px + g.$focus-ring-offset;
  z-index: -1;
}
</style>

<style lang="scss">
.slot-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 48px;
  height: 48px;
}

.slot {
  box-sizing: border-box;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: var(--c0-slot-none-border);
  background-color: var(--c0-slot-none-background);
  background-image: url("data:image/svg+xml,<svg width='48' height='48' viewBox='0 0 48 48' fill='none' xmlns='http://www.w3.org/2000/svg'></svg>");
  background-position: center;
}

.slot.p1 {
  width: 32px;
  height: 32px;
  border: var(--c0-slot-p1-border);
  background-color: var(--c0-slot-p1-background);
  background-image: var(--c-p1-image);
}

.slot.p2 {
  width: 32px;
  height: 32px;
  border: var(--c0-slot-p2-border);
  background-color: var(--c0-slot-p2-background);
  background-image: var(--c-p2-image);
}

.slot {
  transition-property: border-color, width, height, background-image;
}
</style>
