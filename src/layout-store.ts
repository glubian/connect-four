import { computed, reactive } from "vue";
import {
  panelLayout,
  popoverAppearance,
  restartPopoverAppearance,
} from "./layout";
import { store } from "./store";

function setFullscreen(isFullscreen: boolean) {
  if (isFullscreen) {
    document.body.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

function isFullscreen(): boolean {
  return !!document.fullscreenElement;
}

function updateFullscreen() {
  layoutStore.isFullscreen = isFullscreen();
}

/** Contains values related to UI layout. */
export const layoutStore = reactive({
  panelLayout: panelLayout(innerWidth),
  popoverAppearance: popoverAppearance(innerWidth),
  restartPopoverAppearance: restartPopoverAppearance(innerWidth),
  innerWidth,
  innerHeight,
  isFullscreen: isFullscreen(),
  isPanelShown: computed(() => !!store.lobby && store.lobby.isHost),
  setFullscreen,
});

document.body.addEventListener("fullscreenchange", updateFullscreen);
document.body.addEventListener("fullscreenerror", updateFullscreen);

window.addEventListener("resize", () => {
  layoutStore.innerWidth = window.innerWidth;
  layoutStore.innerHeight = window.innerHeight;
  layoutStore.panelLayout = panelLayout(innerWidth);
  layoutStore.popoverAppearance = popoverAppearance(innerWidth);
  layoutStore.restartPopoverAppearance = restartPopoverAppearance(innerWidth);
});
