import { describe, it, expect } from "vitest";
import type { GameRules } from "./game";
import { FIELD_SIZE, Game, GameWinner, Player } from "./game";

function fastForwardGame(rules: GameRules, moves: number[]): Game {
  const game = Game.create(rules);
  for (const m of moves.map((i) => i - 1)) {
    if (!game.endTurn(m)) {
      throw new Error("Fast-forward unsuccessful");
    }
  }

  return game;
}

function inGame(rules: GameRules): Game {
  return fastForwardGame(rules, [4, 5, 4, 4]);
}

function wonGameHorizontal(rules: GameRules): Game {
  return fastForwardGame(rules, [4, 4, 5, 5, 6, 6, 7]);
}

function wonGameVertical(rules: GameRules): Game {
  return fastForwardGame(rules, [4, 5, 4, 5, 4, 5, 4]);
}

function wonGameDiagonal1(rules: GameRules): Game {
  const moves = [4, 5, 5, 7, 6, 6, 6, 6, 7, 7, 7];
  return fastForwardGame(rules, moves);
}

function wonGameDiagonal2(rules: GameRules): Game {
  const moves = [4, 3, 3, 1, 2, 2, 2, 1, 1, 5, 1];
  return fastForwardGame(rules, moves);
}

function wonGame1(rules: GameRules): Game {
  const moves = [1, 2, 3, 4, 1, 2, 3, 4, 5, 5, 2, 2, 3, 4, 4, 2, 1, 3];
  return fastForwardGame(rules, moves);
}

function drawnGame(rules: GameRules): { game: Game; drawn: boolean } {
  const game = wonGameHorizontal(rules);
  const drawn = game.endTurn(6);
  return { game, drawn };
}

function filledGame(rules: GameRules) {
  const moves = [
    1, 2, 3, 4, 5, 6, 7, 1, 2, 3, 4, 5, 6, 7, 1, 2, 3, 4, 5, 6, 7, 2, 3, 4, 5,
    6, 7, 2, 3, 4, 5, 6, 7, 7, 1, 1, 2, 3, 4, 5, 6, 1, 1, 2, 3, 4, 5, 6, 7,
  ];
  return fastForwardGame(rules, moves);
}

function defaultRules(): GameRules {
  return { startingPlayer: Player.P1, allowDraws: false };
}

describe("Game", () => {
  it("ends a turn successfully", () => {
    const game = Game.create(defaultRules());
    expect(game.endTurn(3)).toBe(true);
    expect(game.state.turn).toBe(1);
    expect(game.state.player).toBe(Player.P2);
  });

  it("fails to end turn when the index is out of bounds", () => {
    const game = Game.create(defaultRules());
    expect(game.endTurn(7)).toBe(false);
  });

  it("fails to end turn when it is resolved", () => {
    const game = wonGameHorizontal(defaultRules());
    expect(game.endTurn(2)).toBe(false);
  });

  it("fails to end turn when the column is filled", () => {
    const rules = defaultRules();
    const game = Game.create(rules);
    for (let i = 0; i < FIELD_SIZE; i++) {
      game.endTurn(3);
    }
    expect(game.endTurn(3)).toBe(false);
  });

  it("is not over when the game is still in progress", () => {
    const game = inGame(defaultRules());
    expect(game.state.result).toBeFalsy();
  });

  it("is over when a match is horizontal", () => {
    const game = wonGameHorizontal(defaultRules());
    expect(game.state.result).toBeTruthy();
  });

  it("is over when a match is vertical", () => {
    const game = wonGameVertical(defaultRules());
    expect(game.state.result).toBeTruthy();
  });

  it("is over when a match is diagonal, scenario 1", () => {
    const game = wonGameDiagonal1(defaultRules());
    expect(game.state.result).toBeTruthy();
  });

  it("is over when a match is diagonal, scenario 2", () => {
    const game = wonGameDiagonal2(defaultRules());
    expect(game.state.result).toBeTruthy();
  });

  it("is over, scenario 1", () => {
    const game = wonGame1(defaultRules());
    expect(game.state.result).toBeTruthy();
  });

  it("is over when the entire board is filled", () => {
    const game = filledGame(defaultRules());
    expect(game.state.turn).toBe(49);
    expect(game.state.result).toBeTruthy();
  });

  it("does not allow draws when allowDraws rule is false", () => {
    const rules: GameRules = { startingPlayer: Player.P1, allowDraws: false };
    const { game, drawn } = drawnGame(rules);
    expect(game.state.result?.winner).toBe(GameWinner.P1);
    expect(drawn).toBe(false);
  });

  it("does allow draws when allowDraws rule is true", () => {
    const rules: GameRules = { startingPlayer: Player.P1, allowDraws: true };
    const { game, drawn } = drawnGame(rules);
    expect(game.state.result?.winner).toBe(GameWinner.Draw);
    expect(drawn).toBe(true);
  });
});
