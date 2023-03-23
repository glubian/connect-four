<script setup lang="ts">
import { store } from "@/store";
import { computed, ref, type Ref } from "vue";
import AppDialog from "./AppDialog.vue";
import AppSettings from "./AppSettings.vue";

const settingsButtonRef: Ref<HTMLButtonElement | null> = ref(null);
const settingsShown = ref(false);
const settingsPosition = ref({
  "--popover-right": "16px",
  "--popover-top": "8px",
});

const createLobbyButton = computed(
  () => !store.isUntouched && store.remoteRole === null
);

const disconnectButton = computed(() => store.isConnected && !store.lobby);
const disconnectDialogShown = ref(false);

function openSettings() {
  const settingsButtonEl = settingsButtonRef.value;
  if (settingsButtonEl) {
    const { right } = settingsButtonEl.getBoundingClientRect();
    settingsPosition.value["--popover-right"] =
      window.innerWidth - right + 4 + "px";
  }

  settingsShown.value = true;
}

function disconnect() {
  disconnectDialogShown.value = false;
  store.disconnect();
}
</script>

<template>
  <header>
    <button class="icon" @click="openSettings" ref="settingsButtonRef">
      <i class="mi-settings"></i>
    </button>
    <AppSettings
      v-model:shown="settingsShown"
      :popover-position="settingsPosition"
      @hide="settingsShown = false"
    />

    <button @click="store.connect()" v-if="createLobbyButton">
      {{ $t("page.createLobbyButton") }}
    </button>

    <button @click="disconnectDialogShown = true" v-if="disconnectButton">
      {{ $t("page.disconnectButton") }}
    </button>
    <AppDialog
      :title="$t('page.dialog.disconnect.areYouSure')"
      v-model:shown="disconnectDialogShown"
    >
      <button class="flat" @click="disconnect()">
        {{ $t("page.dialog.disconnect.disconnectButton") }}
      </button>
      <button class="flat" @click="disconnectDialogShown = false">
        {{ $t("page.dialog.disconnect.closeButton") }}
      </button>
    </AppDialog>
  </header>
</template>

<style scoped lang="scss">
header {
  display: flex;
  align-items: center;
  justify-content: right;

  min-height: 56px;
  padding: 0 16px;
  gap: 8px;

  transition: opacity 180ms ease-in-out;
}

a {
  padding: 0 8px;
}
</style>
