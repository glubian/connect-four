import { computed, reactive, watch } from "vue";
import { i18n } from "./i18n";

/** Language setting. */
export enum Lang {
  English = "en",
  Polish = "pl",
}

/** Theme setting. */
export enum Theme {
  Light = "light",
  Dark = "dark",
  TrueBlack = "",
}

/**
 * Preferences stored in `document.cookie`.
 * `null` and `undefined` values mean lack of preference.
 */
interface UserPreferences {
  lang?: Lang | null;
  theme?: Theme | null;
}

const DEFAULT_THEME = defaultTheme();

/** Determines the default theme. */
function defaultTheme(): Theme {
  const pref = matchMedia("(prefers-color-scheme: dark)").matches;
  return pref ? Theme.Dark : Theme.Light;
}

/** Current language setting. */
const currentLang = computed(
  (): Lang => userStore.preferred.lang ?? Lang.English
);

/** Current theme setting. */
const currentTheme = computed(
  (): Theme => userStore.preferred.theme ?? DEFAULT_THEME
);

/** Updates the preferred language and saves changes. */
function setPreferredLang(lang: Lang | null) {
  userStore.preferred.lang = lang;
  savePreferences();
}

/** Updates the preferred theme and saves changes. */
function setPreferredTheme(theme: Theme | null) {
  userStore.preferred.theme = theme;
  savePreferences();
}

/** Updates CSS theme classes. */
function applyTheme() {
  const { classList } = document.body;
  classList.toggle(Theme.Dark, userStore.current.theme === Theme.Dark);
  classList.toggle(Theme.Light, userStore.current.theme === Theme.Light);
}

/** Loads preferences from the cookie. */
function loadPreferences() {
  if (!document.cookie) {
    return;
  }

  userStore.preferred = JSON.parse(document.cookie);
  userStore.preferred.lang ??= null;
  userStore.preferred.theme ??= null;
}

/** Saves preferences to the cookie. */
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
