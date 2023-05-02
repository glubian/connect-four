import type { GameConfig } from "./ws";
import { TIME_PER_TURN_MIN } from "./ws";

/** Contents of the cookie. */
export const cookie = parseCookie();

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

/** Structure of the cookie. */
interface Cookie {
  userPreferences: UserPreferences;
  gameConfig: GameConfig;
}

function isObject<T extends {}>(obj: T | NotAnObject): obj is T {
  return !!obj && typeof obj === "object" && !Array.isArray(obj);
}

/** Creates a `Cookie` object with default values. */
function defaultSettings(): Cookie {
  return {
    gameConfig: {
      timePerTurn: 0,
      timeCap: 0,
      allowDraws: true,
    },
    userPreferences: {
      lang: null,
      theme: null,
    },
  };
}

/** Loads preferences from the cookie. */
function parseCookie(): Cookie {
  const cookie = defaultSettings();

  if (!document.cookie) {
    return cookie;
  }

  const parsed: RecursiveOr<Cookie, NotAnObject> = JSON.parse(document.cookie);
  if (!isObject(parsed)) {
    return cookie;
  }

  const { gameConfig, userPreferences } = parsed;

  if (isObject(gameConfig)) {
    const { allowDraws, timeCap, timePerTurn } = gameConfig;
    const cookieConfig = cookie.gameConfig;
    if (typeof allowDraws === "boolean") {
      cookieConfig.allowDraws = allowDraws;
    }
    if (typeof timeCap === "number" && timeCap >= TIME_PER_TURN_MIN) {
      cookieConfig.timeCap = timeCap;
    }
    if (typeof timePerTurn === "number" && timePerTurn >= TIME_PER_TURN_MIN) {
      cookieConfig.timePerTurn = timePerTurn;
    }
  }

  if (isObject(userPreferences)) {
    const { theme, lang } = userPreferences;
    const cookieUserPreferences = cookie.userPreferences;
    if (isLang(lang)) {
      cookieUserPreferences.lang = lang;
    }
    if (isTheme(theme)) {
      cookieUserPreferences.theme = theme;
    }
  }

  return cookie;
}

/** Saves preferences to the cookie. */
function writeCookie() {
  document.cookie = JSON.stringify(cookie, (_, v) => (v ??= void 0));
}

/** Update user preferences and save changes. */
export function updateUserPreferences(userPreferences: UserPreferences) {
  cookie.userPreferences = userPreferences;
  writeCookie();
}

/** Update game configuration and save changes. */
export function updateGameConfig(gameConfig: GameConfig) {
  cookie.gameConfig = gameConfig;
  writeCookie();
}
