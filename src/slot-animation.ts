import { FIELD_SIZE } from "@/game";
import {
  BORDER_WIDTH,
  CONT_SIZE,
  FOCUS_RING_OFFSET,
  FOCUS_RING_WIDTH,
  HALF_CONT_SIZE,
} from "@/game-ui";
import { gameUIStore } from "@/game-ui-store";
import { clamp, lerp, mag, normalize } from "@/math";
import { store } from "@/store";
import { NumberTween, Tween } from "@/tween";

import { useAnimations } from "./composables/animations";
import type { ExtendedTouch } from "./extended-touch";
import { playerClass } from "@/game-ui";
import { otherPlayer } from "@/game";

const { min, floor, sqrt } = Math;

// motion
const NUDGE_MAX = 6; // px;
const NUDGE_ACCUM_SCALE = 1; // px;
const NUDGE_RET_VELOCITY = 8; // px / s
const FRICTION = 15;
const FALL_ACCELERATION = 1200; // px / (s^2)

// timing
const SLIDE_DURATION = 120; // ms
const MODE_TRANSITION = 48; // ms

// CSS classes
const ENTER_CLASS = "appear-enter-active";
const LEAVE_CLASS = "appear-leave-active";

// input
const KEYS_LEFT = ["ArrowLeft", "a"];
const KEYS_RIGHT = ["ArrowRight", "d"];
const KEYS_SUBMIT = ["Enter", " "];

enum Mode {
  Off,
  Freeform,
  Constrained,
  Locked,
  Falling,
  Inert,
}

enum Device {
  Pointer,
  Keyboard,
}

interface SlotAnimationParameters {
  el: HTMLElement;
  updateFocusVisible: (isFocusVisible: boolean) => void;
}

type PointerEventSource = MouseEvent | ExtendedTouch;

/** Contains the current cursor position. */
class PointerVector {
  x = 0; // px, X axis position

  updatePointer(src: PointerEventSource) {
    const cx = (src.target as HTMLElement).getBoundingClientRect().x;
    this.x = src.clientX - cx - HALF_CONT_SIZE;
  }
}

/** Slightly nudges the slot when the pointer is moved. */
class NudgeVector {
  x = 0; // px, X axis position
  y = 0; // px, Y axis position

  updatePointer(src: PointerEventSource) {
    const [mx, my] = normalize(src.movementX, src.movementY);

    let nx = this.x;
    let ny = this.y;

    nx += mx * NUDGE_ACCUM_SCALE;
    ny += my * NUDGE_ACCUM_SCALE;

    const m = mag(nx, ny);
    if (m > NUDGE_MAX) {
      nx *= NUDGE_MAX / m;
      ny *= NUDGE_MAX / m;
    }

    this.x = nx;
    this.y = ny;
  }

  animationFrame(secondsElapsed: number) {
    if ((this.x || this.y) === 0) {
      return;
    }

    const nx = this.x;
    const ny = this.y;
    const magnitude = mag(nx, ny);
    const retVel = secondsElapsed * NUDGE_RET_VELOCITY;
    if (magnitude < retVel) {
      this.x = 0;
      this.y = 0;
      return;
    }

    const delta = min(
      secondsElapsed * NUDGE_RET_VELOCITY,
      NUDGE_RET_VELOCITY,
      magnitude
    );

    this.x -= delta * nx;
    this.y -= delta * ny;
  }
}

/** Animates slot selection. */
class LockAnimation {
  private targetX = 0; // px, target X axis position
  private lastTargetX = 0; // px, last X axis position
  private ts1 = 0; // timestamp, animation ended

  select(col: number) {
    col = clamp(col, 0, FIELD_SIZE - 1);
    const { ts1: animatingUntil, lastTargetX: lastTx, targetX: tx } = this;
    if (col * CONT_SIZE === tx) {
      return;
    }
    const ts = performance.now();
    const millisecondsElapsed = animatingUntil - ts;
    const t = 1 - clamp(millisecondsElapsed / SLIDE_DURATION, 0, 1);
    this.lastTargetX = lerp(lastTx, tx, t);
    this.targetX = col * CONT_SIZE;
    this.ts1 = ts + SLIDE_DURATION;
  }

