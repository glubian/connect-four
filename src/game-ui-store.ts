import { reactive, watch } from "vue";
import type { GameResult, GameRules, Player } from "./game";
import { FIELD_SIZE, GameState, otherPlayer } from "./game";
import { PlayerSelection, store } from "./store";

const gameRef = store.getGame();
let isAnimating = false;

const HIDE_REQUEST_STATUS_DURATION = 5000; // ms
let hideRequestStatusHandle: ReturnType<typeof setTimeout> | null = null;

interface GameUILastMove {
  index: [number, number];
  player: Player;
}

/**
 * Returns whether there is space available at a given column index.
 * @param col - column index
 */
function hasSpaceAt(col: number): boolean {
  const game = gameRef.value;
  return !game.state.result && game.field[col][0] === null;
}

/**
 * Returns Y coordinate of the first empty space in the column,
 * or null if there is none left.
 * @param col - column index
 */
function getY(col: number): number | null {
  const game = gameRef.value;
  if (game.state.result || col < 0 || col >= FIELD_SIZE) {
    return null;
  }

  for (let i = FIELD_SIZE - 1; i >= 0; i--) {
    if (game.field[col][i] === null) {
      return i;
    }
  }

  return null;
}

/**
 * Returns the coordinates of the most recent move
 * and the player who made the move.
 */
function getLastMove(): GameUILastMove | null {
  const game = gameRef.value;
  const { lastMove: x } = game.state;
  if (typeof x !== "number") {
    return null;
  }

  const player = otherPlayer(game.state.player);
  for (let y = 0; y < FIELD_SIZE; y++) {
    if (game.field[x][y] === player) {
      return { index: [x, y], player };
    }
  }

  return null;
}

/**
 * Commits pending changes to the `gameUIStore.field` and returns a
 * list of changed indices.
 */
function syncField(): [number, number][] {
  const changes: [number, number][] = [];
  const { field } = gameRef.value;

  for (let x = 0; x < FIELD_SIZE; x++) {
    for (let y = 0; y < FIELD_SIZE; y++) {
      if (gameUIStore.field[x][y] !== field[x][y]) {
        gameUIStore.field[x][y] = field[x][y];
        changes.push([x, y]);
      }
    }
  }

  return changes;
}

/** Updates UI properties to reflect the most recent changes. */
function sync() {
  if (isAnimating) {
    return;
  }

  const game = gameRef.value;
  gameUIStore.delta = syncField();
  gameUIStore.state = cloneState(game.state);
  gameUIStore.rules = { ...gameRef.value.rules };
  gameUIStore.lastMove = getLastMove();
  gameUIStore.round = store.round;

  // Allow player selection to be hidden, since all changes are committed.
  gameUIStore.playerSelection = store.playerSelection;

  gameUIStore.lockField = false;

  if (game.state.result) {
    showRequestStatus(false);
  }
}

/** Updates the coordinates of the most recent move made by a local player. */
function playerMoved(x: number, y: number) {
  gameUIStore.playerMove = [x, y];
}

/** Signals the start of an animation and pauses any UI updates. */
function startAnimation() {
  isAnimating = true;
}

/** Signals the end of an animation and updates UI. */
function stopAnimation() {
  if (!isAnimating) {
    return;
  }

  isAnimating = false;
  sync();

  // After the animation finishes, the most recent move cannot be null.
  const { field, state, playerMove } = gameUIStore;
  if (playerMove) {
    const [x, y] = playerMove;
    if (field[x][y] === null) {
      field[x][y] = state.player;
      gameUIStore.lockField = true;
    }
  }
}

/** Returns a copy of `GameResult`. */
function cloneResult({ winner, matches }: GameResult): GameResult {
  return {
    winner,
    matches: Array.from(matches, ([[x1, y1], [x2, y2]]) => [
      [x1, y1],
      [x2, y2],
    ]),
  };
}

/** Returns a copy of `GameState`. */
function cloneState(state: GameState): GameState {
  const { player, turn, moves, result, lastMove } = state;
  return new GameState(
    player,
    turn,
    moves,
    result && cloneResult(result),
    lastMove
  );
}

/** Shows or temporarily hides request status. */
function showRequestStatus(show: boolean) {
  if (hideRequestStatusHandle !== null) {
    clearTimeout(hideRequestStatusHandle);
  }

  if (!show) {
    hideRequestStatusHandle = setTimeout(
      () => showRequestStatus(true),
      HIDE_REQUEST_STATUS_DURATION
    );
  }

  gameUIStore.hideRequestStatus = !show;
}

/** Handles UI-specific game state. */
export const gameUIStore = reactive({
  field: Array.from(gameRef.value.field, (col) => Array.from(col)),
  delta: [] as [number, number][],
  state: cloneState(gameRef.value.state),
  rules: { ...gameRef.value.rules } as GameRules,

  lastMove: null as GameUILastMove | null,
  playerMove: null as [number, number] | null,
  round: 0,

  /** Indicates whether the game is waiting for the field to be updated. */
  lockField: false,

  /**
   * Indicates whether the player selection screen should be shown.
   *
   * Delays showing the game screen until after the changes in `store` have
   * propagated to `gameUIStore` to prevent content flash.
   */
  playerSelection: store.playerSelection,

  /**
   * Whether the request status should be shown instead of
   * game over message.
   */
  hideRequestStatus: false,

  hasSpaceAt,
  getY,

  playerMoved,
  startAnimation,
  stopAnimation,
});

watch(gameRef, sync);
watch(store, ({ round, playerSelection, isConnected }) => {
  if (round !== gameUIStore.round) {
    sync();
  }

  // Update instantly only when player selection should be shown.
  if (!isConnected || playerSelection !== PlayerSelection.Hidden) {
    gameUIStore.playerSelection = playerSelection;
  }
});
