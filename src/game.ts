const FIELD_SIZE = 7;
const WIN_LENGTH = 4;

type GameField = (Player | null)[][];
type GameMatch = [[number, number], [number, number]];

function emptyField(): GameField {
  const field = new Array(FIELD_SIZE);
  for (let i = 0; i < FIELD_SIZE; i++) {
    field[i] = new Array(FIELD_SIZE).fill(null);
  }
  return field;
}

function getHorizontalAndVerticalMatches(
  matches: GameMatch[],
  field: GameField
) {
  for (let i = 0; i < FIELD_SIZE; i++) {
    let vLength = 0;
    let vLastPlayer: Player | null = null;

    let hLength = 0;
    let hLastPlayer: Player | null = null;

    for (let j = 0; j < FIELD_SIZE; j++) {
      const vPlayer = field[i][j];
      const hPlayer = field[j][i];

      if (vPlayer === vLastPlayer && vPlayer !== null) {
        vLength++;
      } else {
        if (vLength >= WIN_LENGTH) {
          matches.push([
            [i, j - vLength],
            [i, j - 1],
          ]);
        }
        vLastPlayer = vPlayer;
        vLength = vPlayer !== null ? 1 : 0;
      }

      if (hPlayer === hLastPlayer && hPlayer !== null) {
        hLength++;
      } else {
        if (hLength >= WIN_LENGTH) {
          matches.push([
            [j - hLength, i],
            [j - 1, i],
          ]);
        }
        hLastPlayer = hPlayer;
        hLength = hPlayer !== null ? 1 : 0;
      }
    }

    if (vLength >= WIN_LENGTH) {
      matches.push([
        [i, FIELD_SIZE - vLength],
        [i, FIELD_SIZE - 1],
      ]);
    }

    if (hLength >= WIN_LENGTH) {
      matches.push([
        [FIELD_SIZE - hLength, i],
        [FIELD_SIZE - 1, i],
      ]);
    }
  }
}

function getDiagonalMatches(matches: GameMatch[], field: GameField) {
  const D = FIELD_SIZE - WIN_LENGTH;
  for (let d = -D; d <= D; d++) {
    const dx = -Math.min(d, 0);
    const dy = Math.max(d, 0);

    let lastPlayer1: Player | null = null;
    let length1 = 0;

    let lastPlayer2: Player | null = null;
    let length2 = 0;

    const bMax = FIELD_SIZE - Math.abs(d);
    for (let b = 0; b < bMax; b++) {
      const player1 = field[b + dx][b + dy];
      const player2 = field[FIELD_SIZE - 1 - b - dx][b + dy];

      if (player1 === lastPlayer1 && player1 !== null) {
        length1++;
      } else {
        if (length1 >= WIN_LENGTH) {
          const x1 = b + dx - length1;
          const y1 = b + dy - length1;
          const x2 = b + dx - 1;
          const y2 = b + dy - 1;
          matches.push([
            [x1, y1],
            [x2, y2],
          ]);
        }

        lastPlayer1 = player1;
        length1 = player1 !== null ? 1 : 0;
      }

      if (player2 === lastPlayer2 && player2 !== null) {
        length2++;
      } else {
        if (length2 >= WIN_LENGTH) {
          const x1 = FIELD_SIZE + length2 - 1 - b - dx;
          const y1 = b + dy - length2;
          const x2 = FIELD_SIZE - b - dx;
          const y2 = b + dy - 1;
          matches.push([
            [x1, y1],
            [x2, y2],
          ]);
        }

        lastPlayer2 = player2;
        length2 = player2 !== null ? 1 : 0;
      }
    }

    if (length1 >= WIN_LENGTH) {
      const x1 = bMax + dx - length1;
      const y1 = bMax + dy - length1;
      const x2 = bMax + dx - 1;
      const y2 = bMax + dy - 1;
      matches.push([
        [x1, y1],
        [x2, y2],
      ]);
    }

    if (length2 >= WIN_LENGTH) {
      const x1 = FIELD_SIZE + length2 - 1 - bMax - dx;
      const y1 = bMax + dy - length2;
      const x2 = FIELD_SIZE - bMax - dx;
      const y2 = bMax + dy - 1;
      matches.push([
        [x1, y1],
        [x2, y2],
      ]);
    }
  }
}

function getResult(field: GameField): GameResult | null {
  const matches: GameMatch[] = [];

  getHorizontalAndVerticalMatches(matches, field);
  getDiagonalMatches(matches, field);

  if (matches.length > 0) {
    let winner: GameWinner | null = null;

    for (const [[x, y]] of matches) {
      const s = field[x][y];
      const isP1 = s === Player.P1;
      const isP2 = s === Player.P2;
      const p1Won = winner === GameWinner.P1;
      const p2Won = winner === GameWinner.P2;
      if ((p1Won && isP2) || (p2Won && isP1)) {
        winner = GameWinner.Draw;
        break;
      } else if (isP1) {
        winner = GameWinner.P1;
      } else if (isP2) {
        winner = GameWinner.P2;
      }
    }

    if (winner === null) {
      return null;
    }

    return { winner, matches };
  }

  return null;
}

