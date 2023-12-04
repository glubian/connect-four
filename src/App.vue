<script setup lang="ts">
import { FocusTrap } from "focus-trap-vue";
import { computed, onUnmounted, ref, watch, type Ref } from "vue";
import AppDialog from "./components/AppDialog.vue";
import AppHeader from "./components/AppHeader.vue";
import AppPanel from "./components/AppPanel.vue";
import MainInGame from "./components/MainInGame.vue";
import MainJoining from "./components/MainJoining.vue";
import MainPlayerSelection from "./components/MainPlayerSelection.vue";
import RemotePlaySetupPanel from "./components/RemotePlaySetupPanel.vue";
import RequestPopover from "./components/RequestPopover.vue";
import RequestStatus from "./components/RequestStatus.vue";
import { Player } from "./game";
import { gameUIStore } from "./game-ui-store";
import {
  PANEL_APPEAR_DURATION,
  PANEL_MAX_WIDTH,
  PANEL_MIN_TRANSLATE,
  PANEL_MIN_WIDTH,
  PanelLayout,
} from "./layout";
import { layoutStore } from "./layout-store";
import { PlayerSelection, store } from "./store";

const headerStyle = computed(() => {
  const { lobby } = store;
  return lobby && lobby.isHost ? "pointer-events: none" : "";
});

const disconnectedDialogShown = computed({
  get() {
    return !!store.disconnectedReason && !store.disconnectedByUser;
  },
  set(v: boolean) {
    if (!v) {
      store.dismissDisconnectReason();
    }
  },
});

const showPlayerSelectionScreen = computed(
  () =>
    store.isConnected &&
    !store.lobby &&
    gameUIStore.playerSelection !== PlayerSelection.Hidden
);

const showPlayerSelectionDialog = computed({
  get() {
    return (
      !store.isConnected &&
      !disconnectedDialogShown.value &&
      store.playerSelection === PlayerSelection.Voting
    );
  },
  set(v: boolean) {
    if (!v) {
      store.dismissPlayerSelection();
    }
  },
});

const reqShown = ref(false);

// panel animation

const SLIDE_FROM = "translate(0, 0)";
//prettier-ignore
const SLIDE_TO =
  "translate(max(" + 
    "min(" + 
      "calc(50vh - 50vw)," +
      `${-PANEL_MIN_WIDTH / 2}px` + 
    ")," + 
    `${-PANEL_MAX_WIDTH / 2}px,` +
    `calc(-50vw + ${PANEL_MIN_TRANSLATE}px)` +
  "), 0)";
const SLIDE_TO_MOBILE = "translate(0, -64px)";

const showHeaderAndFooter = ref(true);

const mainStyle = computed(() => ({
  transform: layoutStore.isPanelShown ? slideTo() : SLIDE_FROM,
}));

const mainRef: Ref<HTMLDivElement | null> = ref(null);
const slideAnimationRef: Ref<Animation | null> = ref(null);

watch(() => layoutStore.isPanelShown, slideAnimation);

onUnmounted(() => {
  const slide = slideAnimationRef.value;
  if (slide) {
    slide.finish();
  }

  slideAnimationRef.value = null;
});

function slideTo(): string {
  return layoutStore.panelLayout === PanelLayout.Mobile
    ? SLIDE_TO_MOBILE
    : SLIDE_TO;
}

function slideAnimation() {
  const oldAnimation = slideAnimationRef.value;
  if (oldAnimation) {
    oldAnimation.finish();
  }

  slideAnimationRef.value = null;

  const mainEl = mainRef.value;
  if (!mainEl) {
    return;
  }

  const baseOffset = !layoutStore.isPanelShown ? 1 : 0;
  const keyframes = [
    { offset: baseOffset, transform: SLIDE_FROM },
    { offset: 1 - baseOffset, transform: slideTo() },
  ];

  // keyframes must be in order
  if (!layoutStore.isPanelShown) {
    keyframes.reverse();
  }

  const newAnimation = mainEl.animate(keyframes, {
    duration: PANEL_APPEAR_DURATION,
    easing: "ease-in-out",
  });

  newAnimation.addEventListener("cancel", onSlideAnimationEvent);
  newAnimation.addEventListener("finish", onSlideAnimationEvent);
  newAnimation.addEventListener("remove", onSlideAnimationEvent);
  showHeaderAndFooter.value = true;
  slideAnimationRef.value = newAnimation;
}

function onSlideAnimationEvent() {
  showHeaderAndFooter.value = !layoutStore.isPanelShown;
}
</script>

<template>
  <AppHeader :style="headerStyle" v-show="showHeaderAndFooter" />

  <RequestPopover v-model:shown="reqShown" :zIndex="90" />
  <RequestStatus class="request-status" v-if="!reqShown" />

  <main :style="mainStyle" ref="mainRef">
    <Transition name="main">
      <MainJoining v-if="store.lobby && !store.lobby.isHost" />
      <MainPlayerSelection
        @show-request="reqShown = true"
        v-else-if="showPlayerSelectionScreen"
      />
      <FocusTrap :active="!!store.lobby && !store.isConnected" v-else>
        <MainInGame @show-request="reqShown = true" />
      </FocusTrap>
    </Transition>
  </main>

  <footer class="small" :style="headerStyle" v-show="showHeaderAndFooter">
    <a href="https://github.com/glubian/connect-four" target="_blank">{{
      $t("page.links.github")
    }}</a>
  </footer>

  <AppPanel :is-shown="layoutStore.isPanelShown">
    <RemotePlaySetupPanel />
  </AppPanel>

  <AppDialog
    :title="$t(`page.dialog.${store.disconnectedReason}.title`)"
    :description="$t(`page.dialog.${store.disconnectedReason}.description`)"
    dismissible
    v-model:shown="disconnectedDialogShown"
  >
    <button class="flat" @click="disconnectedDialogShown = false">
      {{ $t(`page.dialog.${store.disconnectedReason}.closeButton`) }}
    </button>
  </AppDialog>

  <AppDialog
    :title="$t('page.dialog.playerSelection.title')"
    dismissible
    v-model:shown="showPlayerSelectionDialog"
  >
    <button class="flat" @click="store.selectStartingPlayer(Player.P1)">
      {{ $t("page.dialog.playerSelection.p1") }}
    </button>
    <button class="flat" @click="store.selectStartingPlayer(Player.P2)">
      {{ $t("page.dialog.playerSelection.p2") }}
    </button>
  </AppDialog>
</template>

<style lang="scss" scoped>
@use "@/layout";

.request-status {
  display: none;
  position: absolute;
  top: 64px;
  right: 16px;
}

@media (min-width: layout.$restart-popover-desktop) {
  .request-status {
    display: flex;
  }
}

header {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 8;
}

main {
  display: flex;
  position: relative;
  width: 100%;
  flex: 1;
  z-index: 5;
  overflow: hidden;
}

main > * {
  position: absolute;
  width: 100%;
  height: 100%;
}

footer {
  position: absolute;
  bottom: 0;
  right: 0;
  z-index: 8;

  display: flex;
  align-items: center;
  justify-content: right;

  min-height: 56px;
  padding: 0 16px;
  gap: 8px;

  & > * {
    margin: 0 8px;
  }

  transition: opacity 180ms ease-in-out;
}

.main-enter-active,
.main-leave-active {
  transform: translateY(0);
  transition-property: opacity;
  transition-duration: 200ms;
  transition-timing-function: ease-in-out;
}

.main-enter-from,
.main-leave-to {
  opacity: 0;
}
</style>
