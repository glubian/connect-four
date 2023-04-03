import { computed, reactive, shallowRef, triggerRef, watch } from "vue";
import { TIME_PER_TURN_MIN } from "./constants";
import { Game, Player, otherPlayer, type GameRules } from "./game";
import { URL_LOBBY_PARAMETER } from "./urls";
import type { DisconnectReason, GameConfig, QR } from "./ws";
import WebSocketController from "./ws";

interface Lobby {
  isHost: true;
  id: string | null;
  qrCode: QR | null;
  codes: number[];
}

interface JoiningLobby {
  isHost: false;
  id: string | null;
  code: number | null;
}

/** Represents whether and which player selection screen should be shown. */
export enum PlayerSelection {
  Hidden,
  Voting,
  Waiting,
}

/**
 * Stores restart requests for both players, using `Player`
 * representation as index.
 */
type RestartRequests = [RestartRequest | null, RestartRequest | null];

/**
 * Restart request made when the game cannot be restarted without asking
 * the permission of the opponent first.
 */
export interface RestartRequest {
  /** Changes to the configuration, if any. */
  config?: GameConfig | null;
  /** Expiry handle. */
  handle: ReturnType<typeof setTimeout>;
  /** Time received. */
  received: number;
  /** Expiry date. */
  timeout: number;
}

function defaultRules(): GameRules {
  const { allowDraws } = defaultConfig();
  return {
    startingPlayer: Player.P1,
    allowDraws,
  };
}

function defaultConfig(): GameConfig {
  return {
    timePerTurn: 0,
    timeCap: 0,
    allowDraws: true,
  };
}

const wsController = new WebSocketController();
const game = shallowRef(Game.create(defaultRules()));
let wasGameSynced = false;

/**
 * Pending config changes in a local game, if any.
 *
 * After the user makes changes to the config, they are temporarily stored
 * here. Config is then applied if the user starts the game, or discarded if
 * they dismiss player selection dialog.
 */
let localConfig: GameConfig | null = null;

/** Extra time of both players in a local game. */
const extraTime: [number, number] = [0, 0];
/** Turn timeout handle in a local game. */
let turnTimeoutHandle: ReturnType<typeof setTimeout> | null = null;
/** Stores how much time is remaining in case the timer is paused. */
let timeoutRemaining: number | null = null; // timestamp

function startLocalGame(startingPlayer: Player) {
  game.value = Game.create({
    startingPlayer,
    ...store.config,
  });
  store.round++;
  clearTurnTimeout();
  extraTime.fill(0);
}

// Mutations that can be invoked by the UI

/**
 * Connects to a WebSocket server. If no lobby is specified,
 * a new one will be created.
 */
function connect(lobbyId?: string | null) {
  if (!store.isConnected && wsController.connect(lobbyId)) {
    store.lobby = createLobby(lobbyId);
    store.disconnectedReason = null;
    store.disconnectedByUser = false;
  }
}

/** Accepts the player with specified code and assigns them a role. */
function acceptPlayer(code: number, role: Player) {
  if (store.lobby && store.lobby.isHost) {
    const isVoting = store.playerSelection === PlayerSelection.Voting;
    const gameValue = isVoting ? null : game.value;
    wsController.pickPlayer(code, role, gameValue, store.config, store.round);
    store.remoteRole = otherPlayer(role);
  }
}

/** Sets the player code, when a player is trying to join a lobby. */
function setPlayerCode(code: number | null) {
  if (store.lobby && !store.lobby.isHost) {
    store.lobby.code = code;
  }
}

/** Ends the current turn. Passing `null` ends the turn without making a move. */
function endTurn(col: number | null) {
  const { state } = game.value;

  if (store.lobby || state.result) {
    return;
  }

  if (store.isConnected) {
    wsController.endTurn(state.turn, col);
  } else {
    const gameValue = game.value;
    const lastPlayer = gameValue.state.player;

    if (!gameValue.endTurn(col)) {
      return;
    }

    triggerRef(game);

    const timeRemained = clearTurnTimeout();
    if (gameValue.state.turn) {
      extraTime[lastPlayer] = timeRemained;
    }
    if (!gameValue.state.result) {
      const duration = getTimeoutDuration(extraTime[gameValue.state.player]);
      setLocalTurnTimeout(duration);
    }
  }
}

/** Restarts the game. */
function restartGame(config?: GameConfig) {
  if (store.lobby) {
    return;
  }

  if (store.isConnected) {
    wsController.restartGame(config);
  } else {
    store.playerSelection = PlayerSelection.Voting;
    localConfig = config ?? null;
  }
}

/** Sends a response to opponent's restart request, if one was made. */
function respondToRestartRequest(accepted: boolean) {
  const { remoteRole, restartRequests } = store;
  if (remoteRole === null) {
    return;
  }

  const opponent = otherPlayer(remoteRole);
  const req = restartRequests[opponent];
  if (req) {
    wsController.respondToRestartRequest(accepted);
  }
}

