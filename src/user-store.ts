import { computed, reactive, watch } from "vue";
import messages from "./messages.json";
import { Lang, Theme, storage, updateUserPreferences } from "./storage";

const DEFAULT_THEME = defaultTheme();
const DEFAULT_LANG = defaultLang();

/** Determines the default theme. */
function defaultTheme(): Theme {
  const pref = matchMedia("(prefers-color-scheme: dark)").matches;
  return pref ? Theme.Dark : Theme.Light;
}

/** Determines the default language. */
function defaultLang(): Lang {
  for (const lang of navigator.languages ?? [navigator.language]) {
    const code = lang.slice(0, 2);
    if (code in messages) {
      return code as Lang;
    }
  }

  return Lang.English;
}

/** Current language setting. */
const currentLang = computed(
  (): Lang => userStore.preferred.lang ?? DEFAULT_LANG
);

/** Current theme setting. */
const currentTheme = computed(
  (): Theme => userStore.preferred.theme ?? DEFAULT_THEME
);

/** Updates the preferred language and saves changes. */
function setPreferredLang(lang: Lang | null) {
  userStore.preferred.lang = lang;
}

/** Updates the preferred theme and saves changes. */
function setPreferredTheme(theme: Theme | null) {
  userStore.preferred.theme = theme;
}

/** Handles user preferences. */
export const userStore = reactive({
  preferred: {
    lang: storage.lang,
    theme: storage.theme,
  },
  current: {
    lang: currentLang,
    theme: currentTheme,
  } as const,
  setPreferredLang,
  setPreferredTheme,
});

// Automatically save user preferences.
watch(() => userStore.preferred, updateUserPreferences, { deep: true });
