<script lang="ts" setup>
import { gameUIStore } from "@/game-ui-store";
import { PlayerSelection, store } from "@/store";
import { computed } from "vue";
import RequestStatus from "./RequestStatus.vue";
const emit = defineEmits<{ (ev: "showRequest"): void }>();
const showVotingScreen = computed(
  () => gameUIStore.playerSelection === PlayerSelection.Voting
);
</script>

<template>
  <div class="main-player-selection" v-if="showVotingScreen">
    <div class="top">
      <RequestStatus class="request-status" @click="$emit('showRequest')" />
    </div>
    <div class="middle">
      <h1 class="lobby-state">{{ $t("page.playerSelection.message") }}</h1>
      <div class="actions">
        <button @click="store.selectStartingPlayer(true)">
          {{ $t("page.playerSelection.me") }}
        </button>
        <button @click="store.selectStartingPlayer(false)">
          {{ $t("page.playerSelection.dunno") }}
        </button>
      </div>
    </div>
    <div class="bottom"></div>
  </div>
  <div class="main-player-selection" v-else>
    <div class="top">
      <RequestStatus class="request-status" @click="$emit('showRequest')" />
    </div>
    <div class="middle">
      <h1 class="lobby-state">{{ $t("page.playerSelection.waiting") }}</h1>
    </div>
    <div class="bottom"></div>
  </div>
</template>

<style lang="scss" scoped>
@use "sass:math";
@use "@/layout";
@use "@/game-ui.scss" as g;

.main-player-selection {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 16px;
}

.top,
.middle,
.bottom {
  display: flex;
  align-items: center;
  justify-content: center;
}

.middle {
  height: g.$field-size-ui - 32px + g.$border-width * 2;
  gap: 16px;
  flex-direction: column;
}

.top,
.bottom {
  flex: 1;
}

.top {
  align-items: flex-end;
}

h1 {
  margin: 0;
}

.actions {
  display: flex;
  gap: 16px;
}

@media (min-width: layout.$restart-popover-desktop) {
  .request-status {
    display: none;
  }
}
</style>
