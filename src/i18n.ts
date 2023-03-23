import { createI18n } from "vue-i18n";
import messages from "./messages.json";

function polishPluralRules(num: number): number {
  const SEKUNDA = 0;
  const SEKUNDY = 1;
  const SEKUND = 2;

  if (num === 1) {
    return SEKUNDA;
  }

  const teen = num > 10 && num < 20;
  const lastDigit = num % 10;
  if (!teen && lastDigit > 1 && lastDigit < 5) {
    return SEKUNDY;
  }

  return SEKUND;
}

export const i18n = createI18n({
  legacy: false,
  availableLocales: ["en", "pl"],
  pluralRules: { pl: polishPluralRules },
  fallbackLocale: "en",
  messages,
  missingWarn: false,
  fallbackWarn: false,
});
