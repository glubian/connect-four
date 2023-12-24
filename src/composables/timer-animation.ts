import { clamp } from "@/math";
import { store } from "@/store";
import { TIME_PER_TURN_MIN } from "@/ws";
import {
  onMounted,
  onUnmounted,
  reactive,
  watch,
  type WatchStopHandle,
} from "vue";
import { useAnimations } from "./animations";

export function useTimerAnimation() {
  const timerAnimation = reactive({ value: 1, isOngoing: false });
  const { requestFrame } = useAnimations();

  function drawFrame() {
    const { turnTimeout, timeCap } = store;
    if (turnTimeout === null || timeCap < TIME_PER_TURN_MIN) {
      timerAnimation.value = 1;
      timerAnimation.isOngoing = false;
      return;
    }

    timerAnimation.value = clamp((turnTimeout - Date.now()) / timeCap, 0, 1);
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