  complete() {
    this.ts1 = 0;
  }

  getX(ts = performance.now()): number {
    const { ts1, lastTargetX, targetX } = this;
    const t = 1 - clamp((ts1 - ts) / SLIDE_DURATION, 0, 1);
    return lerp(lastTargetX, targetX, t);
  }
}

/** Gently dissipates the velocity. */
class InertiaVector {
  x = 0; // px, X axis position
  vx = 0; // px / s, X axis velocity
  lastUpdate = 0; // timestamp

  updatePointer(src: PointerEventSource) {
    const currentUpdate = performance.now();
    const secondsElapsed = (currentUpdate - this.lastUpdate) / 1000;
    this.x = src.offsetX - HALF_CONT_SIZE;
    this.vx = src.movementX / secondsElapsed;
    this.lastUpdate = currentUpdate;
  }

  animationFrame(secondsElapsed: number) {
    const { vx } = this;
    const delta = min(secondsElapsed, 1);
    this.vx -= delta * FRICTION * vx;
    this.x += delta * this.vx;
  }
}

/** Animates the slot falling into place. */
class GravityAnimation {
  private offsetY = 0; // px, Y offset
  private targetY = 0; // px, target Y coordinate
  private ts0 = 0; // timestamp, animation started
  private ts1 = 0; // timestamp, animation end
  private t1 = 0; // s, timeline end

  fall(y: null): void;
  fall(y: number, offsetY: number): void;
  fall(y: number | null, offsetY?: number) {
    if (y === null || typeof offsetY !== "number") {
      this.complete();
      return;
    }

    const targetY = (y + 1) * CONT_SIZE + BORDER_WIDTH - offsetY;
    const ts0 = performance.now();
    const ts1 = ts0 + sqrt(targetY / FALL_ACCELERATION) * 1000;

    this.offsetY = offsetY;
    this.targetY = targetY;
    this.ts0 = ts0;
    this.ts1 = ts1;
    this.t1 = (ts1 - ts0) / 1000;
  }

  getY(ts = performance.now()) {
    const { ts0, t1, offsetY } = this;
    const t = clamp((ts - ts0) / 1000, 0, t1);
    return offsetY + FALL_ACCELERATION * t * t;
  }

  complete() {
    this.offsetY = 0;
    this.targetY = 0;
    this.ts0 = 0;
    this.ts1 = 0;
    this.t1 = 0;
  }

  isFinished(ts = performance.now()) {
    return ts >= this.ts1;
  }

  isActive() {
    return this.targetY > 0;
  }
}

