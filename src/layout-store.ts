import { reactive } from "vue";
import { panelLayout } from "./layout";

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
  innerWidth,
  innerHeight,
  isFullscreen: isFullscreen(),
  setFullscreen,
});

document.body.addEventListener("fullscreenchange", updateFullscreen);
document.body.addEventListener("fullscreenerror", updateFullscreen);

window.addEventListener("resize", () => {
  layoutStore.innerWidth = window.innerWidth;
  layoutStore.innerHeight = window.innerHeight;
  layoutStore.panelLayout = panelLayout(innerWidth);
});
