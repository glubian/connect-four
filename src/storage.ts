import type { GameConfig } from "./ws";
import { TIME_PER_TURN_MIN } from "./ws";

/** Values read from the storage. */
export const storage = readStorage();

/** Language setting. */
export enum Lang {
  English = "en",
  Polish = "pl",
}

function isLang(value: unknown): value is Lang {
  return value === "en" || value === "pl";
}

/** Theme setting. */
export enum Theme {
  Light = "light",
  Dark = "dark",
  TrueBlack = "",
}

function isTheme(value: unknown): value is Theme {
  return value === "" || value === "dark" || value === "light";
}

export interface UserPreferences {
  lang: Lang | null;
  theme: Theme | null;
}

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

/** Forces type checking of all object properties at runtime. */
// Based on https://stackoverflow.com/a/51365037
type RecursiveOr<T, U> = {
  [P in keyof T]?: T[P] extends (infer W)[]
    ? RecursiveOr<W, U>[]
    : T[P] extends object
    ? RecursiveOr<T[P], U> | U
    : T[P];
};

interface Storage {
  userPreferences: UserPreferences;
  gameConfig: GameConfig;
}

function isObject<T extends {}>(obj: T | NotAnObject): obj is T {
  return !!obj && typeof obj === "object" && !Array.isArray(obj);
}

/** Creates a `Storage` object with default values. */
function defaultStorage(): Storage {
  return {
    gameConfig: {
      timePerTurn: 0,
      timeCap: 0,
      allowDraws: false,
    },
    userPreferences: {
      lang: null,
      theme: null,
    },
  };
}

/** Reads values from the storage. */
function readStorage(): Storage {
  const storage = defaultStorage();

  if (!document.cookie) {
    return storage;
  }

  const parsed: RecursiveOr<Storage, NotAnObject> = JSON.parse(document.cookie);
  if (!isObject(parsed)) {
    return storage;
  }

  const { gameConfig, userPreferences } = parsed;

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

  if (isObject(userPreferences)) {
    const { theme, lang } = userPreferences;
    const storageUserPreferences = storage.userPreferences;
    if (isLang(lang)) {
      storageUserPreferences.lang = lang;
    }
    if (isTheme(theme)) {
      storageUserPreferences.theme = theme;
    }
  }

  return storage;
}

/** Writes `storage` to `document.cookie`. */
function writeStorage() {
  document.cookie = JSON.stringify(storage, (_, v) => (v ??= void 0));
}

/** Update user preferences and save changes. */
export function updateUserPreferences(userPreferences: UserPreferences) {
  storage.userPreferences = userPreferences;
  writeStorage();
}

/** Update game configuration and save changes. */
export function updateGameConfig(gameConfig: GameConfig) {
  storage.gameConfig = gameConfig;
  writeStorage();
}
