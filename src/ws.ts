import {
  Game,
  Player,
  type GameField,
  type GameRules,
  type GameState,
} from "./game";
import { store } from "./store";
import { WS_SERVER_URL } from "./urls";

interface RemoteGame {
  field: GameField;
  state: GameState;
  rules: GameRules;
}

/** A subset of `GameRules` used for starting a new game. */
export interface GameConfig {
  allowDraws: boolean;
}

export interface QR {
  img: string;
  width: number;
}

/** Reason for closing the connection. */
export type DisconnectReason = ClientDisconnectReason | ServerDisconnectReason;

/** Reason for closing the connection provided by the server. */
export enum ServerDisconnectReason {
  ServerMaxLobbies = "serverMaxLobbies",
  InviteInvalid = "inviteInvalid",
  LobbyJoinError = "lobbyJoinError",
  LobbyFull = "lobbyFull",
  LobbyClosed = "lobbyClosed",
  GameStarted = "gameStarted",
  GameEnded = "gameEnded",
  LobbyOverloaded = "lobbyOverloaded",
  ServerOverloaded = "serverOverloaded",
  ShuttingDown = "shuttingDown",
}

/** Reason for closing the connection determined by the client. */
export enum ClientDisconnectReason {
  CouldNotConnect = "couldNotConnect",
  ConnectionError = "connectionError",
  ConnectionClosed = "connectionClosed",
  Offline = "offline",
}

// Incoming messages

const LOBBY_LINK = "lobbyLink";
const LOBBY_SYNC = "lobbySync";
const LOBBY_CODE = "lobbyCode";
const GAME_ROLE = "gameRole";
const GAME_SYNC = "gameSync";
const GAME_PLAYER_SELECTION = "gamePlayerSelection";

type IncomingMessage =
  | LobbyLinkMessage
  | LobbySyncMessage
  | LobbyCodeMessage
  | GameRoleMessage
  | GameSyncMessage
  | GamePlayerSelectionMessage;

interface LobbyLinkMessage {
  type: typeof LOBBY_LINK;
  lobby: string;
  qrCode: QR;
}

interface LobbySyncMessage {
  type: typeof LOBBY_SYNC;
  players: number[];
}

interface LobbyCodeMessage {
  type: typeof LOBBY_CODE;
  code: number;
}

interface GameRoleMessage {
  type: typeof GAME_ROLE;
  role: Player;
}

interface GameSyncMessage {
  type: typeof GAME_SYNC;
  game: RemoteGame;
  round: number;
}

interface GamePlayerSelectionMessage {
  type: typeof GAME_PLAYER_SELECTION;
  p1Voted: boolean;
  p2Voted: boolean;
}

// Outgoing messages

const LOBBY_PICK_PLAYER = "lobbyPickPlayer";
const GAME_PLAYER_SELECTION_VOTE = "gamePlayerSelectionVote";
const GAME_END_TURN = "gameEndTurn";
const GAME_RESTART = "gameRestart";

interface LobbyPickPlayerMessage {
  type: typeof LOBBY_PICK_PLAYER;
  code: number;
  role: Player;
  game?: RemoteGame | null;
  config: GameConfig;
  round: number;
}

interface GamePlayerSelectionVoteMessage {
  type: typeof GAME_PLAYER_SELECTION_VOTE;
  wantsToStart: boolean;
}

interface GameEndTurnMessage {
  type: typeof GAME_END_TURN;
  turn: number;
  col: number;
}

interface GameRestartMessage {
  type: typeof GAME_RESTART;
}

/** Manages communication with the server. */
export default class WebSocketController {
  /** Current connection. */
  private socket: WebSocket | null = null;

  /** Whether the client entered a game. */
  private inGame = false;

  /** True if a connection was successfully opened. */
  private connectionEstablished = false;

  /**
   * Connects to the server if not already connected.
   * @param id - lobby to connect to
   */
  connect(id?: string | null): void {
    if (this.socket) {
      return;
    }

    const url = new URL(WS_SERVER_URL);
    if (id) {
      url.searchParams.set("lobby", id);
    }

    const socket = new WebSocket(url);
    socket.addEventListener("open", this.onOpen);
    socket.addEventListener("message", this.onMessage);
    socket.addEventListener("close", this.onClose);
    this.socket = socket;
  }