/** Select starting player in a local game. */
function selectStartingPlayer(player: Player): void;
/** Indicate whether the player wants to start a remote game. */
function selectStartingPlayer(wantsToStart: boolean): void;
function selectStartingPlayer(playerOrPreference: Player | boolean) {
  if (store.lobby || store.playerSelection === PlayerSelection.Hidden) {
    return;
  }

  const isPreference = typeof playerOrPreference === "boolean";
  if (isPreference && store.isConnected) {
    wsController.selectStartingPlayer(playerOrPreference);
  } else if (!(isPreference || store.isConnected)) {
    if (localConfig) {
      store.config = localConfig;
    }
    localConfig = null;
    startLocalGame(playerOrPreference);
    store.playerSelection = PlayerSelection.Hidden;
  }
}

/** Dismisses player selection dialog in a local game. */
function dismissPlayerSelection() {
  if (store.isConnected) {
    return;
  }

  store.playerSelection = PlayerSelection.Hidden;
}

/** Disconnects from the server. */
function disconnect() {
  if (store.isConnected) {
    store.disconnectedByUser = true;
    wsController.disconnect();
  }
}

/** Dismisses the reason for closing the connection. */
function dismissDisconnectReason() {
  store.disconnectedReason = null;
}

// Mutations called by `WebSocketsController`

/** Sets the lobby invite link. */
function wsLinkLobby(id: string, qr: QR) {
  if (store.lobby && store.lobby.isHost) {
    store.lobby.id = id;
    store.lobby.qrCode = qr;
  }
}

/** Updates lobby player list. */
function wsSyncLobby(playerCodes: number[]) {
  if (store.lobby && store.lobby.isHost) {
    store.lobby.codes = playerCodes;
  }
}

/** Sets remote `Game` role. */
function wsSetRemoteRole(role: Player) {
  store.remoteRole = role;
}

/** Sets game config, */
function wsSetConfig(config: GameConfig) {
  store.config = config;
}

let delay = 0;
/** Sets delay. */
function wsSetDelay(d: number) {
  delay = d;
}

let timeDifference = 0;
/** Sets time difference. */
function wsSetTimeDifference(dt: number) {
  timeDifference = dt;
}

/** Updates player selection. */
function wsPlayerSelection(p1Voted: boolean, p2Voted: boolean) {
  wasGameSynced = true;
  const { remoteRole } = store;
  const waiting =
    (remoteRole === Player.P1 && p1Voted) ||
    (remoteRole === Player.P2 && p2Voted);
  store.playerSelection = waiting
    ? PlayerSelection.Waiting
    : PlayerSelection.Voting;
  store.lobby = null;
}

/** Updates `Game` and round. */
function wsSyncGame(g: Game, round: number, timeout?: string | null) {
  wasGameSynced = true;
  game.value = g;
  store.round = round;
  store.remoteRound = round;
  store.lobby = null;
  store.playerSelection = PlayerSelection.Hidden;

  clearTurnTimeout();
  if (timeout) {
    setRemoteTurnTimeout(timeout);
  }
}

/** Signals the connection was successfully opened. */
function wsConnected() {
  store.isConnected = true;
}

/** Sets the reason for closing the connection. */
function wsDisconnectReason(reason: DisconnectReason) {
  store.disconnectedReason = reason;
}

/** Cleans up after the connection was closed. */
function wsDisconnected() {
  const { remoteRole, lobby } = store;

  store.isConnected = false;
  store.lobby = null;
  store.remoteRole = null;
  store.turnTimeout = null;

  clearRestartRequest(Player.P1);
  clearRestartRequest(Player.P2);

  if (lobby && !lobby.isHost) {
    store.isUntouched = true;
  }

  if (wasGameSynced) {
    startLocalGame(remoteRole ?? Player.P1);
    dismissPlayerSelection();
  }

  wasGameSynced = false;
}

/** Details of the received restart request. */
interface IncomingRestartRequest {
  /** Changed configuration, if any. */
  config?: GameConfig | null;
  /** Expiry date. */
  timeout: Date;
}

/** Stores the restart request made by the given player. */
function wsRestartRequest(player: Player, req: IncomingRestartRequest | null) {
  clearRestartRequest(player);
  if (req) {
    const { config } = req;
    const timeout = new Date(req.timeout).getTime();
    const received = Date.now();
    const handle = setTimeout(
      () => clearRestartRequest(player),
      timeout - received
    );
    store.restartRequests[player] = { config, handle, timeout, received };
  }
}

// Internal functions

/** Creates a new lobby object. */
function createLobby(id?: string | null): Lobby | JoiningLobby {
  if (id) {
    return {
      isHost: false,
      id,
      code: null,
    };
  }

  return {
    isHost: true,
    id: null,
    qrCode: null,
    codes: [],
  };
}

/** Attempts to join the lobby specified in the URL. */
function tryToJoin() {
  if (!document.location) {
    return null;
  }

  const url = new URL(document.location.toString());
  const lobbyId = url.searchParams.get(URL_LOBBY_PARAMETER);
  if (lobbyId) {
    store.isUntouched = false;
    connect(lobbyId);
  }
}

