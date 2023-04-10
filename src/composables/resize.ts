import type { Ref, WatchStopHandle } from "vue";
import { onMounted, onUnmounted, ref, watch } from "vue";

/** Observes `elementRef` for changes in `offsetWidth` and `offsetHeight`. */
export function useResize(elementRef: Ref<HTMLElement | null>) {
  const offsetWidth = ref(0);
  const offsetHeight = ref(0);
  let unwatch: WatchStopHandle | null = null;

  const resizeObserver = new ResizeObserver(() => {
    const el = elementRef.value;
    if (!el) {
      return;
    }

    offsetWidth.value = el.offsetWidth;
    offsetHeight.value = el.offsetHeight;
  });

  function updateObservedElement(el: HTMLElement | null) {
    resizeObserver.disconnect();
    if (el) {
      resizeObserver.observe(el);
    }
  }

  onMounted(() => {
    unwatch = watch(elementRef, updateObservedElement);
  });

  onUnmounted(() => {
    if (unwatch) {
      unwatch();
      updateObservedElement(null);
    }
  });

  return { offsetWidth, offsetHeight };
}
