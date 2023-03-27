<script setup lang="ts">
import { PopoverAppearance } from "@/layout";
import { layoutStore } from "@/layout-store";
import { store } from "@/store";
import { computed, ref, type Ref } from "vue";
import { useI18n } from "vue-i18n";
import AppDialog from "./AppDialog.vue";
import AppPopover from "./AppPopover.vue";
import AppSettings from "./AppSettings.vue";
import NewGame from "./NewGame.vue";

const gameRef = store.getGame();
const { t } = useI18n();

// change rules popover

const restartLabel = computed(() => {
  const { state } = gameRef.value;
  return !!state.turn && !state.result;
});

const changeRulesPopover = ref(false);
const CHANGE_RULES_TOP = 8; // px
const changeRulesRight = computed(() => {
  const el = changeRulesButtonRef.value;
  if (!el) {
    return 16; // px
  }
  const { right } = el.getBoundingClientRect();
  return layoutStore.innerWidth - right + 2;
});

function openChangeRulesPopover() {
  changeRulesPopover.value = true;
}

// create rules button

const changeRulesButtonRef: Ref<HTMLButtonElement | null> = ref(null);
const changeRulesButtonStyle = computed(() => ({
  opacity:
    changeRulesPopover.value &&
    layoutStore.popoverAppearance === PopoverAppearance.Desktop
      ? "0"
      : "",
}));
const changeRulesButtonLabel = computed(() => {
  return restartLabel.value
    ? t("page.restartButton")
    : t("page.changeRulesButton");
});

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
      <button
        class="icon align-left"
        :style="changeRulesButtonStyle"
        @click="openChangeRulesPopover"
      >
        <i class="mi-filter"></i>
      </button>

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

      <button
        :style="changeRulesButtonStyle"
        @click="openChangeRulesPopover"
        ref="changeRulesButtonRef"
      >
        {{ changeRulesButtonLabel }}
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
    >
      <NewGame
        :restart-label="restartLabel"
        @hide="changeRulesPopover = false"
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