/** Sets `isUntouched` to after the first time game has been modified. */
function updateUntouched() {
  const unwatch = watch(store.getGame(), () => {
    store.isUntouched = false;
    unwatch();
  });
}

/** Clears restart request made by the given player. */
function clearRestartRequest(player: Player) {
  const req = store.restartRequests[player];
  if (req) {
    clearTimeout(req.handle);
  }
  store.restartRequests[player] = null;
}

/**
 * Clears the current turn timeout and returns how much time remained until
 * it would fire.
 */
function clearTurnTimeout(): number {
  if (turnTimeoutHandle === null) {
    store.turnTimeout = null;
    return 0;
  }

  const { turnTimeout } = store;
  const timeRemained = turnTimeout ? Math.max(turnTimeout - Date.now(), 0) : 0;
  clearTimeout(turnTimeoutHandle);

  timeoutRemaining = null;
  turnTimeoutHandle = null;
  store.turnTimeout = null;

  return timeRemained;
}

/**
 * Returns the amount of time the current turn should take,
 * or `0` if timer is disabled.
 */
function getTimeoutDuration(extraTime: number): number {
  const { config } = store;
  if (config.timePerTurn < TIME_PER_TURN_MIN) {
    return 0;
  }

  const AS_MS = 1000;
  const timePerTurn = config.timePerTurn * AS_MS;
  const timeCap = Math.max(timePerTurn, config.timeCap * AS_MS);
  return Math.min(extraTime + timePerTurn, timeCap);
}

/** Starts a new timeout in a local game. */
function setLocalTurnTimeout(duration: number) {
  turnTimeoutHandle = setTimeout(() => store.endTurn(null), duration);
  timeoutRemaining = null;
  store.turnTimeout = Date.now() + duration;
}

/** Stores timeout in a remote game. */
function setRemoteTurnTimeout(timeout: string) {
  const dt = store.getTimeDifference();
  const delay = store.getDelay();
  timeoutRemaining = null;
  store.turnTimeout = new Date(timeout).getTime() - delay - dt;
}

/** Pauses or unpauses turn timeout in a local game. */
function pauseLocalTurnTimeout(isPaused: boolean) {
  if (store.turnTimeout !== null && !turnTimeoutHandle) {
    return;
  }

  const { turnTimeout } = store;
  if (!isPaused && turnTimeout === null) {
    if (timeoutRemaining) {
      setLocalTurnTimeout(timeoutRemaining);
    }
  } else if (isPaused && turnTimeout !== null) {
    timeoutRemaining = clearTurnTimeout();
  }
}

/** Handles the game state. */
export const store = reactive({
  lobby: null as Lobby | JoiningLobby | null,
  isUntouched: true,
  isConnected: false,
  remoteRole: null as Player | null,
  disconnectedReason: null as DisconnectReason | null,
  disconnectedByUser: false,
  /** Current round number. */
  round: 0,
  /** Number of the last round received from the server. */
  remoteRound: 0,
  restartRequests: [null, null] as RestartRequests,

  /**
   * Indicates whether the player selection screen should be shown.
   * Does not wait for `gameUIStore` properties to update.
   *
   * For most cases, use `playerSelection` in `gameUIStore` instead.
   */
  playerSelection: PlayerSelection.Hidden,
  config: defaultConfig(),

  /** In a timed game, indicates when the turn will end automatically. */
  turnTimeout: null as number | null,

  /**
   * An estimate of the time it takes for a packet to reach the server
   * in milliseconds.
   */
  getDelay() {
    return delay;
  },

  /**
   * An estimated difference in time configuration between
   * client and server in milliseconds.
   */
  getTimeDifference() {
    return timeDifference;
  },

  getGame: function () {
    return game;
  },

  // These mutations can invoked from the UI
  connect,
  acceptPlayer,
  setPlayerCode,
  selectStartingPlayer,
  dismissPlayerSelection,
  endTurn,
  restartGame,
  respondToRestartRequest,
  disconnect,
  dismissDisconnectReason,

  // These mutations should only be invoked by the `wsController`
  wsLinkLobby,
  wsSyncLobby,
  wsSetRemoteRole,
  wsSetConfig,
  wsSetDelay,
  wsSetTimeDifference,
  wsSyncGame,
  wsPlayerSelection,
  wsRestartRequest,
  wsConnected,
  wsDisconnectReason,
  wsDisconnected,
});

tryToJoin();
updateUntouched();

watch(
  computed(() => store.lobby?.id),
  (id) => {
    const url = new URL(document.location.toString());
    if (id) {
      url.searchParams.set(URL_LOBBY_PARAMETER, id);
    } else {
      url.searchParams.delete(URL_LOBBY_PARAMETER);
    }
    window.history.replaceState(null, "", url.toString());
  }
);

{
  let lobby: Object | null = null;
  watch(store, (current) => {
    if (current.lobby !== lobby) {
      pauseLocalTurnTimeout(!!current.lobby);
    }

    lobby = current.lobby;
  });
}
