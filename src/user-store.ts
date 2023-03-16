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

/** Changes display language. Should not be called directly. */
function applyLang(lang: Lang) {
  i18n.global.locale.value = lang;
}

/** Updates CSS theme classes. Should not be called directly. */
function applyTheme(theme: Theme) {
  const { classList } = document.body;
  classList.toggle(Theme.Dark, theme === Theme.Dark);
  classList.toggle(Theme.Light, theme === Theme.Light);
  for (const animation of document.getAnimations()) {
    animation.finish();
  }
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

watch(currentLang, applyLang, { immediate: true });
watch(currentTheme, applyTheme, { immediate: true });
loadPreferences();
