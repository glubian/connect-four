import type { GameConfig } from "./ws";
import { TIME_PER_TURN_MIN } from "./ws";

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

export interface UserPreferences {
  lang: Lang | null;
  theme: Theme | null;
}

/** Mirrors contents of `localStorage`. */
interface Storage extends UserPreferences {
  gameConfig: GameConfig;
}

/** Maps properties of `Storage` to their keys in `localStorage`. */
const STORAGE_KEYS = {
  lang: "lang",
  theme: "theme",
  gameConfig: "game-config",
} as const;

/** Every type that is not an object, `null`, functions and arrays. */
type NotAnObject =
  | boolean
  | number
  | bigint
  | string
  | symbol
  | Function
  | unknown[]
  | undefined
  | null;

/**
 * In addition to applying type `U` to `T`, applies it recursively to all of
 * its properties or items.
 */
// Based on https://stackoverflow.com/a/51365037
type RecursiveOr<T, U> = T extends (infer I)[]
  ? RecursiveOr<I, U>[] | U
  : T extends object
  ? { [P in keyof T]: RecursiveOr<T[P], U> } | U
  : T | U;

/** Forces type checking of all object properties at runtime. */
type Maybe<T extends {}> = RecursiveOr<T, NotAnObject>;

function isLang(value: unknown): value is Lang {
  return value === "en" || value === "pl";
}

function isTheme(value: unknown): value is Theme {
  return value === "" || value === "dark" || value === "light";
}

function isObject<T extends {}>(obj: T | NotAnObject): obj is T {
  return !!obj && typeof obj === "object" && !Array.isArray(obj);
}

/** Creates a `Storage` object with default values. */
function defaultStorage(): Storage {
  return {
    lang: null,
    theme: null,
    gameConfig: {
      timePerTurn: 0,
      timeCap: 0,
      allowDraws: false,
    },
  };
}

/** Reads values from the storage. */
function readStorage(): Storage {
  const storage = defaultStorage();

  const lang = localStorage.getItem(STORAGE_KEYS.lang);
  if (isLang(lang)) {
    storage.lang = lang;
  }

  const theme = localStorage.getItem(STORAGE_KEYS.theme);
  if (isTheme(theme)) {
    storage.theme = theme;
  }

  let gameConfig: Maybe<GameConfig>;
  try {
    const gameConfigStr = localStorage.getItem(STORAGE_KEYS.gameConfig) ?? "";
    gameConfig = JSON.parse(gameConfigStr);
  } catch (_) {
    gameConfig = null;
  }

  if (isObject(gameConfig)) {
    const { allowDraws, timeCap, timePerTurn } = gameConfig;
    const storageConfig = storage.gameConfig;
    if (typeof allowDraws === "boolean") {
      storageConfig.allowDraws = allowDraws;
    }
    if (typeof timeCap === "number" && timeCap >= TIME_PER_TURN_MIN) {
      storageConfig.timeCap = timeCap;
    }
    if (typeof timePerTurn === "number" && timePerTurn >= TIME_PER_TURN_MIN) {
      storageConfig.timePerTurn = timePerTurn;
    }
  }

  return storage;
}

/** Removes any unused items from the storage. */
function cleanStorage() {
  const ls = localStorage;
  const keys = Object.values(STORAGE_KEYS);
  const used = keys.reduce((i, k) => (ls.getItem(k) === null ? i : i + 1), 0);
  if (localStorage.length === used) {
    return;
  }

  const userPreferences = {
    lang: storage.lang,
    theme: storage.theme,
  };
  localStorage.clear();
  updateUserPreferences(userPreferences);
  updateGameConfig(storage.gameConfig);
}

/** Values read from the storage. */
export const storage = readStorage();
cleanStorage();

/** Update user preferences and save changes. */
export function updateUserPreferences(userPreferences: UserPreferences) {
  const { lang, theme } = userPreferences;

  if (lang !== null) {
    localStorage.setItem(STORAGE_KEYS.lang, lang);
  } else {
    localStorage.removeItem(STORAGE_KEYS.lang);
  }

  if (theme !== null) {
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  } else {
    localStorage.removeItem(STORAGE_KEYS.theme);
  }

  storage.lang = lang;
  storage.theme = theme;
}

/** Update game configuration and save changes. */
export function updateGameConfig(gameConfig: GameConfig) {
  const gameConfigStr = JSON.stringify(gameConfig, (_, v) => v ?? void 0);
  localStorage.setItem(STORAGE_KEYS.gameConfig, gameConfigStr);
  storage.gameConfig = gameConfig;
}
