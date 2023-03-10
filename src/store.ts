import { computed, reactive, shallowRef, triggerRef, watch } from "vue";
import { Game, otherPlayer, Player, type GameRules } from "./game";
import { URL_LOBBY_PARAMETER } from "./urls";
import type { DisconnectReason, QR } from "./ws";
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

function defaultRules(): GameRules {
  return {
    allowDraws: true,
    startingPlayer: Player.P1,
  };
}

/** Creates `GameRules` with the other player starting the game. */
function changeStartingPlayer(): GameRules {
  const prevRules = game.value.rules;
  return {
    ...prevRules,
    startingPlayer: otherPlayer(prevRules.startingPlayer),
  };
}

const wsController = new WebSocketController();
const game = shallowRef(Game.create(defaultRules()));
let wasGameSynced = false;

// Mutations that can be invoked by the UI

/**
 * Connects to a WebSocket server. If no lobby is specified,
 * a new one will be created.
 */
function connect(lobbyId?: string | null) {
  if (!store.isConnected) {
    wsController.connect(lobbyId);
    store.lobby = createLobby(lobbyId);
    store.disconnectedReason = null;
    store.disconnectedByUser = false;
  }
}

/** Accepts the player with specified code and assigns them a role. */
function acceptPlayer(code: number, role: Player) {
  if (store.lobby && store.lobby.isHost) {
    wsController.pickPlayer(code, role, game.value, store.round);
    store.remoteRole = otherPlayer(role);
  }
}

/** Sets the player code, when a player is trying to join a lobby. */
function setPlayerCode(code: number | null) {
  if (store.lobby && !store.lobby.isHost) {
    store.lobby.code = code;
  }
}

/** Makes a move and ends turn. */
function endTurn(col: number) {
  const { state } = game.value;
  if (store.lobby || state.result) {
    return;
  }

  if (store.isConnected) {
    wsController.endTurn(state.turn, col);
  } else {
    game.value.endTurn(col);
    triggerRef(game);
  }
}

/** Restarts the game. */
function restartGame(rules?: GameRules) {
  if (store.lobby) {
    return;
  }

  if (store.isConnected) {
    wsController.restartGame();
  } else {
    game.value = Game.create(rules ?? changeStartingPlayer());
    store.round++;
  }
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

/** Updates remote `Game` role. */
function wsGameRole(role: Player) {
  store.remoteRole = role;
}

/** Updates `Game` and round. */
function wsSyncGame(g: Game, round: number) {
  wasGameSynced = true;
  game.value = g;
  store.round = round;
  store.lobby = null;
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
  store.isConnected = false;
  store.lobby = null;
  store.remoteRole = null;

  if (wasGameSynced) {
    restartGame(defaultRules());
  }

  wasGameSynced = false;
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

/** Handles the game state. */
export const store = reactive({
  lobby: null as Lobby | JoiningLobby | null,
  isUntouched: true,
  isConnected: false,
  remoteRole: null as Player | null,
  disconnectedReason: null as DisconnectReason | null,
  disconnectedByUser: false,
  round: 0,

  getGame: function () {
    return game;
  },

  // These mutations can invoked from the UI
  connect,
  acceptPlayer,
  setPlayerCode,
  endTurn,
  restartGame,
  disconnect,
  dismissDisconnectReason,

  // These mutations should only be invoked by the `wsController`
  wsLinkLobby,
  wsSyncLobby,
  wsGameRole,
  wsSyncGame,
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
