import { createI18n } from "vue-i18n";
import messages from "./messages.json";

export const i18n = createI18n({
  legacy: false,
  availableLocales: ["en", "pl"],
  fallbackLocale: "en",
  messages,
  missingWarn: false,
  fallbackWarn: false,
});