  /** Closes the connection. */
  disconnect() {
    if (!this.socket) {
      return;
    }

    this.socket.close();
  }

  private onOpen = () => {
    store.wsConnected();
    this.connectionEstablished = true;
  };

  private onMessage = (ev: MessageEvent) => {
    let msg: IncomingMessage;
    try {
      msg = JSON.parse(ev.data);
    } catch (e) {
      return;
    }

    if (!("type" in msg)) {
      return;
    }

    switch (msg.type) {
      case LOBBY_LINK: {
        if (store.lobby && store.lobby.isHost) {
          const { lobby, qrCode } = msg;
          store.wsLinkLobby(lobby, qrCode);
        }
        return;
      }
      case LOBBY_SYNC: {
        if (store.lobby && store.lobby.isHost) {
          store.wsSyncLobby(msg.players);
        }
        return;
      }
      case LOBBY_CODE: {
        if (store.lobby && !store.lobby.isHost) {
          store.setPlayerCode(msg.code);
        }
        return;
      }
      case GAME_ROLE: {
        store.wsGameRole(msg.role);
        return;
      }
      case GAME_SYNC: {
        this.inGame = true;
        const {
          round,
          game: { field, state, rules },
        } = msg;
        store.wsSyncGame(new Game(field, state, rules), round);
        return;
      }
      case GAME_PLAYER_SELECTION: {
        this.inGame = true;
        const { p1Voted, p2Voted } = msg;
        store.wsPlayerSelection(p1Voted, p2Voted);
      }
    }
  };

  private onClose = (ev: CloseEvent) => {
    this.socket = null;
    this.inGame = false;
    if (!store.disconnectedReason) {
      if (ev.reason) {
        store.wsDisconnectReason(ev.reason as ServerDisconnectReason);
      } else if (ev.wasClean) {
        store.wsDisconnectReason(ClientDisconnectReason.ConnectionClosed);
      } else if (navigator.onLine && this.connectionEstablished) {
        store.wsDisconnectReason(ClientDisconnectReason.ConnectionError);
      } else if (navigator.onLine) {
        store.wsDisconnectReason(ClientDisconnectReason.CouldNotConnect);
      } else {
        store.wsDisconnectReason(ClientDisconnectReason.Offline);
      }
    }
    this.connectionEstablished = false;
    store.wsDisconnected();
  };

  /** Sends `LobbyPickPlayerMessage`. */
  pickPlayer(
    code: number,
    role: Player,
    game: Game,
    config: GameConfig,
    round: number
  ) {
    if (!this.socket || this.inGame) {
      return;
    }

    const msg: LobbyPickPlayerMessage = {
      type: LOBBY_PICK_PLAYER,
      code,
      role,
      game,
      config,
      round,
    };
    const textMsg = JSON.stringify(msg);
    this.socket.send(textMsg);
  }

  /** Sends `GamePlayerSelectionVoteMessage`. */
  selectStartingPlayer(wantsToStart: boolean) {
    if (!(this.socket && this.inGame)) {
      return;
    }

    const msg: GamePlayerSelectionVoteMessage = {
      type: GAME_PLAYER_SELECTION_VOTE,
      wantsToStart,
    };
    this.socket.send(JSON.stringify(msg));
  }

  /** Sends `GameEndTurnMessage`. */
  endTurn(turn: number, col: number) {
    if (!(this.socket && this.inGame)) {
      return;
    }

    const msg: GameEndTurnMessage = {
      type: GAME_END_TURN,
      turn,
      col,
    };
    this.socket.send(JSON.stringify(msg));
  }

  /** Sends `GameRestartMessage`. */
  restartGame() {
    if (!(this.socket && this.inGame)) {
      return;
    }

    const msg: GameRestartMessage = { type: GAME_RESTART };
    this.socket.send(JSON.stringify(msg));
  }
}
