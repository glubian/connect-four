import { PI_HALF } from "./math";

type Line = LinearFunction | number;

interface LinearFunction {
  a: number;
  b: number;
}

/** Creates a new line. */
function create(x1: number, y1: number, x2: number, y2: number): Line | null {
  if (x1 === x2) {
    if (y1 === y2) {
      return null;
    }

    return x1;
  }

  const a = (y2 - y1) / (x2 - x1);
  const b = y1 - x1 * a;
  return { a, b };
}

/**
 * Returns the X coordinate of the intersection of two lines,
 * or null there is none.
 */
function intersectX(l1: Line, l2: Line): number | null {
  const isVert1 = typeof l1 === "number";
  const isVert2 = typeof l2 === "number";
  if (isVert1 && isVert2) {
    return null;
  }

  if (isVert1) {
    return l1;
  }

  if (isVert2) {
    return l2;
  }

  return (l1.b - l2.b) / (l2.a - l1.a);
}

/** Computes the value of a linear function. */
function solveY(x: number, { a, b }: LinearFunction): number {
  return a * x + b;
}

/**
 * Returns a point in which the two lines intersect,
 * or null if there is none.
 */
function intersection(l1: Line, l2: Line): [number, number] | null {
  const interX = intersectX(l1, l2);
  if (!interX) {
    return null;
  }

  if (typeof l1 === "number") {
    const interY = solveY(interX, l2 as LinearFunction);
    return [interX, interY];
  }

  const interY = solveY(interX, l1);
  return [interX, interY];
}

/**
 * Returns the rotation of a line in radians.
 *
 * The returned value is in range of (-PI / 2, PI / 2]
 */
function rotation(l: Line): number {
  return typeof l === "number" ? PI_HALF : Math.atan(l.a);
}

export type { Line, LinearFunction };
export { create, intersectX, intersection, rotation, solveY };
