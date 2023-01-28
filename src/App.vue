<script setup lang="ts">
import AppPage from "./components/AppPage.vue";
import JoiningPage from "./components/JoiningPage.vue";
import RemotePlaySetupPanel from "./components/RemotePlaySetupPanel.vue";
import AppPanel from "./components/AppPanel.vue";
import { store } from "@/store";
</script>

<template>
  <div class="app">
    <JoiningPage v-if="store.lobby && !store.lobby.isHost" />
    <template v-else>
      <AppPage :is-panel-shown="!!store.lobby" />
      <AppPanel :is-shown="!!store.lobby">
        <RemotePlaySetupPanel />
      </AppPanel>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.app {
  display: flex;
  width: 100%;
  height: 100%;
  z-index: 5;
  overflow-x: hidden;
}
</style>
