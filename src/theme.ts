import { watch } from "vue";
import { Theme } from "./storage";
import { userStore } from "./user-store";

/** Updates CSS theme classes. */
function applyTheme(theme: Theme) {
  const { classList } = document.body;
  classList.toggle(Theme.Dark, theme === Theme.Dark);
  classList.toggle(Theme.Light, theme === Theme.Light);
  for (const animation of document.getAnimations()) {
    animation.finish();
  }
}

// Automatically apply theme.
watch(() => userStore.current.theme, applyTheme, { immediate: true });
