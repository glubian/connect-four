import { computed, reactive } from "vue";
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
  return pref ? Theme.TrueBlack : Theme.Light;
}

const currentLang = computed(
  (): Lang => userStore.preferred.lang ?? Lang.English
);

const currentTheme = computed(
  (): Theme => userStore.preferred.theme ?? DEFAULT_THEME
);

function setPreferredLang(lang: Lang | null) {
  userStore.preferred.lang = lang;
  applyLang();
  savePreferences();
}

function applyLang() {
  i18n.global.locale.value = userStore.current.lang;
}

function setPreferredTheme(theme: Theme | null) {
  userStore.preferred.theme = theme;
  applyTheme();
  savePreferences();
}

function applyTheme() {
  document.body.classList.toggle(
    Theme.Dark,
    userStore.current.theme === Theme.Dark
  );
  document.body.classList.toggle(
    Theme.Light,
    userStore.current.theme === Theme.Light
  );
}

function loadPreferences() {
  if (!document.cookie) {
    return;
  }

  userStore.preferred = JSON.parse(document.cookie);
  applyLang();
  applyTheme();
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

loadPreferences();
