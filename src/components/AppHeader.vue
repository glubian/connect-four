<script setup lang="ts">
import { PopoverAppearance } from "@/layout";
import { layoutStore } from "@/layout-store";
import { PlayerSelection, ServiceStatus, store } from "@/store";
import { computed, ref, watch, type Ref } from "vue";
import AppDialog from "./AppDialog.vue";
import AppPopover from "./AppPopover.vue";
import AppSettings from "./AppSettings.vue";
import ChangeRules from "./ChangeRules.vue";
import type { GameConfig } from "@/ws";

const gameRef = store.getGame();

const joiningPage = computed(() => {
  const { lobby } = store;
  return lobby && !lobby.isHost;
});

// change rules button

const changeRulesButtonRef: Ref<HTMLButtonElement | null> = ref(null);
const changeRulesButtonStyle = computed(() => {
  const isPopoverVisible = changeRulesPopover.value;
  const { popoverAppearance } = layoutStore;
  const { Desktop } = PopoverAppearance;
  const opacity = isPopoverVisible && popoverAppearance === Desktop ? "0" : "";
  return { opacity };
});

// change rules popover

const restartLabel = computed(() => {
  const { state } = gameRef.value;
  return !!state.turn && !state.result;
});

const changeRulesPopover = ref(false);
const CHANGE_RULES_TOP = 8; // px
const changeRulesRight = ref(getChangeRulesRight());
let newConfig: GameConfig | null = null;

function getChangeRulesRight(): number {
  const el = changeRulesButtonRef.value;
  if (!el) {
    return 16; // px
  }
  const { right } = el.getBoundingClientRect();
  return layoutStore.innerWidth - right + 2;
}

function openChangeRulesPopover() {
  changeRulesRight.value = getChangeRulesRight();
  changeRulesPopover.value = true;
}

function hideChangeRulesPopover(config: GameConfig | null) {
  newConfig = config;
  changeRulesPopover.value = false;
}

function changeRulesAfterLeave() {
  if (newConfig) {
    store.restartGame(newConfig);
    newConfig = null;
  }
}

// restart button

const showRestartButton = computed(() => {
  const { lobby, playerSelection } = store;
  const { turn, result } = gameRef.value.state;
  const { Hidden } = PlayerSelection;
  return !result && turn && (!lobby || playerSelection === Hidden);
});

// settings

const settingsButtonRef: Ref<HTMLButtonElement | null> = ref(null);
const settingsShown = ref(false);
const SETTINGS_TOP = 8; // px
const settingsRight = ref(getSettingsRight());

function getSettingsRight(): number {
  const el = settingsButtonRef.value;
  if (!el) {
    return 16; // px
  }
  const { right } = el.getBoundingClientRect();
  return window.innerWidth - right + 9;
}

function openSettings() {
  settingsRight.value = getSettingsRight();
  settingsShown.value = true;
}

// create lobby button

const createLobbyButton = computed(() => {
  const { remotePlayStatus, isUntouched, remoteRole } = store;
  return (
    remotePlayStatus === ServiceStatus.Available &&
    !isUntouched &&
    remoteRole === null &&
    !joiningPage.value
  );
});

// disconnect buttons

const disconnectButton = computed(() => store.isConnected && !store.lobby);
const disconnectDialogShown = ref(false);

function disconnect() {
  disconnectDialogShown.value = false;
  store.disconnect();
}

// update popover positions

watch(
  () => layoutStore.innerWidth,
  () => {
    if (changeRulesPopover.value) {
      changeRulesRight.value = getChangeRulesRight();
    }
    if (settingsShown.value) {
      settingsRight.value = getSettingsRight();
    }
  }
);
</script>

<template>
  <header>
    <div class="mobile">
      <!-- 
        References are not necessary, since popovers do not depend on 
        the position of the button on mobile. 
      -->
      <button
        class="icon"
        :style="changeRulesButtonStyle"
        @click="openChangeRulesPopover"
        v-if="!joiningPage"
      >
        <i class="mi-filter"></i>
      </button>

      <button
        class="icon"
        @click="store.restartGame()"
        v-if="showRestartButton"
      >
        <i class="mi-refresh"></i>
      </button>

      <div class="space"></div>

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
      <!-- The references are needed to position popovers properly. -->
      <button class="icon" @click="openSettings" ref="settingsButtonRef">
        <i class="mi-settings"></i>
      </button>

      <button @click="store.restartGame()" v-if="showRestartButton">
        {{ $t("page.restartButton") }}
      </button>

      <button
        :style="changeRulesButtonStyle"
        @click="openChangeRulesPopover"
        ref="changeRulesButtonRef"
        v-if="!joiningPage"
      >
        {{ $t("page.changeRulesButton") }}
      </button>

      <button @click="store.connect()" v-if="createLobbyButton">
        {{ $t("page.createLobbyButton") }}
      </button>

      <button @click="disconnectDialogShown = true" v-if="disconnectButton">
        {{ $t("page.disconnectButton") }}
      </button>
    </div>

    <AppPopover
      :top="SETTINGS_TOP"
      :right="settingsRight"
      v-model:shown="settingsShown"
    >
      <AppSettings @hide="settingsShown = false" />
    </AppPopover>

    <AppPopover
      :top="CHANGE_RULES_TOP"
      :right="changeRulesRight"
      v-model:shown="changeRulesPopover"
      @after-leave="changeRulesAfterLeave"
    >
      <ChangeRules
        :restart-label="restartLabel"
        @hide="hideChangeRulesPopover"
      />
    </AppPopover>

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

.space {
  flex: 1;
}

@media (min-width: layout.$popover-appearance-desktop) {
  .desktop {
    display: flex;
  }

  .mobile {
    display: none;
  }
}

a {
  padding: 0 8px;
}
</style>
