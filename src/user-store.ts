import { computed, reactive, watch } from "vue";
import { i18n } from "./i18n";

export enum Lang {
  English = "en",
  Polish = "pl",
}

export enum Theme {
  Light = "light",
  Dark = "dark",
  TrueBlack = "",
}

interface UserPreferences {
  lang?: Lang | null;
  theme?: Theme | null;
}

const DEFAULT_THEME = defaultTheme();

function defaultTheme(): Theme {
  const pref = matchMedia("(prefers-color-scheme: dark)").matches;
  return pref ? Theme.Dark : Theme.Light;
}

const currentLang = computed(
  (): Lang => userStore.preferred.lang ?? Lang.English
);

const currentTheme = computed(
  (): Theme => userStore.preferred.theme ?? DEFAULT_THEME
);

function setPreferredLang(lang: Lang | null) {
  userStore.preferred.lang = lang;
  savePreferences();
}

function setPreferredTheme(theme: Theme | null) {
  userStore.preferred.theme = theme;
  savePreferences();
}

function applyTheme() {
  const { classList } = document.body;
  classList.toggle(Theme.Dark, userStore.current.theme === Theme.Dark);
  classList.toggle(Theme.Light, userStore.current.theme === Theme.Light);
}

function loadPreferences() {
  if (!document.cookie) {
    return;
  }

  userStore.preferred = JSON.parse(document.cookie);
  userStore.preferred.lang ??= null;
  userStore.preferred.theme ??= null;
}

function savePreferences() {
  document.cookie = JSON.stringify(userStore.preferred, (_, v) => v ?? void 0);
}

/** Handles user preferences. */
export const userStore = reactive({
  preferred: {
    lang: null,
    theme: null,
  } as UserPreferences,
  current: {
    lang: currentLang,
    theme: currentTheme,
  } as const,
  setPreferredLang,
  setPreferredTheme,
});

watch(currentLang, (lang) => (i18n.global.locale.value = lang));
watch(currentTheme, applyTheme);
loadPreferences();
