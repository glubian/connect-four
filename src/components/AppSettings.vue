<script setup lang="ts">
import { layoutStore } from "@/layout-store";
import { Lang, Theme, userStore } from "@/user-store";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import AppContextMenu from "./AppContextMenu.vue";
import AppSettingToggle from "./AppSettingToggle.vue";

const emit = defineEmits<{ (ev: "hide"): void }>();
const { t } = useI18n();

function setTheme(t: Theme) {
  userStore.setTheme(t);
  emit("hide");
}

function setLang(l: Lang) {
  userStore.setLang(l);
  emit("hide");
}

function toggleFullscreen() {
  layoutStore.setFullscreen(!layoutStore.isFullscreen);
  emit("hide");
}

const fullscreenText = computed(() =>
  t("settings.fullScreen." + (layoutStore.isFullscreen ? "exit" : "enter"))
);
</script>

<template>
  <AppContextMenu>
    <div class="section">
      <div class="title">
        <span>{{ $t("settings.theme.section") }}</span>
      </div>
      <AppSettingToggle
        :enabled="userStore.theme === Theme.Light"
        @click="setTheme(Theme.Light)"
        >{{ $t("settings.theme.light") }}</AppSettingToggle
      >
      <AppSettingToggle
        :enabled="userStore.theme === Theme.DarkAMOLED"
        @click="setTheme(Theme.DarkAMOLED)"
        >{{ $t("settings.theme.darkAMOLED") }}</AppSettingToggle
      >
    </div>
    <div class="section">
      <div class="title">
        <span>{{ $t("settings.langSection") }}</span>
      </div>
      <AppSettingToggle
        :enabled="userStore.lang === Lang.English"
        @click="setLang(Lang.English)"
        >English</AppSettingToggle
      >
      <AppSettingToggle
        :enabled="userStore.lang === Lang.Polish"
        @click="setLang(Lang.Polish)"
        >Polski</AppSettingToggle
      >
    </div>
    <div class="section">
      <button @click="toggleFullscreen">
        {{ fullscreenText }}
      </button>
    </div>
  </AppContextMenu>
</template>
