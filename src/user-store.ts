import { reactive } from "vue";
import { i18n } from "./i18n";

export enum Lang {
  English = "en",
  Polish = "pl",
}

export enum Theme {
  Light = "light",
  DarkAMOLED = "",
}

function setLang(lang: Lang) {
  userStore.lang = lang;
  i18n.global.locale.value = lang;
}

function setTheme(theme: Theme) {
  userStore.theme = theme;
  updateTheme();
}

function updateTheme() {
  document.body.classList.toggle("light", userStore.theme === Theme.Light);
}

function preferredTheme(): Theme {
  const pref = matchMedia("(prefers-color-scheme: dark)").matches;
  return pref ? Theme.DarkAMOLED : Theme.Light;
}

/** Handles user preferences. */
export const userStore = reactive({
  lang: Lang.English,
  theme: preferredTheme(),
  setLang,
  setTheme,
});
