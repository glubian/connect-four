<script lang="ts" setup>
import { playerClass } from "@/game-ui";
import { gameUIStore } from "@/game-ui-store";
import { store } from "@/store";
import { computed, watch } from "vue";

const props = defineProps<{
  chipVisible: boolean;
  hintVisible: boolean;
  hasMoved: boolean;
}>();

const emit = defineEmits<{ (ev: "update:shown", isShown: boolean): void }>();

enum Display {
  YourMove,
  MoveToStart,
  MoveToStartTimed,
  MoveToResume,
  OpponentMoving,
  OpponentStarts,
}

const display = computed(() => {
  const { lobby, isConnected, remoteRole, timeCap, turnTimeout } = store;
  const { turn, player, result } = gameUIStore.state;
  if (result || lobby) {
    return null;
  }

  const { hasMoved, hintVisible } = props;
  if (isConnected && player !== remoteRole && hasMoved) {
    return turn === 0 ? Display.OpponentStarts : Display.OpponentMoving;
  }

  if (hintVisible) {
    if (turn === 0) {
      return timeCap > 0 ? Display.MoveToStartTimed : Display.MoveToStart;
    }
    if (isConnected && timeCap > 0 && turnTimeout === null) {
      return Display.MoveToResume;
    }
    return Display.YourMove;
  }

  return null;
});

const activeClass = computed(() => playerClass(gameUIStore.state.player));

watch(display, (d) => emit("update:shown", d !== null));
</script>

<template>
  <div class="input-hint">
    <Transition mode="out-in">
      <span
        class="shift emphasis"
        :class="activeClass"
        v-if="display === Display.YourMove"
      >
        {{ $t("page.hint.yourMove") }}
      </span>
      <span
        class="shift emphasis"
        :class="activeClass"
        v-else-if="display === Display.MoveToStart"
      >
        {{ $t("page.hint.moveToStart") }}
      </span>
      <span
        class="shift emphasis"
        :class="activeClass"
        v-else-if="display === Display.MoveToStartTimed"
      >
        {{ $t("page.hint.moveToStartTimed") }}
      </span>
      <span
        class="shift emphasis"
        :class="activeClass"
        v-else-if="display === Display.MoveToResume"
      >
        {{ $t("page.hint.moveToResume") }}
      </span>
      <span class="inactive" v-else-if="display === Display.OpponentMoving">
        {{ $t("page.hint.opponentMoving") }}
      </span>
      <span class="inactive" v-else-if="display === Display.OpponentStarts">
        {{ $t("page.hint.opponentStarts") }}
      </span>
    </Transition>
  </div>
</template>

<style lang="scss" scoped>
@use "@/game-ui.scss";

.input-hint {
  display: flex;
  align-items: center;
  justify-content: center;

  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;

  pointer-events: none;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}

.v-enter-active {
  transition: opacity 120ms ease-out;
}

.v-leave-active {
  transition: opacity #{game-ui.$mode-transition-min} ease-in;
}

.shift {
  margin-right: auto;
  padding-left: game-ui.$cont-size + 8px;
}

.p1 {
  color: var(--c-p1);
}

.p2 {
  color: var(--c-p2);
}

.inactive {
  color: var(--c-text-tertiary);
}
</style>
