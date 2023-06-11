/** Used to create invite links. */
export const BASE_URL = "http://localhost:3333";

/** WebSocket server URL. */
export const WS_SERVER_URL = "wss://localhost:8080";

/** Invite link lobby parameter. */
export const URL_LOBBY_PARAMETER = "lobby";

/**
 * DoH URLs for checking remote play availability via JSON API using
 * [Google's schema](https://developers.google.com/speed/public-dns/docs/doh/json).
 */
export const DOH_URLS = [
  "https://dns.google/resolve",
  "https://cloudflare-dns.com/dns-query",
] as const;
