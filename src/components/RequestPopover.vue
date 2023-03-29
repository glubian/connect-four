<script lang="ts" setup>
import { otherPlayer } from "@/game";
import { BORDER_WIDTH, FIELD_SIZE_UI } from "@/game-ui";
import {
  RestartPopoverAppearance,
  RESTART_POPOVER_RIGHT,
  RESTART_POPOVER_TOP,
  RESTART_POPOVER_WIDTH,
  RESTART_STATUS_HEIGHT,
  RESTART_STATUS_MARGIN,
} from "@/layout";
import { layoutStore } from "@/layout-store";
import { store, type RestartRequest } from "@/store";
import { computed, ref, watch } from "vue";
import AppPopover from "./AppPopover.vue";
import RequestDetails from "./RequestDetails.vue";

const props = defineProps<{ shown?: boolean }>();
const emit = defineEmits<{ (ev: "update:shown", v: boolean): void }>();

const recvReq = computed(() => {
  const { remoteRole, restartRequests } = store;
  return remoteRole === null ? null : restartRequests[otherPlayer(remoteRole)];
});
watch(recvReq, () => void (reqShown.value = false));

const reqExpand = ref(false);

const reqShown = computed({
  get() {
    return (reqDesktop.value || props.shown) && !!recvReq.value;
  },
  set(v) {
    emit("update:shown", v);
  },
});

const reqDesktop = computed(() => {
  const { Desktop } = RestartPopoverAppearance;
  const { restartPopoverAppearance } = layoutStore;
  return restartPopoverAppearance === Desktop;
});

/** Centers request popover horizontally. */
function restartRequestRight(innerWidth: number): number {
  return innerWidth / 2 - RESTART_POPOVER_WIDTH / 2;
}

/** Aligns request popover to the top of request status element. */
function restartRequestTop(innerHeight: number): number {
  return (
    innerHeight / 2 -
    FIELD_SIZE_UI / 2 -
    RESTART_STATUS_MARGIN -
    RESTART_STATUS_HEIGHT -
    BORDER_WIDTH
  );
}

const reqRight = computed(() =>
  reqDesktop.value
    ? RESTART_POPOVER_RIGHT
    : restartRequestRight(layoutStore.innerWidth)
);
const reqTop = computed(() =>
  reqDesktop.value
    ? RESTART_POPOVER_TOP
    : restartRequestTop(layoutStore.innerHeight)
);
const reqBg = computed(() => {
  const { Desktop, Auto: Popover } = RestartPopoverAppearance;
  const { restartPopoverAppearance } = layoutStore;
  if (restartPopoverAppearance === Desktop) {
    return "disabled";
  } else if (restartPopoverAppearance === Popover) {
    return "hidden;";
  }

  return "";
});
const reqClass = computed(() => {
  const { Mobile } = RestartPopoverAppearance;
  const { restartPopoverAppearance } = layoutStore;
  const width = restartPopoverAppearance === Mobile ? "" : "440px";
  return { width };
});
watch(reqDesktop, (curr, prev) => {
  if (curr && !prev) {
    reqExpand.value = false;
  }
});
</script>

<template>
  <AppPopover
    :top="reqTop"
    :right="reqRight"
    :background="reqBg"
    :disable-focus-trap="reqDesktop"
    v-model:shown="reqShown"
    v-if="store.remoteRole !== null"
  >
    <RequestDetails
      :req="recvReq as RestartRequest"
      :player="store.remoteRole"
      :style="reqClass"
    ></RequestDetails>
  </AppPopover>
</template>
