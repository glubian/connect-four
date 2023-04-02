import {
  Game,
  Player,
  type GameField,
  type GameRules,
  type GameState,
} from "./game";
import { store } from "./store";
import { WS_SERVER_URL } from "./urls";
import { Average } from "@/stats";

interface RemoteGame {
  field: GameField;
  state: GameState;
  rules: GameRules;
}

/** Heartbeat interval in milliseconds. */
const HEARTBEAT_INTERVAL = 2000; // ms
const DELAY_AVERAGE = 10;
const TIME_DIFFERENCE_AVG = 3;

/** A subset of `GameRules` used for starting a new game. */
export interface GameConfig {
  timePerTurn: number; // s
  timeCap: number; // s
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
const GAME_SETUP = "gameSetup";
const GAME_SYNC = "gameSync";
const GAME_PLAYER_SELECTION = "gamePlayerSelection";
const GAME_RESTART_REQUEST = "gameRestartRequest";
const PONG = "pong";

type IncomingMessage =
  | LobbyLinkMessage
  | LobbySyncMessage
  | LobbyCodeMessage
  | GameSetupMessage
  | GameSyncMessage
  | GamePlayerSelectionMessage
  | GameRestartRequestMessage
  | Pong;

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

interface GameSetupMessage {
  type: typeof GAME_SETUP;
  role?: Player | null;
  config?: GameConfig | null;
}

interface GameSyncMessage {
  type: typeof GAME_SYNC;
  game: RemoteGame;
  round: number;
  timeout?: string | null;
}

interface GamePlayerSelectionMessage {
  type: typeof GAME_PLAYER_SELECTION;
  p1Voted: boolean;
  p2Voted: boolean;
}

interface GameRestartRequestMessage {
  type: typeof GAME_RESTART_REQUEST;
  player: Player;
  req?: {
    config?: GameConfig | null;
    timeout: string;
  } | null;
}

interface Pong {
  type: typeof PONG;
  sent: number;
  received: string;
}

// Outgoing messages

const LOBBY_PICK_PLAYER = "lobbyPickPlayer";
const GAME_PLAYER_SELECTION_VOTE = "gamePlayerSelectionVote";
const GAME_END_TURN = "gameEndTurn";
const GAME_RESTART = "gameRestart";
const GAME_RESTART_RESPONSE = "gameRestartResponse";
const PING = "ping";

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
  col?: number | null;
}

interface GameRestartMessage extends Partial<GameConfig> {
  type: typeof GAME_RESTART;
}

interface GameRestartResponseMessage {
  type: typeof GAME_RESTART_RESPONSE;
  accepted: boolean;
}

interface Ping {
  type: typeof PING;
  sent: number;
}

/** Manages communication with the server. */
export default class WebSocketController {
  /** Current connection. */
  private socket: WebSocket | null = null;

  /** Whether the client entered a game. */
  private inGame = false;

  /** True if a connection was successfully opened. */
  private connectionEstablished = false;

  /** Used to disable pinging. */
  private heartbeatHandle: ReturnType<typeof setInterval> | null = null;

  /**
   * An estimate of the time it takes for a packet to reach the server
   * in milliseconds.
   */
  private readonly timeDifferenceAvg = new Average(TIME_DIFFERENCE_AVG);

  /**
   * An estimated difference in time configuration between
   * client and server in milliseconds.
   */
  private readonly delayAvg = new Average(DELAY_AVERAGE);

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
    this.heartbeatHandle = setInterval(this.ping, HEARTBEAT_INTERVAL);
    this.timeDifferenceAvg.reset();
    this.delayAvg.reset();
    this.ping();
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
      case GAME_SETUP: {
        const { role, config } = msg;
        if (typeof role === "number") {
          store.wsSetRemoteRole(role);
        }
        if (config) {
          store.wsSetConfig(config);
        }
        return;
      }
      case GAME_SYNC: {
        this.inGame = true;
        const {
          round,
          game: { field, state, rules },
          timeout,
        } = msg;
        store.wsSyncGame(new Game(field, state, rules), round, timeout);
        return;
      }
      case GAME_PLAYER_SELECTION: {
        this.inGame = true;
        const { p1Voted, p2Voted } = msg;
        store.wsPlayerSelection(p1Voted, p2Voted);
        return;
      }
      case GAME_RESTART_REQUEST: {
        this.inGame = true;
        const { player, req } = msg;
        if (req) {
          const { config } = req;
          const timeout = new Date(req.timeout);
          store.wsRestartRequest(player, { config, timeout });
        } else {
          store.wsRestartRequest(player, null);
        }
        return;
      }
      case PONG: {
        const { delayAvg: delayEstimate } = this;
        if (!delayEstimate) {
          return;
        }

        const { sent } = msg;
        const received = new Date(msg.received).getTime();
        const now = Date.now();
        const timeDiff = received - sent;
        const millisecondsElapsed = now - sent;

        delayEstimate.add(millisecondsElapsed);
        store.wsSetDelay(delayEstimate.value);

        if (timeDiff >= 0 && timeDiff < millisecondsElapsed) {
          /*
           * `received` timestamp is within expected range,
           * time difference is negligible
           */
          this.timeDifferenceAvg.add(0);
          store.wsSetTimeDifference(0);
        } else {
          /* There is a significant time difference. */
          this.timeDifferenceAvg.add(timeDiff);
          store.wsSetTimeDifference(this.timeDifferenceAvg.value);
        }

        return;
      }
    }
  };

  private onClose = (ev: CloseEvent) => {
    this.socket = null;
    this.inGame = false;
    this.timeDifferenceAvg.reset();
    this.delayAvg.reset();
    if (this.heartbeatHandle !== null) {
      clearInterval(this.heartbeatHandle);
      this.heartbeatHandle = null;
    }

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
    game: Game | null,
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
  endTurn(turn: number, col: number | null) {
    if (!(this.socket && this.inGame)) {
      return;
    }

    const msg: GameEndTurnMessage = {
      type: GAME_END_TURN,
      turn,
      col: col ?? void 0,
    };
    this.socket.send(JSON.stringify(msg));
  }

  /** Sends `GameRestartMessage`. */
  restartGame(config?: GameConfig) {
    if (!(this.socket && this.inGame)) {
      return;
    }

    const msg: GameRestartMessage = config
      ? { type: GAME_RESTART, ...config }
      : { type: GAME_RESTART };
    this.socket.send(JSON.stringify(msg));
  }

  /** Sends `GameRestartResponseMessage`. */
  respondToRestartRequest(accepted: boolean) {
    if (!(this.socket && this.inGame)) {
      return;
    }

    const msg: GameRestartResponseMessage = {
      type: GAME_RESTART_RESPONSE,
      accepted,
    };
    this.socket.send(JSON.stringify(msg));
  }

  /** Pings the server. */
  private ping = () => {
    if (!this.socket) {
      return;
    }

    const msg: Ping = { type: PING, sent: Date.now() };
    this.socket.send(JSON.stringify(msg));
  };
}
