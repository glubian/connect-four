import { onUnmounted } from "vue";

/**
 * A wrapper for `setTimeout()`. Executes a callback function after a set amount
 * of time if the timer has not been reset.
 *
 * Call `reset()` to (re)start the timer, or `clear()` to stop it.
 *
 * @param ms - the amount of time after which callback function will be executed
 * @param timeoutCb - called when the timer expires
 * @param resolutionMs - prevent resetting the timer more often than specified
 */
export function useTimer(
  ms: number,
  timeoutCb: () => void,
  resolutionMs = 100
) {
  let nextTs = 0;
  let handle: ReturnType<typeof setTimeout> | null = null;

  /** Clears the timer. */
  function clear() {
    if (handle !== null) {
      clearTimeout(handle);
      handle = null;
    }
  }

  /**
   * Resets the timer, optionally using the timestamp to prevent resetting it
   * too often.
   */
  function reset(ts?: number) {
    if (typeof ts === "number") {
      if (nextTs < ts) {
        nextTs = ts + resolutionMs;
      } else {
        return;
      }
    }

    clear();
    handle = setTimeout(fire, ms);
  }

  function fire() {
    clear();
    timeoutCb();
  }

  onUnmounted(clear);

  return {
    reset,
    clear,
    get isRunning(): boolean {
      return handle !== null;
    },
  };
}
