import * as lines from "./lines";
import type { Line, LinearFunction } from "./lines";

const { PI, sqrt, sin, abs, atan, random } = Math;
const PI_HALF = PI / 2;
const TAU = PI * 2;

/** Returns 1 if the number is positive, -1 if it is negative or otherwise 0. */
function sign(n: number): number {
  return n < 0 ? -1 : n > 0 ? 1 : 0;
}

/** Linear interpolation. */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Clamps a number within a range of [min, max]. */
function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/** Returns the magnitude of a vector. */
function mag(x: number, y: number): number {
  return sqrt(x * x + y * y);
}

/** Returns the distance between two points. */
function dist(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return mag(dx, dy);
}

/** Returns the manhattan distance between two points. */
function mhDist(x1: number, y1: number, x2: number, y2: number): number {
  return abs(x2 - x1) + abs(y2 - y1);
}

/** Returns a normalized vector. */
function normalize(x: number, y: number, m = mag(x, y)): [number, number] {
  return m === 0 ? [0, 0] : [x / m, y / m];
}

/** Sine-based easing function. */
function easeSin(x: number): number {
  return (sin(PI_HALF + clamp(x, 0, 1) * PI) + 1) / 2;
}

/** Returns a random number within the range of [min, max). */
function randomRange(min: number, max: number): number {
  return lerp(min, max, random());
}

/** Returns the rotation of a point relative to point C. */
function rotation(
  [cx, cy]: [number, number],
  [x, y]: [number, number]
): number {
  const x1 = x - cx;
  const y1 = y - cy;
  if (x1 === 0) {
    return y1 > 0 ? PI_HALF : PI + PI_HALF;
  }

  const at = atan(y1 / x1);
  return x1 > 0 ? at : PI + at;
}

/** Returns true if two inclusive ranges overlap. */
function inclusiveRangesOverlap(
  from1: number,
  to1: number,
  from2: number,
  to2: number
): boolean {
  const halfDistance1 = (from1 + to1) / 2;
  const halfDistance2 = (from2 + to2) / 2;
  const mid1 = from1 + halfDistance1;
  const mid2 = from2 + halfDistance2;
  return abs(mid2 - mid1) <= halfDistance1 + halfDistance2;
}

/** A rectangle defined by top, bottom, left and right coordinates. */
class Rect {
  /** Creates a new `Rect` form two points. */
  static fromPoints(x1: number, y1: number, x2: number, y2: number): Rect {
    let left: number, right: number, top: number, bottom: number;

    if (x1 > x2) {
      right = x1;
      left = x2;
    } else {
      right = x2;
      left = x1;
    }

    if (y1 > y2) {
      bottom = y1;
      top = y2;
    } else {
      bottom = y2;
      top = y1;
    }

    return new Rect(left, right, top, bottom);
  }

  constructor(
    public readonly left: number,
    public readonly right: number,
    public readonly top: number,
    public readonly bottom: number
  ) {}

  /** Returns true if this `Rect` intersects other `Rect`. */
  intersects(other: Rect): boolean {
    return (
      inclusiveRangesOverlap(this.left, this.right, other.left, other.right) &&
      inclusiveRangesOverlap(this.top, this.bottom, other.top, other.bottom)
    );
  }

  /** Returns true if this `Rect` contains specified point. */
  containsPoint(x: number, y: number): boolean {
    return this.containsX(x) && y >= this.top && y <= this.bottom;
  }

  /**
   * Returns true X is contained between the left and right bound
   * of this `Rect`.
   */
  containsX(x: number): boolean {
    return x >= this.left && x <= this.right;
  }

  /** Returns true if both width and height equal 0. */
  isPoint(): boolean {
    return this.left === this.right && this.top === this.bottom;
  }
}

export type { Line, LinearFunction };
export {
  PI_HALF,
  TAU,
  sign,
  lerp,
  clamp,
  mag,
  dist,
  mhDist,
  normalize,
  easeSin,
  randomRange,
  rotation,
  inclusiveRangesOverlap,
  Rect,
  lines,
};
