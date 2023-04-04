import { TIME_PER_TURN_MIN } from "@/constants";
import { store } from "@/store";
import {
  onMounted,
  onUnmounted,
  reactive,
  watch,
  type WatchStopHandle,
} from "vue";
import { useAnimations } from "./animations";

export function useTimerAnimation() {
  const timerAnimation = reactive({ start: 0, end: 1, isOngoing: false });
  const { requestFrame } = useAnimations();

  function drawFrame() {
    const { turnTimeout, timeCap } = store;
    if (turnTimeout === null || timeCap < TIME_PER_TURN_MIN) {
      timerAnimation.start = 0;
      timerAnimation.end = 1;
      timerAnimation.isOngoing = false;
      return;
    }

    timerAnimation.end = (turnTimeout - Date.now()) / timeCap;
    timerAnimation.isOngoing = true;
    requestFrame(drawFrame);
  }

  let unwatch: WatchStopHandle | null = null;
  onMounted(() => {
    unwatch = watch(store, ({ turnTimeout }) => {
      if (turnTimeout !== null) {
        requestFrame(drawFrame);
      }
    });
  });

  onUnmounted(() => {
    if (unwatch) {
      unwatch();
    }
  });

  return timerAnimation;
}