class Game {
  static create(rules: GameRules): Game {
    const state = GameState.create(rules.startingPlayer);
    return new Game(emptyField(), state, rules);
  }

  constructor(
    public readonly field: GameField,
    public readonly state: GameState,
    public readonly rules: GameRules
  ) {}

  private updateResult(x: number, y: number) {
    const { field, state, rules } = this;
    const { turn, player } = this.state;

    let skipIncrementalCheck = false;
    if (rules.allowDraws) {
      if (turn % 2 === 0) {
        return;
      }

      if (typeof state.lastMove === "number") {
        const col = state.lastMove;
        const other = otherPlayer(player);
        for (let i = 0; i < FIELD_SIZE; i++) {
          if (field[col][i] === other) {
            skipIncrementalCheck = this.isMoveWinning(col, i, other);
            break;
          }
        }
      }
    }

    if (skipIncrementalCheck || this.isMoveWinning(x, y, player)) {
      state.gameResolved(getResult(field) as GameResult);
    } else if (this.state.turn >= FIELD_SIZE * FIELD_SIZE - 1) {
      state.gameResolved({ matches: [], winner: GameWinner.Draw });
    }
  }

  endTurn(col: number): boolean {
    const { field, state } = this;
    if (col >= field.length || state.result) {
      return false;
    }

    for (let i = FIELD_SIZE - 1; i >= 0; i--) {
      if (field[col][i] !== null) {
        continue;
      }

      field[col][i] = state.player;
      this.updateResult(col, i);
      state.nextTurn(col);

      return true;
    }

    return false;
  }

  private horizontalLength(x: number, y: number, player: Player): number {
    const { field } = this;
    let length = 1;

    for (let ix = x - 1; ix >= 0; ix--) {
      if (field[ix][y] !== player) {
        break;
      }

      length++;
    }

    for (let ix = x + 1; ix < FIELD_SIZE; ix++) {
      if (field[ix][y] !== player) {
        break;
      }

      length++;
    }

    return length;
  }

  private verticalLength(x: number, y: number, player: Player): number {
    const { field } = this;
    let length = 1;

    for (let iy = y - 1; iy >= 0; iy--) {
      if (field[x][iy] !== player) {
        break;
      }

      length++;
    }

    for (let iy = y + 1; iy < FIELD_SIZE; iy++) {
      if (field[x][iy] !== player) {
        break;
      }

      length++;
    }

    return length;
  }

  private diagonalTLBRLength(x: number, y: number, player: Player): number {
    const { field } = this;
    let length = 1;

    const d1 = Math.min(x, y);
    for (let d = 1; d <= d1; d++) {
      if (field[x - d][y - d] !== player) {
        break;
      }

      length++;
    }

    const d2 = FIELD_SIZE - Math.max(x, y);
    for (let d = 1; d < d2; d++) {
      if (field[x + d][y + d] !== player) {
        break;
      }

      length++;
    }

    return length;
  }

  private diagonalTRBLLength(x: number, y: number, player: Player): number {
    const { field } = this;
    let length = 1;

    const d1 = Math.min(FIELD_SIZE - 1 - x, y);
    for (let d = 1; d <= d1; d++) {
      if (field[x + d][y - d] !== player) {
        break;
      }

      length++;
    }

    const d2 = Math.min(x, FIELD_SIZE - 1 - y);
    for (let d = 1; d <= d2; d++) {
      if (field[x - d][y + d] !== player) {
        break;
      }

      length++;
    }

    return length;
  }

  private isMoveWinning(x: number, y: number, player: Player): boolean {
    return (
      this.horizontalLength(x, y, player) >= WIN_LENGTH ||
      this.verticalLength(x, y, player) >= WIN_LENGTH ||
      this.diagonalTLBRLength(x, y, player) >= WIN_LENGTH ||
      this.diagonalTRBLLength(x, y, player) >= WIN_LENGTH
    );
  }
}

interface GameRules {
  startingPlayer: Player;
  allowDraws: boolean;
}

enum Player {
  P1,
  P2,
}

function otherPlayer(player: Player): Player {
  return player === Player.P1 ? Player.P2 : Player.P1;
}

class GameState {
  static create(startingPlayer: Player): GameState {
    return new GameState(startingPlayer, 0, null);
  }

  constructor(
    public player: Player,
    public turn: number,
    public result: GameResult | null,
    public lastMove?: number | null
  ) {}

  nextTurn(col: number) {
    this.player = otherPlayer(this.player);
    this.turn++;
    this.lastMove = col;
  }

  gameResolved(result: GameResult) {
    this.result = result;
  }
}

interface GameResult {
  winner: GameWinner;
  matches: GameMatch[];
}

enum GameWinner {
  P1 = Player.P1,
  P2 = Player.P2,
  Draw,
}

export type { GameField, GameRules, GameResult, GameMatch };
export {
  FIELD_SIZE,
  WIN_LENGTH as WIN_LEN,
  Game,
  Player,
  GameState,
  GameWinner,
  emptyField,
  otherPlayer,
};
