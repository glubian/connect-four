<script lang="ts" setup>
import { GameWinner, Player } from "@/game";
import { gameUIStore } from "@/game-ui-store";
import { PanelLayout, RestartPopoverAppearance } from "@/layout";
import { layoutStore } from "@/layout-store";
import { store } from "@/store";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import ConnectFour from "./ConnectFour.vue";
import RequestStatus from "./RequestStatus.vue";

const emit = defineEmits<{ (ev: "showRequest"): void }>();

const { t } = useI18n();

const showPausedControls = computed(() => {
  const { isPanelShown, panelLayout } = layoutStore;
  return isPanelShown && panelLayout === PanelLayout.Desktop;
});

const statusMessage = computed(() => {
  const { result } = gameUIStore.state;
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

const statusMessageSlideUp = ref("");
watch(
  [() => layoutStore.isPanelShown, () => gameUIStore.state.result],
  ([isPanelShown, result], [, prevResult]) => {
    const slideUp = !isPanelShown && result && !prevResult;
    statusMessageSlideUp.value = slideUp ? "slide-up" : "";
  }
);

const showRequestStatus = computed(() => {
  const [r1, r2] = store.restartRequests;
  const { showRequestStatus } = gameUIStore;
  return showRequestStatus && (r1 || r2);
});

const showStatusMessage = computed(() => {
  const { restartPopoverAppearance } = layoutStore;
  const { Desktop } = RestartPopoverAppearance;
  return (
    statusMessage.value &&
    (!showRequestStatus.value || restartPopoverAppearance === Desktop)
  );
});

const welcomeSectionStyle = computed(() => {
  const { areTimerMarksVisible } = layoutStore;
  return { paddingTop: areTimerMarksVisible && store.timeCap ? "44px" : "" };
});
</script>
<template>
  <div class="main-in-game">
    <div class="top">
      <Transition mode="out-in">
        <h1
          class="game-state large"
          :class="[layoutStore.panelLayout]"
          v-if="showPausedControls"
        >
          {{ t("page.statusIndicator.paused") }}
        </h1>
        <h1
          v-else-if="showStatusMessage"
          class="game-state large"
          :class="[layoutStore.panelLayout, statusMessageSlideUp]"
        >
          {{ statusMessage }}
        </h1>
        <RequestStatus
          class="request-status"
          @click="$emit('showRequest')"
          v-else-if="showRequestStatus"
        ></RequestStatus>
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
        <div
          :style="welcomeSectionStyle"
          v-else-if="store.isUntouched && !store.lobby"
        >
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
  </div>
</template>
<style lang="scss" scoped>
@use "@/layout";

.main-in-game {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;

  width: 100%;
  overflow-x: hidden;

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
  transform: translateY(0);

  &.v-enter-active {
    transition-property: opacity, transform;
    transition-duration: 360ms;
    transition-timing-function: ease-out;
  }

  &.v-leave-active {
    transition: opacity 120ms ease-in;
  }

  &:is(.v-enter-from, .v-leave-to) {
    opacity: 0;
  }

  &.slide-up.v-enter-from {
    transform: translateY(32px);
  }
}

.request-status {
  &:is(.v-enter-from, v.leave-to) {
    opacity: 0;
  }

  &.v-enter-active {
    transition: opacity 120ms ease-out;
  }

  &.v-leave-active {
    transition: opacity 120ms ease-in;
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

@media (min-width: layout.$restart-popover-desktop) {
  .request-status {
    display: none;
  }
}
</style>
