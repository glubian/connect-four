import { clamp, lerp } from "./math";

export class Tween {
  private timestamp = 0;

  constructor(public readonly duration: number, public isReversed = false) {}

  forward(timestamp = performance.now()): this {
    if (!this.isReversed) {
      return this;
    }

    this.timestamp = timestamp - this.duration * (1 - this.rawValue(timestamp));
    this.isReversed = false;
    return this;
  }

  reverse(timestamp = performance.now()): this {
    if (this.isReversed) {
      return this;
    }

    this.timestamp = timestamp - this.duration * (1 - this.rawValue(timestamp));
    this.isReversed = true;
    return this;
  }

  reset(timestamp = performance.now()): this {
    this.timestamp = timestamp;
    return this;
  }

  complete(): this {
    this.timestamp = 0;
    return this;
  }

  isComplete(timestamp = performance.now()): boolean {
    return this.timestamp + this.duration <= timestamp;
  }

  rawValue(timestamp = performance.now()): number {
    return clamp((timestamp - this.timestamp) / this.duration, 0, 1);
  }

  value(timestamp = performance.now()): number {
    const v = this.rawValue(timestamp);
    return this.isReversed ? 1 - v : v;
  }
}

export class NumberTween extends Tween {
  constructor(
    protected from: number,
    protected to: number,
    duration: number,
    isReversed = false
  ) {
    super(duration, isReversed);
  }

  rawValueAsType(timestamp = performance.now()): number {
    return lerp(this.from, this.to, super.rawValue(timestamp));
  }

  valueAsType(timestamp = performance.now()): number {
    return lerp(this.from, this.to, super.value(timestamp));
  }
}
