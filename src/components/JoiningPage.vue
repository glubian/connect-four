<script setup lang="ts">
import { store } from "@/store";
import { computed } from "vue";

const code = computed(() => {
  const { lobby } = store;
  return lobby && !lobby.isHost ? lobby.code : null;
});
</script>

<template>
  <div class="joining-page c0">
    <template v-if="typeof code === 'number'">
      <div class="top">
        <h1 class="lobby-state">{{ $t("joiningPage.connectedText") }}</h1>
      </div>
      <span class="player-code">{{ code }}</span>
      <div class="bottom">
        <button @click="store.disconnect()">
          {{ $t("joiningPage.cancelButton") }}
        </button>
      </div>
    </template>

    <template v-else>
      <div class="top"></div>
      <div class="connecting">
        <span class="player-code set-height" aria-hidden="true">0</span>
        <div class="wrapper">
          <h1 class="lobby-state">{{ $t("joiningPage.connectingText") }}</h1>
        </div>
      </div>
      <div class="bottom">
        <button @click="store.disconnect()">
          {{ $t("joiningPage.cancelButton") }}
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.joining-page {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  flex: 1;
  height: 100%;
}

.top,
.bottom {
  flex: 1;
}

.top {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.player-code {
  margin: 0;
}

.connecting {
  display: grid;
  position: relative;
  width: 100%;

  .wrapper {
    display: flex;
    align-items: center;
    justify-content: center;

    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  .lobby-state {
    margin: 0;
  }
}

.set-height {
  opacity: 0;
  user-select: none;
}

h1 {
  margin: 0 0 16px 0;
}

button {
  margin: 24px 0 0 0;
  background: var(--c0-button);
  color: var(--c0-button-text);
  border: var(--c0-button-border);
  box-shadow: var(--c0-button-drop-shadow);
}
</style>
