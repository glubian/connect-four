import { FIELD_SIZE, otherPlayer } from "@/game";
import {
  BORDER_WIDTH,
  CONT_SIZE,
  FIELD_SIZE_UI,
  FOCUS_RING_OFFSET,
  FOCUS_RING_WIDTH,
  HALF_CONT_SIZE,
  MODE_TRANSITION_MAX,
  MODE_TRANSITION_MIN,
  RAISE_DURATION,
  SIZE,
  playerClass,
} from "@/game-ui";
import { gameUIStore } from "@/game-ui-store";
import { clamp, lerp, mag, normalize, sign } from "@/math";
import { store } from "@/store";
import { NumberTween, Tween } from "@/tween";
import { useAnimations } from "./composables/animations";
import type { ExtendedTouch } from "./extended-touch";

const { abs, min, floor, sqrt } = Math;

// motion
const NUDGE_MAX = 6; // px;
const NUDGE_ACCUM_SCALE = 1; // px;
const NUDGE_RET_VELOCITY = 8; // px / s
const FRICTION = 15;
const FALL_ACCELERATION = 1200; // px / (s^2)
const MODE_WARP_DISTANCE = CONT_SIZE * 2.5; // px
const MODE_LERP_DISTANCE = CONT_SIZE * 2; // px
const HALF_MODE_WARP_DISTANCE = MODE_WARP_DISTANCE / 2; // px
const MODE_DISTANCE_DIFF = MODE_WARP_DISTANCE - MODE_LERP_DISTANCE; // px
const MODE_VELOCITY = (1000 * MODE_LERP_DISTANCE) / MODE_TRANSITION_MAX; // px / s
const MODE_SHRINK = 8; // px

// timing
const SLIDE_DURATION = 120; // ms

// CSS classes
const ENTER_CLASS = "appear-enter-active";
const LEAVE_CLASS = "appear-leave-active";

// input
const KEYS_LEFT = ["ArrowLeft", "a"];
const KEYS_RIGHT = ["ArrowRight", "d"];
const KEYS_SUBMIT = ["Enter", " "];

enum Mode {
  Off,
  Hint,
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
  /** Element to control. */
  el: HTMLElement;
  /** Called when element becomes visible or completely hidden. */
  updateVisible?: (isVisible: boolean) => void;
  /**
   * Called when the appearance changes, with coordinates of the top left
   * corner of `el` as well as the current size and opacity.
   */
  updateStyles?: (x: number, y: number, size: number, opacity: number) => void;
  /** Called when the hint should be shown or hidden. */
  updateHint?: (isVisible: boolean) => void;
  /** Called when focus ring is shown or hidden. */
  updateFocusVisible?: (isFocusVisible: boolean) => void;
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

/**
 * Keeps track of chip position and styles as well as transitioning
 * between modes.
 */
class ChipTransition {
  private readonly tween = new Tween(MODE_TRANSITION_MIN).complete();
  private direction = 0; // px
  private value = MODE_WARP_DISTANCE; // px
  private frames = 0;
  private isComplete = true;

  opacity = 1; // <0, 1>
  size = SIZE; // px

  constructor(public x: number /* px */, public y: number /* px */) {}

