<script lang="ts" setup>
import { playerClass } from "@/game-ui";
import { gameUIStore } from "@/game-ui-store";
import { store } from "@/store";
import { computed } from "vue";

const props = defineProps<{
  chipVisible: boolean;
  hintVisible: boolean;
  hasMoved: boolean;
}>();

enum Display {
  YourMove,
  YouStart,
  OpponentMoving,
  OpponentStarts,
}

const display = computed(() => {
  const { lobby, isConnected, remoteRole } = store;
  const { turn, player, result } = gameUIStore.state;
  if (result || lobby) {
    return null;
  }

  const { hasMoved, hintVisible } = props;
  if (isConnected && player !== remoteRole && hasMoved) {
    return turn === 0 ? Display.OpponentStarts : Display.OpponentMoving;
  }

  if (hintVisible) {
    return turn === 0 ? Display.YouStart : Display.YourMove;
  }

  return null;
});

const activeClass = computed(() => playerClass(gameUIStore.state.player));
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
        v-else-if="display === Display.YouStart"
      >
        {{ $t("page.hint.youStart") }}
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

$duration: 120ms;
.v-enter-active {
  transition: opacity $duration ease-out;
}

.v-leave-active {
  transition: opacity $duration ease-in;
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
