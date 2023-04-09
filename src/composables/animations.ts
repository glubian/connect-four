import { onUnmounted } from "vue";

type AnimationFrameCallback = (dt: number) => void;

/** Ensures `window.requestAnimationFrame()` is only called once per frame. */
export function useAnimations() {
  let handle: number | null = null;
  let animationFrameFn: AnimationFrameCallback | null = null;

  function requestFrame(f: AnimationFrameCallback) {
    if (handle === null) {
      handle = window.requestAnimationFrame(onAnimationFrame);
    }

    animationFrameFn = f;
  }

  function onAnimationFrame(dt: number) {
    handle = null;
    if (animationFrameFn) {
      const cb = animationFrameFn;
      animationFrameFn = null;
      cb(dt);
    }
  }

  onUnmounted(() => {
    if (handle !== null) {
      cancelAnimationFrame(handle);
    }
  });

  return { requestFrame };
}
