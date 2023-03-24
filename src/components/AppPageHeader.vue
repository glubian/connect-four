<script setup lang="ts">
import { store } from "@/store";
import { computed, ref, type Ref } from "vue";
import AppDialog from "./AppDialog.vue";
import AppSettings from "./AppSettings.vue";

// settings

const settingsButtonRef: Ref<HTMLButtonElement | null> = ref(null);
const settingsShown = ref(false);
const SETTINGS_TOP = 8; // px
const settingsRight = computed(() => {
  const el = settingsButtonRef.value;
  if (!el) {
    return 16; // px
  }
  const { right } = el.getBoundingClientRect();
  return window.innerWidth - right + 4;
});

function openSettings() {
  settingsShown.value = true;
}

// create lobby button

const createLobbyButton = computed(
  () => !store.isUntouched && store.remoteRole === null
);

// disconnect buttons

const disconnectButton = computed(() => store.isConnected && !store.lobby);
const disconnectDialogShown = ref(false);

function disconnect() {
  disconnectDialogShown.value = false;
  store.disconnect();
}
</script>

<template>
  <header>
    <div class="mobile">
      <!-- 
        References are not necessary, since popovers do not depend on 
        the position of the button on mobile.
      -->
      <button class="icon" @click="openSettings">
        <i class="mi-settings"></i>
      </button>

      <button class="icon" @click="store.connect()" v-if="createLobbyButton">
        <i class="mi-log-in"></i>
      </button>

      <button
        class="icon"
        @click="disconnectDialogShown = true"
        v-if="disconnectButton"
      >
        <i class="mi-log-out"></i>
      </button>
    </div>
    <div class="desktop">
      <!-- The reference is here to position the popover. -->
      <button class="icon" @click="openSettings" ref="settingsButtonRef">
        <i class="mi-settings"></i>
      </button>
      <button @click="store.connect()" v-if="createLobbyButton">
        {{ $t("page.createLobbyButton") }}
      </button>

      <button @click="disconnectDialogShown = true" v-if="disconnectButton">
        {{ $t("page.disconnectButton") }}
      </button>
    </div>

    <AppSettings
      :top="SETTINGS_TOP"
      :right="settingsRight"
      v-model:shown="settingsShown"
      @hide="settingsShown = false"
    />

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
@use "@/layout.scss";

.desktop,
.mobile {
  align-items: center;
  justify-content: right;

  min-height: 56px;
  gap: 8px;

  transition: opacity 180ms ease-in-out;
}

.mobile {
  display: flex;
  padding: 0 8px;
}

.desktop {
  display: none;
  padding: 0 16px;
}

@media (min-width: layout.$popover-appearance-desktop) {
  .desktop {
    display: flex;
  }

  .mobile {
    display: none;
  }
}

.align-left {
  margin-right: auto;
}

a {
  padding: 0 8px;
}
</style>