  private setPosition(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  /** Updates styles. */
  animationFrame(
    curr: [number, number],
    prev: [number, number],
    ts: number,
    secondsElapsed: number
  ) {
    const { value, direction, frames, tween, isComplete } = this;
    if (isComplete) {
      const [x, y] = curr;
      this.setPosition(x, y);
      return;
    }

    if (value === MODE_WARP_DISTANCE && tween.isComplete(ts)) {
      this.complete(curr);
      return;
    }

    const [currX, currY] = curr;
    const [prevX, prevY] = prev;
    const distance = currX - prevX;
    if (distance < 0 !== direction < 0) {
      if (frames === 0) {
        // sometimes the cursor can move slightly in the other direction
        // before the first frame is rendered and cause the animation to be
        // cancelled prematurely
        this.reset(curr, prev, ts);
      } else {
        this.complete(curr);
        return;
      }
    }

    const distanceToTraverse = min(MODE_WARP_DISTANCE, abs(distance));
    const threshold = distanceToTraverse / 2;
    const tweenValue = tween.value(ts);

    let newValue = value + MODE_VELOCITY * secondsElapsed;
    if (value < HALF_MODE_WARP_DISTANCE && newValue >= threshold) {
      newValue += MODE_WARP_DISTANCE - 2 * threshold;
    }
    newValue = clamp(newValue, 0, MODE_WARP_DISTANCE);

    const isAnchoredToCurrent = newValue >= HALF_MODE_WARP_DISTANCE;
    const warpX = isAnchoredToCurrent
      ? currX + (newValue - MODE_WARP_DISTANCE) * direction
      : prevX + newValue * direction;
    const lerpX = lerp(prevX, currX, tweenValue);
    const x =
      (direction < 0 && lerpX > warpX) || (direction > 0 && lerpX < warpX)
        ? lerpX
        : warpX;

    const y = lerp(prevY, currY, tweenValue);

    const warpSpeed =
      1 - abs(newValue - HALF_MODE_WARP_DISTANCE) / HALF_MODE_WARP_DISTANCE;
    const distortion = clamp(
      (distanceToTraverse - MODE_LERP_DISTANCE) / MODE_DISTANCE_DIFF,
      0,
      1
    );
    const speed = lerp(0, warpSpeed, distortion);

    this.value = newValue;
    this.frames++;

    this.setPosition(x, y);
    this.opacity = 1 - speed;
    this.size = SIZE - speed * MODE_SHRINK;
  }

  /** (Re)starts the transition between modes. */
  reset(curr: [number, number], prev: [number, number], ts: number) {
    const [currX, currY] = curr;
    const [prevX, prevY] = prev;
    if (currX === prevX && currY === prevY) {
      this.complete(curr);
      return;
    }

    this.tween.reset(ts);
    this.value = 0;
    this.direction = sign(currX - prevX);
    this.frames = 0;
    this.isComplete = false;

    this.setPosition(prevX, prevY);
    this.opacity = 1;
    this.size = SIZE;
  }

  /** Completes the transition between modes. */
  complete([currX, currY]: [number, number]) {
    this.tween.complete();
    this.value = MODE_WARP_DISTANCE;
    this.direction = 0;
    this.isComplete = true;

    this.setPosition(currX, currY);
    this.opacity = 1;
    this.size = SIZE;
  }
}

export function slotAnimation({
  el,
  updateVisible,
  updateStyles,
  updateHint,
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
   *   ┌──────────────────────────────────────────────┐
   *   │                       ╔═════════════╗        │
   *   │     ┌────────────────→╢ Constrained ╟─────→┐ │
   *   │     │                 ╚═══╤═╤══════╤╝  ╔═══╧═╧═══╗
   *   │     │        ┌───────────→┘ ↕      ↑   ║ Falling ║
   *   │     │     ╔══╧═══╗    ╔═════╧══╗   │   ╚════╤════╝
   *   │     │ ┌──→╢ Hint ╟───→╢ Locked ╟──╼┿╾──────→┘
   *   │     ↓ ↓   ╚══╤═══╝    ╚═╤═══╤══╝   │
   *   │   ╔═╧═╧═╗    │          │   ↑      │
   *   └──→╢ Off ║←───╂──────────┘   │      │
   *       ╚═╤═╤═╝    └───────────→┐ ↓      │
   *         ↑ │               ╔═══╧═╧════╗ │
   *         │ └──────────────→╢ Freeform ╟←┘
   *         │                 ╚═══╤══════╝
   *      ╔══╧════╗                │
   *      ║ Inert ╟←───────────────┘
   *      ╚═══════╝
   *
   *
   * `setMode()` facilitates transitions between different modes.
   *
   * The position of the slot is calculated using a handful of vectors,
   * which are defined above. Each mode can define its own way to calculate the
   * position in `getVectorForMode()`. To make transitions smoother, the final
   * result is calculated using the current and last position
   * in `ChipTransition`.
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
    focusRing: new NumberTween(
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
  const chipTransition = new ChipTransition(0, 0);

  let col = 0;

  // Updated by `animationFrame()`
  let lastAnimationFrame = 0; // timestamp

  init();

  /** Initializes slot animation. */
  function init() {
    el.style.opacity = "0";
    el.addEventListener("animationend", removeAnimationStyles);
    el.addEventListener("animationcancel", removeAnimationStyles);
  }

  /** Removes CSS classes and event listeners. */
  function destroy() {
    el.classList.remove(ENTER_CLASS, LEAVE_CLASS);
    el.removeEventListener("animationend", removeAnimationStyles);
    el.removeEventListener("animationcancel", removeAnimationStyles);
  }

  /** Resets the animation state. */
  function reset(ts: number) {
    const a = animation;
    completeModeTransition(ts);
    a.locked.complete();
    a.gravity.fall(null);
  }

  /** Completes the transition between previous and current mode. */
  function completeModeTransition(ts: number) {
    chipTransition.complete(getPositions(ts)[0]);
  }

  /** Starts the transition between previous and current mode. */
  function transitionModes(ts: number) {
    const [curr, prev] = getPositions(ts);
    chipTransition.reset(curr, prev, ts);
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
      if (updateVisible) {
        updateVisible(true);
      }
    }

    style.opacity = "";
    classList.toggle(ENTER_CLASS, isVisible);
    classList.toggle(LEAVE_CLASS, !isVisible);
    isTransitionForward = isVisible;
    isTransitionComplete = false;
  }

  /** Removes visibility animation classes and clears inline styles. */
  function removeAnimationStyles() {
    if (el.classList.contains(ENTER_CLASS)) {
      el.classList.remove(ENTER_CLASS);
    } else if (el.classList.contains(LEAVE_CLASS)) {
      el.style.opacity = "0";
      el.style.width = "";
      el.style.height = "";
      setMode(Mode.Off);
      el.classList.remove(LEAVE_CLASS);
      if (updateVisible) {
        updateVisible(false);
      }
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
    if (isFocusVisible !== focusVisible && updateFocusVisible) {
      updateFocusVisible(focusVisible);
    }

    isFocused = focused;
    isFocusVisible = focusVisible;
    lastEventDevice = device;
  }

  /**
   * Changes the current mode and facilitates the transition.
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
    const ts = performance.now();

    setVisible(mode !== Mode.Off && mode !== Mode.Inert);

    if (prevMode === Mode.Off) {
      requestFrame(animationFrame);
    }

    if (mode === Mode.Constrained) {
      a.focusRing.forward();
    } else {
      a.focusRing.reverse();
    }

    if (
      mode === Mode.Constrained ||
      prevMode === Mode.Hint ||
      (prevMode === Mode.Freeform && mode === Mode.Locked)
    ) {
      a.focusRing.complete();
      a.locked.complete();
    }

    if (prevMode === Mode.Hint && mode === Mode.Constrained) {
      // "Pick up" the chip instead of moving it to its previous position.
      col = 0;
      a.locked.select(0);
      a.locked.complete();
    }

    if (prevMode === Mode.Constrained || prevMode === Mode.Locked) {
      // Because the column at which the chip appears is derived from the last
      // cursor position, treat the pointer vector as the last position the user
      // was focusing on. This will be quickly overridden should the user switch
      // input devices.
      vector.pointer.x = pointerFromCol(col);
    }

    // Prevent mode transition
    if (
      prevMode === Mode.Off ||
      mode === Mode.Off ||
      mode === Mode.Inert ||
      mode === Mode.Falling
    ) {
      reset(ts);
    } else {
      transitionModes(ts);
    }

    const isHintVisible = mode === Mode.Hint;
    if ((isHintVisible || prevMode === Mode.Hint) && updateHint) {
      updateHint(isHintVisible);
    }

    if (mode === Mode.Falling) {
      const y = gameUIStore.getY(col) as number;
      gameUIStore.startAnimation();
      gameUIStore.playerMoved(col, y);
      store.endTurn(col);
      const startingPosition = getVectorForMode(prevMode, performance.now());
      a.gravity.fall(y, startingPosition ? startingPosition[1] : 0);
    }

    if (prevMode === Mode.Falling && mode === Mode.Off) {
      removeAnimationStyles();
    }
  }

  /** Returns a pointer position centered on a specified column. */
  function pointerFromCol(col: number): number {
    return clamp(col * CONT_SIZE, 0, FIELD_SIZE_UI);
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

    if (
      focused &&
      (mode === Mode.Off || mode === Mode.Freeform || mode === Mode.Hint)
    ) {
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

    if (
      (mode === Mode.Freeform || mode === Mode.Hint) &&
      (isLeft || isRight || isSubmit)
    ) {
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

    if (
      isEntering &&
      (mode === Mode.Off || mode === Mode.Inert || mode === Mode.Hint)
    ) {
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
    if (mode === Mode.Off) {
      return;
    }

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

    if (
      isPressed &&
      (mode === Mode.Freeform ||
        mode === Mode.Hint ||
        mode === Mode.Constrained)
    ) {
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
      if (mode === Mode.Hint) {
        setMode(Mode.Off);
      }
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

  /** Shows the hint if the chip is currently hidden. */
  function hint() {
    if (!isDisabled && mode === Mode.Off) {
      setMode(isFocusVisible ? Mode.Constrained : Mode.Hint);
    }
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
      case Mode.Hint:
        return [0, 0];
      case Mode.Freeform:
        return [v.pointer.x, v.nudge.y + a.focusRing.valueAsType(ts)];
      case Mode.Constrained:
        return [a.locked.getX(ts), a.focusRing.valueAsType(ts)];
      case Mode.Inert:
        return [v.inertia.x, v.nudge.y + a.focusRing.valueAsType(ts)];
      case Mode.Locked: {
        const y = v.nudge.y + a.focusRing.valueAsType(ts);
        return [a.locked.getX(ts) + v.nudge.x, y];
      }
      case Mode.Falling:
        return [a.locked.getX(ts) + v.nudge.x, a.gravity.getY(ts)];
    }
  }

  /**
   * Returns vectors for the current and previous mode.
   * @param ts - timestamp in milliseconds
   * @returns an array containing `[currentVector, previousVector]`
   */
  function getPositions(ts: number): [[number, number], [number, number]] {
    let prev = getVectorForMode(prevMode, ts) as [number, number];
    let curr = getVectorForMode(mode, ts) as [number, number];

    // Only one can ever be null
    prev ??= curr;
    curr ??= prev;

    return [curr, prev];
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

    const [currPos, prevPos] = getPositions(ts);
    chipTransition.animationFrame(currPos, prevPos, ts, secondsElapsed);

    const visible = isTransitionForward || !isTransitionComplete;
    if (mode !== Mode.Off || visible || !a.gravity.isFinished(ts)) {
      applyStyles();
      requestFrame(animationFrame);
    }

    // Exit out of falling mode
    if (mode === Mode.Falling && a.gravity.isFinished(ts)) {
      // Reset state
      const submittedIn = prevMode;
      setMode(Mode.Off);

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

  function applyStyles() {
    const { x, y, opacity, size } = chipTransition;
    el.style.transform = `translate(${x}px, ${y}px)`;
    el.style.opacity = opacity.toString();
    el.style.width = size + "px";
    el.style.height = el.style.width;
    if (updateStyles) {
      updateStyles(x, y, size, opacity);
    }
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
    hint,
    complete,
    destroy,
  };
}
