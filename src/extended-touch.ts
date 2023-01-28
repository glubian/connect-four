interface Movement {
  movementX: number;
  movementY: number;
}

interface Offset {
  offsetX: number;
  offsetY: number;
}

interface Context {
  rect: DOMRect;
  prevTouch?: Touch | null;
}

/**
 * Touch, but with added offset and movement properties
 * similar to ones in MouseEvent
 */
type ExtendedTouch = Touch & Offset & Movement;

/**
 * Adds offset and movement properties to @param {touch}.
 * If no previous touch is available, movement properties will be set to 0.
 * @param touch - current Touch object
 * @param ctx - target DOMRect and previous Touch object, if available
 */
function extendTouch(
  touch: Touch & Partial<Offset & Movement>,
  ctx: Context
): ExtendedTouch {
  if (ctx.prevTouch) {
    const { prevTouch } = ctx;
    touch.movementX = touch.clientX - prevTouch.clientX;
    touch.movementY = touch.clientY - prevTouch.clientY;
  } else {
    touch.movementX = 0;
    touch.movementY = 0;
  }

  const { x, y } = ctx.rect;
  touch.offsetX = touch.clientX - x;
  touch.offsetY = touch.clientY - y;

  return touch as ExtendedTouch;
}

export type { ExtendedTouch };
export { extendTouch };
