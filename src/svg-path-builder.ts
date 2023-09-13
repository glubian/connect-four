/** A class for building SVG paths */
export default class SVGPathBuilder {
  /** Path buffer */
  private path = "";

  /** Creates a new builder in absolute mode. */
  static absolute(): SVGPathBuilder {
    return new SVGPathBuilder(true);
  }

  /** Creates a new builder in relative mode. */
  static relative(): SVGPathBuilder {
    return new SVGPathBuilder(false);
  }

  private constructor(private isAbsolute: boolean) {}

  /**
   * Switches to absolute mode. Coordinates passed to subsequent method calls
   * will be interpreted as absolute.
   */
  absolute(): this {
    this.isAbsolute = true;
    return this;
  }

  /**
   * Switches to relative mode. Coordinates passed to subsequent method calls
   * will be interpreted as relative to last position.
   */
  relative(): this {
    this.isAbsolute = false;
    return this;
  }

  /**
   * Moves the cursor to the specified position.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths#line_commands}
   */
  moveTo(x: number, y: number): this {
    this.path += `${this.isAbsolute ? "M" : "m"}${x} ${y}`;
    return this;
  }

  /**
   * Draws a line to the specified position.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths#line_commands}
   */
  lineTo(x: number, y: number): this {
    this.path += `${this.isAbsolute ? "L" : "l"}${x} ${y}`;
    return this;
  }

  /**
   * Draws a horizontal line to a specified coordinate.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths#line_commands}
   */
  horizontalTo(x: number): this {
    this.path += `${this.isAbsolute ? "H" : "h"}${x}`;
    return this;
  }

  /**
   * Draws a vertical line to a specified coordinate.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths#line_commands}
   */
  verticalTo(y: number): this {
    this.path += `${this.isAbsolute ? "V" : "v"}${y}`;
    return this;
  }

  /**
   * Draws a quadratic Bézier curve to the specified position.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths#b%C3%A9zier_curves}
   */
  quadBezierTo(x1: number, y1: number, x: number, y: number): this {
    this.path += `${this.isAbsolute ? "Q" : "q"}${x1} ${y1} ${x} ${y}`;
    return this;
  }

  /**
   * Draws a cubic Bézier curve to the specified position.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths#b%C3%A9zier_curves}
   */
  cubicBezierTo(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x: number,
    y: number
  ): this {
    const command = this.isAbsolute ? "C" : "c";
    this.path += `${command}${x1} ${y1} ${x2} ${y2} ${x} ${y}`;
    return this;
  }

  /**
   * Continues a quadratic Bézier curve, keeping the slope constant.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths#b%C3%A9zier_curves}
   */
  extendBezierTo(x: number, y: number): this;
  /**
   * Continues a cubic Bézier curve, keeping the slope constant.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths#b%C3%A9zier_curves}
   */
  extendBezierTo(x2: number, y2: number, x: number, y: number): this;
  /**
   * Continues a Bézier curve. The type of the curve is determined by
   * the amount of arguments supplied.
   */
  extendBezierTo(xOrX2: number, yOrY2: number, x?: number, y?: number): this {
    if (x === void 0) {
      this.path += `${this.isAbsolute ? "T" : "t"}${xOrX2} ${yOrY2}`;
    } else {
      this.path += `${this.isAbsolute ? "S" : "s"}${xOrX2} ${yOrY2} ${x} ${y}`;
    }
    return this;
  }

  /**
   * Draws a line from the current position back to the first point of the path.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths#arcs}
   */
  closePath(): this {
    this.path += "Z";
    return this;
  }

  /**
   * Draws an arc at the specified position.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths#arcs}
   */
  arcTo(
    rx: number,
    ry: number,
    xRot: number,
    largeArc: boolean,
    sweep: boolean,
    x: number,
    y: number
  ): this {
    const command = this.isAbsolute ? "A" : "a";
    this.path += `${command}${rx} ${ry} ${xRot} ${+largeArc} ${+sweep} ${x} ${y}`;
    return this;
  }

  /** Returns the complete path. */
  finish(): string {
    return this.path;
  }

  get [Symbol.toStringTag](): string {
    return "SVGPathBuilder";
  }
}
