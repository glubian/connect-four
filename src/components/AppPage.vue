<script setup lang="ts">
import { Player } from "@/game";
import { gameUIStore } from "@/game-ui-store";
import {
  PanelLayout,
  PANEL_APPEAR_DURATION,
  PANEL_MAX_WIDTH,
  PANEL_MIN_TRANSLATE,
  PANEL_MIN_WIDTH,
} from "@/layout";
import { layoutStore } from "@/layout-store";
import { PlayerSelection, store } from "@/store";
import { computed, onUnmounted, ref, watch, type Ref } from "vue";
import AppDialog from "./AppDialog.vue";
import AppPageHeader from "./AppPageHeader.vue";
import AppPageMainInGame from "./AppPageMainInGame.vue";
import AppPageMainPlayerSelection from "./AppPageMainPlayerSelection.vue";

const props = defineProps<{ isPanelShown?: boolean }>();

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
  transform: props.isPanelShown ? slideTo() : SLIDE_FROM,
}));

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
      gameUIStore.playerSelection === PlayerSelection.Voting
    );
  },
  set(v: boolean) {
    if (!v) {
      store.dismissPlayerSelection();
    }
  },
});

// panel animation

const mainRef: Ref<HTMLDivElement | null> = ref(null);
const slideAnimationRef: Ref<Animation | null> = ref(null);
let isPanelShown = false;

watch(props, (p) => {
  if (isPanelShown === !!p.isPanelShown) {
    return;
  }

  slideAnimation();
  isPanelShown = !!p.isPanelShown;
});

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

  const baseOffset = !props.isPanelShown ? 1 : 0;
  const keyframes = [
    { offset: baseOffset, transform: SLIDE_FROM },
    { offset: 1 - baseOffset, transform: slideTo() },
  ];

  // keyframes must be in order
  if (!props.isPanelShown) {
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
  showHeaderAndFooter.value = !props.isPanelShown;
}
</script>

<template>
  <div class="app-page c0">
    <AppPageHeader v-show="showHeaderAndFooter" />

    <main :style="mainStyle" ref="mainRef">
      <Transition name="main">
        <AppPageMainPlayerSelection
          v-if="showPlayerSelectionScreen"
        ></AppPageMainPlayerSelection>
        <AppPageMainInGame
          :is-panel-shown="isPanelShown"
          v-else
        ></AppPageMainInGame>
      </Transition>
    </main>

    <footer class="small" v-show="showHeaderAndFooter">
      <a href="https://github.com/glubian/connect-four">{{
        $t("page.links.github")
      }}</a>
    </footer>

    <AppDialog
      :message="$t(`page.dialog.${store.disconnectedReason}.message`)"
      :dismissible="true"
      v-model:shown="disconnectedDialogShown"
    >
      <button class="flat" @click="disconnectedDialogShown = false">
        {{ $t(`page.dialog.${store.disconnectedReason}.closeButton`) }}
      </button>
    </AppDialog>

    <AppDialog
      :message="$t('page.dialog.playerSelection.message')"
      :dismissible="true"
      v-model:shown="showPlayerSelectionDialog"
    >
      <button class="flat" @click="store.selectStartingPlayer(Player.P1)">
        {{ $t("page.dialog.playerSelection.p1") }}
      </button>
      <button class="flat" @click="store.selectStartingPlayer(Player.P2)">
        {{ $t("page.dialog.playerSelection.p2") }}
      </button>
    </AppDialog>
  </div>
</template>

<style lang="scss" scoped>
@use "@/layout";

.app-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  flex: 1;
}

main {
  position: relative;
  width: 100%;
  height: 100%;
  overflow-y: hidden;
}

main > * {
  position: absolute;
  width: 100%;
  height: 100%;
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

footer {
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
</style>
