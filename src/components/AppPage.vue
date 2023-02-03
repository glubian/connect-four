<script setup lang="ts">
import { GameWinner, Player } from "@/game";
import { gameUIStore } from "@/game-ui-store";
import { store } from "@/store";
import {
  PanelLayout,
  PANEL_APPEAR_DURATION,
  PANEL_MAX_WIDTH,
  PANEL_MIN_TRANSLATE,
  PANEL_MIN_WIDTH,
} from "@/layout";
import { layoutStore } from "@/layout-store";
import { computed, onUnmounted, ref, watch, type Ref } from "vue";
import { useI18n } from "vue-i18n";
import AppDialog from "./AppDialog.vue";
import AppPageHeader from "./AppPageHeader.vue";
import ConnectFour from "./ConnectFour.vue";

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

const { t } = useI18n();

const showHeaderAndFooter = ref(true);

const showPausedControls = computed(
  () => layoutStore.panelLayout === PanelLayout.Desktop
);

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

const statusMessage = computed(() => {
  const { result } = gameUIStore.state;
  if (props.isPanelShown) {
    return t("page.statusIndicator.paused");
  }

  if (result) {
    const { winner } = result;
    if (store.isConnected && winner !== GameWinner.Draw) {
      if ((winner as unknown as Player) === store.remoteRole) {
        return t("page.statusIndicator.victory");
      } else {
        return t("page.statusIndicator.defeat");
      }
    }

    switch (winner) {
      case GameWinner.P1:
        return t("page.statusIndicator.p1Won");
      case GameWinner.P2:
        return t("page.statusIndicator.p2Won");
      case GameWinner.Draw:
        return t("page.statusIndicator.draw");
    }
  }

  return "";
});

const statusMessageSlideUp = computed(() =>
  !props.isPanelShown && gameUIStore.state.result ? "slide-up" : ""
);

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
      <div class="top">
        <Transition>
          <h1
            v-if="statusMessage && (!store.lobby || showPausedControls)"
            class="game-state large"
            :class="[layoutStore.panelLayout, statusMessageSlideUp]"
          >
            {{ statusMessage }}
          </h1>
        </Transition>
      </div>
      <ConnectFour />
      <div class="bottom">
        <Transition>
          <button
            @click="store.disconnect()"
            v-if="store.lobby && showPausedControls"
          >
            {{ $t("page.resumeButton") }}
          </button>
          <div v-else-if="store.isUntouched && !store.lobby">
            <div>{{ $t("page.welcome.startPlayingLocally") }}</div>
            <button @click="store.connect()">
              {{ $t("page.welcome.createLobbyButton") }}
            </button>
          </div>
          <button
            v-else-if="gameUIStore.state.result && !store.lobby"
            @click="store.restartGame()"
          >
            {{ $t("page.rematchButton") }}
          </button>
        </Transition>
      </div>
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
      <button class="flat" @click="store.dismissDisconnectReason()">
        {{ $t(`page.dialog.${store.disconnectedReason}.closeButton`) }}
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

main {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;

  z-index: 50;
}

.top {
  display: flex;
  justify-content: end;
  flex-direction: column;
  align-items: center;
  flex: 1;

  h1 {
    margin-bottom: 40px;
  }
}

.game-state {
  text-align: center;
  opacity: 1;
  transform: translateY(0);

  &.v-enter-active {
    transition-property: opacity, transform;
    transition-duration: 360ms;
    transition-timing-function: ease-out;
  }

  &.v-leave-active {
    transition-property: opacity;
    transition-duration: 120ms;
    transition-timing-function: ease-in;
  }

  &:is(.v-enter-from, .v-leave-to) {
    opacity: 0;
  }

  &.slide-up.v-enter-from {
    transform: translateY(32px);
  }
}

.bottom {
  display: flex;
  justify-content: start;
  flex-direction: column;
  align-items: center;

  position: relative;
  width: 100%;
  flex: 1;

  div {
    width: 100%;
    text-align: center;
    margin-bottom: 16px;
  }

  & > * {
    position: absolute;
    margin-top: 40px;
  }

  & > .v-enter-active {
    transition: opacity 120ms ease-in;
  }

  & > .v-leave-active {
    transition: opacity 120ms ease-out;
  }

  & > :is(.v-enter-from, .v-leave-to) {
    opacity: 0;
  }
}

@media (min-width: layout.$panel-layout-tablet) {
  .top h1 {
    margin-bottom: 48px;
  }

  .bottom > * {
    margin-top: 48px;
  }
}
</style>
