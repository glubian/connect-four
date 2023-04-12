<script setup lang="ts">
import { useIntersectionObserver } from "@/composables/intersection-observer";
import { useResize } from "@/composables/resize";
import { store } from "@/store";
import { layoutStore } from "@/layout-store";
import { BASE_URL, URL_LOBBY_PARAMETER } from "@/urls";
import { computed, ref, type Ref } from "vue";
import { useI18n } from "vue-i18n";
import CopyInput from "./CopyInput.vue";
import PlayerCard from "./PlayerCard.vue";

const LAYOUT_WIDE = 640;
const LAYOUT_WIDE_CLASS = "layout-wide";

const PREFERRED_QR_CODE_SIZE = 160; // px

const remotePlaySetupRef: Ref<HTMLElement | null> = ref(null);
const titleBarRef: Ref<HTMLHeadingElement | null> = ref(null);
const linkQRRef: Ref<HTMLImageElement | null> = ref(null);

const { t } = useI18n();
const { offsetWidth: panelWidth } = useResize(remotePlaySetupRef);
const { entries: rootIOEls } = useIntersectionObserver({
  rootRef: remotePlaySetupRef,
  refs: { titleBar: titleBarRef },
});

const panelLayoutWide = computed(() =>
  panelWidth.value >= LAYOUT_WIDE ? LAYOUT_WIDE_CLASS : ""
);

const showStickyHeading = computed(() => {
  const titleBarIOEntry = rootIOEls.titleBar.value;
  return titleBarIOEntry && !titleBarIOEntry.isIntersecting;
});

const headingClass = computed(() => (panelLayoutWide.value ? "large" : ""));

const link = computed(() => {
  const { lobby } = store;
  if (!(lobby && lobby.id)) {
    return "";
  }

  const url = new URL(BASE_URL);
  url.searchParams.set(URL_LOBBY_PARAMETER, lobby.id);
  return url.toString();
});

const linkQRSrc = computed(() => {
  const { lobby } = store;
  if (lobby && lobby.isHost && lobby.qrCode) {
    return "data:image/png;base64," + lobby.qrCode.img;
  }

  return "";
});

const linkQRAlt = computed(() => {
  const { lobby } = store;
  if (lobby && lobby.isHost && lobby.qrCode) {
    return t("page.remotePlaySetup.qrCodeLinkAlt");
  }

  return t("page.remotePlaySetup.qrCodeNoLinkAlt");
});

const linkQRStyle = computed(() => {
  const { lobby } = store;
  if (!(lobby && lobby.isHost && lobby.qrCode)) {
    return;
  }

  const size = lobby.qrCode.width;
  const scale = Math.max(Math.floor(PREFERRED_QR_CODE_SIZE / size), 1);

  const scaledSize = size * scale + "px";
  const borderWidth = scale * 2 + "px";
  return { width: scaledSize, height: scaledSize, borderWidth };
});

const playerCodes = computed(() => {
  const { lobby } = store;
  return lobby && lobby.isHost ? lobby.codes : [];
});
</script>

<template>
  <div
    class="remote-play-setup"
    :class="[layoutStore.panelLayout, panelLayoutWide]"
    ref="remotePlaySetupRef"
  >
    <div class="title-bar">
      <button @click="store.disconnect()" class="icon">
        <i class="mi-close"></i>
      </button>
      <p v-if="showStickyHeading">
        {{ $t("page.remotePlaySetup.setUpRemotePlay") }}
      </p>
    </div>

    <div class="content">
      <h1 :class="headingClass" ref="titleBarRef">
        {{ $t("page.remotePlaySetup.setUpRemotePlay") }}
      </h1>

      <div class="section">
        <h2>{{ $t("page.remotePlaySetup.inviteYourFriend") }}</h2>
        <div class="links">
          <p>{{ $t("page.remotePlaySetup.inviteYourFriendText") }}</p>
          <img
            :src="linkQRSrc"
            :alt="linkQRAlt"
            :style="linkQRStyle"
            ref="linkQRRef"
          />
          <CopyInput class="copy-input" :value="link" />
        </div>
      </div>

      <div class="section">
        <h2>{{ $t("page.remotePlaySetup.addYourFriend") }}</h2>
        <p>{{ $t("page.remotePlaySetup.addYourFriendText") }}</p>
        <div class="player-cards card">
          <PlayerCard :code="code" :key="code" v-for="code of playerCodes" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.remote-play-setup {
  width: 100%;
  height: 100%;
  overflow: auto;
}

.title-bar {
  display: flex;
  align-items: center;

  position: sticky;
  top: 0;
  left: 0;
  height: 56px;

  background: var(--c);
  z-index: 1;

  button.icon {
    width: 56px;
    height: 56px;
  }

  p {
    margin: 0;
    font-weight: 500;
  }

  .layout-desktop & {
    display: none;
  }
}

.content {
  padding: 16px;

  .layout-wide & {
    padding: 32px;
  }
}

.section {
  margin-top: 32px;
  margin-bottom: 16px;

  .layout-wide & {
    margin-top: 64px;
  }
}

h1 {
  margin-top: 0;
  margin-bottom: 32px;

  .layout-wide & {
    margin-top: 64px;
    margin-bottom: 64px;
  }

  .layout-desktop:not(.layout-wide) & {
    margin-top: 32px;
  }
}

h2 {
  margin-top: 0;
  margin-bottom: 16px;
}

p {
  margin-top: 0;
  margin-bottom: 16px;
}

.links {
  display: grid;

  grid-template-columns: 1fr;
  grid-template-areas:
    "text"
    "qr"
    "input";
  gap: 16px;
  width: 100%;

  p {
    grid-area: text;
    margin: 0;
  }

  img {
    grid-area: qr;
    margin: 0 auto;

    border-color: #fff;
    border-style: solid;
    background-color: #fff;
    box-shadow: var(--c-card-drop-shadow);
    image-rendering: pixelated;
  }

  img[src=""] {
    position: relative;
    width: 148px;
    height: 148px;

    &::after {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #fff;
    }
  }

  .copy-input {
    grid-area: input;
    align-self: flex-end;
  }

  .layout-wide & {
    grid-template-areas:
      "text qr"
      "input qr";

    img {
      margin: 0;
    }
  }
}

.copy-input {
  display: flex;
}

.player-cards {
  display: flex;
  flex-direction: column;
  margin-top: 24px;
  border-radius: 4px;
  & > :not(:last-child) {
    border-bottom: var(--c-card-separator);
  }
}
</style>
