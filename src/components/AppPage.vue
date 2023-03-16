<script setup lang="ts">
import {
  PanelLayout,
  PANEL_APPEAR_DURATION,
  PANEL_MAX_WIDTH,
  PANEL_MIN_TRANSLATE,
  PANEL_MIN_WIDTH,
} from "@/layout";
import { layoutStore } from "@/layout-store";
import { store } from "@/store";
import { computed, onUnmounted, ref, watch, type Ref } from "vue";
import AppDialog from "./AppDialog.vue";
import AppPageHeader from "./AppPageHeader.vue";
import AppPageMainInGame from "./AppPageMainInGame.vue";

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
      <AppPageMainInGame :is-panel-shown="isPanelShown" />
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

main {
  position: relative;
  width: 100%;
  height: 100%;
  overflow-y: hidden;
}

main > * {
  width: 100%;
  height: 100%;
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
