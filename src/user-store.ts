import { computed, reactive, watch } from "vue";
import { Lang, Theme, storage, updateUserPreferences } from "./storage";
import { i18n } from "./i18n";

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
}

/** Updates the preferred theme and saves changes. */
function setPreferredTheme(theme: Theme | null) {
  userStore.preferred.theme = theme;
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

/** Handles user preferences. */
export const userStore = reactive({
  preferred: { ...storage.userPreferences },
  current: {
    lang: currentLang,
    theme: currentTheme,
  } as const,
  setPreferredLang,
  setPreferredTheme,
});

watch(currentLang, applyLang, { immediate: true });
watch(currentTheme, applyTheme, { immediate: true });
watch(() => userStore.preferred, updateUserPreferences, { deep: true });
