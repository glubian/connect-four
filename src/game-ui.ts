import { FIELD_SIZE, GameWinner, Player } from "./game";

export const BORDER_WIDTH = 2; // px
export const PADDING = 8; // px
export const SPACING = PADDING * 2; // px
export const SIZE = 32; // px
export const CONT_SIZE = SIZE + SPACING; // px
export const HALF_CONT_SIZE = CONT_SIZE / 2; // px
export const FIELD_SIZE_UI = FIELD_SIZE * CONT_SIZE; // px

export type PlayerClass = "p1" | "p2";

export function playerClass(player: Player | null): PlayerClass | "" {
  switch (player) {
    case Player.P1:
      return "p1";
    case Player.P2:
      return "p2";
  }

  return "";
}
