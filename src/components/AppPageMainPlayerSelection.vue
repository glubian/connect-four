<script lang="ts" setup>
import { gameUIStore } from "@/game-ui-store";
import { PlayerSelection, store } from "@/store";
import { computed } from "vue";
const showVotingScreen = computed(
  () => gameUIStore.playerSelection === PlayerSelection.Voting
);
</script>

<template>
  <div class="main-player-selection" v-if="showVotingScreen">
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
  <div class="main-player-selection" v-else>
    <h1 class="lobby-state">{{ $t("page.playerSelection.waiting") }}</h1>
  </div>
</template>

<style lang="scss" scoped>
.main-player-selection {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 16px;
}

h1 {
  margin: 0;
}

.actions {
  display: flex;
  gap: 16px;
}
</style>
