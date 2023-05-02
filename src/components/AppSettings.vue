<script setup lang="ts">
import { Lang, Theme } from "@/cookie";
import { layoutStore } from "@/layout-store";
import { userStore } from "@/user-store";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import AppSettingToggle from "./AppSettingToggle.vue";

const emit = defineEmits<{ (ev: "hide"): void }>();
const { t } = useI18n();

function setTheme(t: Theme | null) {
  userStore.setPreferredTheme(t);
  emit("hide");
}

function setLang(l: Lang | null) {
  userStore.setPreferredLang(l);
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
  <div class="context-menu" style="min-width: 260px">
    <div class="section">
      <div class="title">
        <span>{{ $t("settings.theme.section") }}</span>
      </div>
      <AppSettingToggle
        :enabled="userStore.preferred.theme === Theme.Light"
        @click="setTheme(Theme.Light)"
        >{{ $t("settings.theme.light") }}</AppSettingToggle
      >
      <AppSettingToggle
        :enabled="userStore.preferred.theme === Theme.Dark"
        @click="setTheme(Theme.Dark)"
        >{{ $t("settings.theme.dark") }}</AppSettingToggle
      >
      <AppSettingToggle
        :enabled="userStore.preferred.theme === Theme.TrueBlack"
        @click="setTheme(Theme.TrueBlack)"
        >{{ $t("settings.theme.trueBlack") }}</AppSettingToggle
      >
      <AppSettingToggle
        :enabled="userStore.preferred.theme === null"
        @click="setTheme(null)"
        >{{ $t("settings.theme.system") }}</AppSettingToggle
      >
    </div>
    <div class="section">
      <div class="title">
        <span>{{ $t("settings.lang.section") }}</span>
      </div>
      <AppSettingToggle
        :enabled="userStore.preferred.lang === Lang.English"
        @click="setLang(Lang.English)"
        >English</AppSettingToggle
      >
      <AppSettingToggle
        :enabled="userStore.preferred.lang === Lang.Polish"
        @click="setLang(Lang.Polish)"
        >Polski</AppSettingToggle
      >
      <AppSettingToggle
        :enabled="userStore.preferred.lang === null"
        @click="setLang(null)"
        >{{ $t("settings.lang.system") }}</AppSettingToggle
      >
    </div>
    <div class="section">
      <button @click="toggleFullscreen">
        {{ fullscreenText }}
      </button>
    </div>
  </div>
</template>
