<script setup lang="ts">
import { Player } from "@/game";
import { store } from "@/store";
const props = defineProps<{ code: number }>();
</script>

<template>
  <div class="player-card">
    <span class="card-player-code">{{ code }}</span>
    <div class="actions">
      <button class="p1" @click="store.acceptPlayer(props.code, Player.P1)">
        {{ $t("page.remotePlaySetup.joinAsP1") }}
      </button>
      <button class="p2" @click="store.acceptPlayer(props.code, Player.P2)">
        {{ $t("page.remotePlaySetup.joinAsP2") }}
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.player-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px 0 12px;
  height: 56px;
}

span {
  margin-top: 1px;
}

.actions {
  display: flex;
  gap: 8px;
}
</style>
