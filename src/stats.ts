/** Keeps track of an average of n most recent values. */
export class Average {
  /** Sum of all values in the array. */
  private sum = 0;
  /** Amount of values stored in the array; used to populate the array. */
  private amount = 0;

  private cursor = 0;
  private values: number[];

  constructor(length: number) {
    this.values = new Array(length);
  }

  get value(): number {
    return !this.amount ? 0 : this.sum / this.amount;
  }

  add(v: number) {
    this.sum -= this.values[this.cursor] ?? 0;
    this.sum += this.values[this.cursor] = v;

    if (this.amount <= this.cursor) {
      this.amount = this.cursor + 1;
    }

    this.cursor = this.cursor === this.values.length - 1 ? 0 : this.cursor + 1;
  }

  reset() {
    this.sum = 0;
    this.amount = 0;
    this.cursor = 0;
    this.values.fill(0);
  }
}