export function slotAnimation({
  el,
  updateFocusVisible,
}: SlotAnimationParameters) {
  /*
   * # A bit about how this function is structured
   *
   * `slotAnimation()` is designed to work seamlessly with a variety of inputs.
   * In order to achieve that, it provides a generalized interface
   * (everything that you see returned at the bottom).
   *
   * Slot animation is based around a state machine,
   * which roughly looks like this (it starts in `Off` mode):
   *
   *   ┌────────────────────────────────────┐
   *   │             ╔═════════════╗        │
   *   │     ┌──────→╢ Constrained ╟─────→┐ │
   *   │     │       ╚═══╤════════╤╝  ╔═══╧═╧═══╗
   *   │     │           ↕        ↑   ║ Falling ║
   *   │     │       ╔═══╧════╗   │   ╚════╤════╝
   *   │     │ ┌─────╢ Locked ╟──╼┿╾──────→┘
   *   │     ↓ ↓     ╚═══╤════╝   │
   *   │   ╔═╧═╧═╗       ↑        │
   *   └──→╢ Off ║       │        │
   *       ╚═╤═╤═╝       ↓        │
   *         ↑ │     ╔═══╧══════╗ │
   *         │ └────→╢ Freeform ╟←┘
   *         │       ╚═══╤══════╝
   *      ╔══╧════╗      │
   *      ║ Inert ╟←─────┘
   *      ╚═══════╝
   *
   *
   * `setMode()` facilitates transitions between different modes.
   *
   * The position of the slot is calculated using a handful of vectors,
   * which are defined above. Each mode can define its own way to calculate the
   * position in `getVectorForMode()`. To make transitions smoother, the final
   * result is calculated using the current and last position in `getVector()`.
   *
   * A few technical details:
   *
   *  - null position is exclusive to Off mode;
   *    the code then uses the other position that's available
   *  - `setMode()` can prevent transitions for some modes
   *
   * The resulting position is then applied in `animationFrame()` function.
   *
   */

  const { requestFrame } = useAnimations();

  const vector = {
    pointer: new PointerVector(),
    inertia: new InertiaVector(),
    nudge: new NudgeVector(),
  } as const;

  const animation = {
    locked: new LockAnimation(),
    gravity: new GravityAnimation(),
    raise: new NumberTween(
      0,
      -FOCUS_RING_OFFSET - FOCUS_RING_WIDTH,
      RAISE_DURATION,
      true
    ),
  } as const;

  // Updated by `updateFocus()`
  let isFocused = false;
  let isFocusVisible = false;
  let lastEventDevice = Device.Pointer; // false - pointer, true - keyboard

  // Updated manually
  let isPointerHovering = false;
  let isPointerPressed = false;
  let isDisabled = false;
  let isInputContinuous = false;

  // Updated by `setVisible()` and `removeAnimationClasses()`
  let isTransitionForward = false;
  let isTransitionComplete = true;

  let mode = Mode.Off;
  let prevMode = Mode.Off;
  const transition = new Tween(MODE_TRANSITION);

  let col = 0;

  // Updated by `animationFrame()`
  let lastAnimationFrame = 0; // timestamp

  init();

  /** Initializes slot animation. */
  function init() {
    el.style.opacity = "0";
    el.addEventListener("animationend", removeAnimationClasses);
    el.addEventListener("animationcancel", removeAnimationClasses);
  }

  /** Removes CSS classes and event listeners. */
  function destroy() {
    el.classList.remove(ENTER_CLASS, LEAVE_CLASS);
    el.removeEventListener("animationend", removeAnimationClasses);
    el.removeEventListener("animationcancel", removeAnimationClasses);
  }

  /** Resets the animation state. */
  function reset() {
    const a = animation;
    transition.complete();
    a.locked.complete();
    a.gravity.fall(null);
  }

  /**
   * Sets the slot visibility.
   * @param isVisible - whether the slot is visible
   */
  function setVisible(isVisible: boolean) {
    if (isTransitionForward === isVisible) {
      return;
    }

    const { classList, style } = el;

    if (isVisible) {
      const player = gameUIStore.state.player;
      classList.add(playerClass(player));
      classList.remove(playerClass(otherPlayer(player)));
    }

    style.opacity = "";
    classList.toggle(ENTER_CLASS, isVisible);
    classList.toggle(LEAVE_CLASS, !isVisible);
    isTransitionForward = isVisible;
    isTransitionComplete = false;
  }

  /** Removes visibility animation classes. */
  function removeAnimationClasses() {
    if (el.classList.contains(ENTER_CLASS)) {
      el.style.opacity = "1";
      el.classList.remove(ENTER_CLASS);
    } else if (el.classList.contains(LEAVE_CLASS)) {
      el.style.opacity = "0";
      setMode(Mode.Off);
      el.classList.remove(LEAVE_CLASS);
    }

    isTransitionComplete = true;
  }

  /**
   * Determines whether or not the focus ring should be displayed.
   * Updates `focus`, `focusVisible` and `laseEventDevice`.
   *
   * @param focused - whether or not to expect keyboard input
   * @param device - source of the event
   */
  function updateFocus(focused: boolean, device = lastEventDevice) {
    const focusVisible = focused && device === Device.Keyboard;
    if (isFocusVisible !== focusVisible) {
      updateFocusVisible(focusVisible);
    }

    isFocused = focused;
    isFocusVisible = focusVisible;
    lastEventDevice = device;
  }

  /**
   * Changes the current mode and facilitate the transition.
   *
   * This method does not check whether the change is appropriate.
   *
   * Do not set the mode to `Falling` or `Locked` without ensuring that there is
   * a free column available.
   *
   * @param newMode - mode to change to
   */
  function setMode(newMode: Mode) {
    if (newMode === mode) {
      return;
    }

    prevMode = mode;
    mode = newMode;

    const a = animation;

    setVisible(mode !== Mode.Off && mode !== Mode.Inert);
    if (prevMode === Mode.Off) {
      reset();
      requestFrame(animationFrame);
    }

    if (mode === Mode.Constrained) {
      a.raise.forward();
    } else {
      a.raise.reverse();
    }

    if (
      mode === Mode.Constrained ||
      (prevMode === Mode.Freeform && mode === Mode.Locked)
    ) {
      a.raise.complete();
      a.locked.complete();
    }

    // Prevent mode transition
    if (mode === Mode.Off || mode === Mode.Inert || mode === Mode.Falling) {
      transition.complete();
      reset();
    } else {
      transition.reset();
    }

    if (mode === Mode.Falling) {
      const y = gameUIStore.getY(col) as number;
      gameUIStore.startAnimation();
      gameUIStore.playerMoved(col, y);
      store.endTurn(col);
      const startingPosition = getVectorForMode(prevMode, performance.now());
      a.gravity.fall(y, startingPosition ? startingPosition[1] : 0);
    }
  }

  /** Returns the index of the column currently being hovered over */
  function colFromPointer(): number {
    const x = vector.pointer.x + HALF_CONT_SIZE;
    return clamp(floor(x / CONT_SIZE), 0, FIELD_SIZE - 1);
  }

  /**
   * Returns the column that is nearest to the pointer position,
   * or null if there is no space left.
   */
  function getColNearest(): number | null {
    const mid = colFromPointer();
    if (gameUIStore.getY(mid) !== null) {
      return mid;
    }

    let i = 1;
    while (mid - i >= 0 || mid + i < FIELD_SIZE) {
      const left = gameUIStore.getY(mid - i);
      if (left !== null) {
        return mid - i;
      }
      const right = gameUIStore.getY(mid + i);
      if (right !== null) {
        return mid + 1;
      }

      i++;
    }

    return null;
  }

  /**
   * Returns nearest column to the left of currently selected `col`,
   * or null if there is no space to the left.
   */
  function getColLeft(): number | null {
    for (let i = col - 1; i >= 0; i--) {
      if (gameUIStore.getY(i) !== null) {
        return i;
      }
    }

    return null;
  }

  /**
   * Returns the nearest column to the right of currently selected `col`,
   * or null if there is no space to the right.
   */
  function getColRight(): number | null {
    for (let i = col + 1; i < FIELD_SIZE; i++) {
      if (gameUIStore.getY(i) !== null) {
        return i;
      }
    }

    return null;
  }

  /**
   * Updates whether the animation can expect keyboard input.
   * @param focused - whether the field is currently focused
   */
  function keyboard(focused: boolean) {
    if (isDisabled) {
      updateFocus(focused);
      return;
    }

    if (focused && (mode === Mode.Off || mode === Mode.Freeform)) {
      const newCol = getColNearest();
      if (newCol !== null) {
        col = newCol;
        animation.locked.select(col);
        setMode(Mode.Constrained);
      }
    } else if (!focused && mode === Mode.Constrained) {
      setMode(isPointerHovering ? Mode.Freeform : Mode.Off);
    }

    updateFocus(focused);
  }

  /**
   * Updates which key is being pressed.
   * @param ev - keyboard event
   */
  function keyboardKeyDown(ev: KeyboardEvent) {
    const isLeft = KEYS_LEFT.includes(ev.key);
    const isRight = KEYS_RIGHT.includes(ev.key);
    const isSubmit = !ev.repeat && KEYS_SUBMIT.includes(ev.key);

    if (isLeft || isRight) {
      keyboard(true);
    }

    updateFocus(isFocused, Device.Keyboard);

    if (mode === Mode.Falling && isSubmit) {
      animation.gravity.complete();
      return;
    }

    if (isDisabled) {
      return;
    }

    if (mode === Mode.Freeform && (isLeft || isRight || isSubmit)) {
      const newCol = getColNearest();
      if (newCol !== null) {
        col = newCol;
        animation.locked.select(col);
        setMode(Mode.Constrained);
      }
      return;
    }

    if (mode !== Mode.Constrained) {
      return;
    }

    const { locked } = animation;

    if (isLeft) {
      const newCol = getColLeft();
      if (newCol === null) {
        return;
      }

      col = newCol;
      locked.select(col);
      return;
    }

    if (isRight) {
      const newCol = getColRight();
      if (newCol === null) {
        return;
      }

      col = newCol;
      locked.select(col);
      return;
    }

    if (isSubmit && gameUIStore.hasSpaceAt(col)) {
      setMode(Mode.Falling);
    }
  }

  function keyboardKeyUp() {
    updateFocus(isFocused, Device.Keyboard);
  }

  /** Updates whether the pointer is currently on screen. */
  function pointer(isEntering: boolean) {
    if (isDisabled) {
      isPointerHovering = isEntering;
      return;
    }

    if (isEntering && (mode === Mode.Off || mode === Mode.Inert)) {
      setMode(Mode.Freeform);
    } else if (!isEntering && mode === Mode.Freeform) {
      setMode(Mode.Inert);
    } else if (!isEntering && mode === Mode.Locked) {
      setMode(Mode.Off);
    }

    isPointerHovering = isEntering;
  }

  /**
   * Updates pointer position.
   * @param src - source event
   */
  function pointerMove(src: MouseEvent | ExtendedTouch) {
    const v = vector;
    v.pointer.updatePointer(src);
    if (mode !== Mode.Falling) {
      v.nudge.updatePointer(src);
    }
    if (mode !== Mode.Inert) {
      v.inertia.updatePointer(src);
    }
  }

  /** Updates whether the pointer is currently pressed. */
  function pointerPressed(isPressed: boolean) {
    updateFocus(false, Device.Pointer);
    isPointerPressed = isPressed;

    if (isPressed && mode === Mode.Falling) {
      animation.gravity.complete();
      return;
    }

    if (isDisabled) {
      return;
    }

    if (isPressed && (mode === Mode.Freeform || mode === Mode.Constrained)) {
      const hit = colFromPointer();
      const newCol = getColNearest();
      if (hit === newCol && gameUIStore.getY(newCol) !== null) {
        col = newCol;
        animation.locked.select(newCol);
        setMode(Mode.Locked);
      }
    } else if (!isPressed && mode === Mode.Locked) {
      setMode(Mode.Falling);
    }
  }

  /**
   * Disables or reenables the field.
   *
   * Disabling the field cancels all ongoing inputs and prevents
   * it from receiving new events. This does not cancel ongoing animations, or
   * prevent the user from focusing the field.
   *
   * @param v - true if disabled
   */
  function disabled(v: boolean) {
    if (isDisabled === v) {
      return;
    }

    if (v) {
      const wasFocused = isFocused;
      pointer(false);
      keyboard(false);
      updateFocus(wasFocused);
    } else {
      pointer(isPointerHovering);
      keyboard(isFocused);
    }

    isDisabled = v;
  }

  /**
   * Indicates whether the slot should reappear immediately after the
   * falling animation has finished. When set to false, the user must
   * reenter/refocus the field to make another move.
   *
   * The argument should be false when using touch input.
   *
   * @param v - whether the current input method is continuous
   */
  function continuousInput(v: boolean) {
    isInputContinuous = v;
  }

  /** Immediately completes the falling animation. */
  function complete() {
    animation.gravity.complete();
  }

  /**
   * Returns the position in the specified mode.
   *
   * @param mode - which representation to return
   * @param ts - timestamp, in milliseconds
   */
  function getVectorForMode(mode: Mode, ts: number): [number, number] | null {
    const a = animation;
    const v = vector;
    switch (mode) {
      case Mode.Off:
        return null;
      case Mode.Freeform:
        return [v.pointer.x, v.nudge.y + a.raise.valueAsType(ts)];
      case Mode.Constrained:
        return [a.locked.getX(ts), a.raise.valueAsType(ts)];
      case Mode.Inert:
        return [v.inertia.x, v.nudge.y + a.raise.valueAsType(ts)];
      case Mode.Locked: {
        const y = v.nudge.y + a.raise.valueAsType(ts);
        return [a.locked.getX(ts) + v.nudge.x, y];
      }
      case Mode.Falling:
        return [a.locked.getX(ts) + v.nudge.x, a.gravity.getY(ts)];
    }
  }

  /**
   * Linearly interpolates two vectors.
   *
   * @param param0 - vector a
   * @param param1 - vector b
   * @param t - value between 0 and 1
   */
  function lerpVector(
    [ax, ay]: [number, number],
    [bx, by]: [number, number],
    t: number
  ): [number, number] {
    return [lerp(ax, bx, t), lerp(ay, by, t)];
  }

  /**
   * Calculates current vector position.
   * @param ts - timestamp, in milliseconds
   */
  function getVector(ts: number): [number, number] {
    let prev = getVectorForMode(prevMode, ts) as [number, number];
    let curr = getVectorForMode(mode, ts) as [number, number];

    // Only one can ever be null
    prev ??= curr;
    curr ??= prev;

    return lerpVector(prev, curr, transition.value(ts));
  }

  /**
   * Calculates and applies the position.
   * @param ts - timestamp, in milliseconds
   */
  function animationFrame(ts: number) {
    const secondsElapsed = (ts - lastAnimationFrame) / 1000;

    const a = animation;
    const v = vector;
    v.nudge.animationFrame(secondsElapsed);
    // Only simulate when needed, since there is no mode transition
    if (mode === Mode.Inert) {
      v.inertia.animationFrame(secondsElapsed);
    }

    applyTransform(ts);

    const visible = isTransitionForward || !isTransitionComplete;
    if (mode !== Mode.Off || visible || !a.gravity.isFinished(ts)) {
      requestFrame(animationFrame);
    }

    // Exit out of falling mode
    if (mode === Mode.Falling && a.gravity.isFinished(ts)) {
      // Reset state
      const submittedIn = prevMode;
      setMode(Mode.Off);
      setVisible(false);
      removeAnimationClasses();
      reset();
      // Trigger game update
      gameUIStore.stopAnimation();
      // Set mode
      if (isInputContinuous && !isDisabled) {
        setTimeout(() => {
          if (!isInputContinuous || isDisabled) {
            return;
          }

          if (submittedIn === Mode.Constrained && isFocused) {
            setMode(Mode.Constrained);
          } else if (submittedIn === Mode.Locked && isPointerHovering) {
            setMode(Mode.Freeform);
          }
        }, 0);
      }
    }

    lastAnimationFrame = ts;
  }

  function applyTransform(ts: number) {
    const [x, y] = getVector(ts);
    el.style.transform = `translate(${x}px, ${y}px)`;
  }

  return {
    keyboard,
    keyboardKeyDown,
    keyboardKeyUp,
    pointer,
    pointerMove,
    pointerPressed,
    disabled,
    continuousInput,
    complete,
    destroy,
  };
}
