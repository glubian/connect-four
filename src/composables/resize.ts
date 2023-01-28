import { computed, ref, watch, type Ref } from "vue";

/** Observes `elementRef` for changes in `offsetWidth` and `offsetHeight`. */
export function useResize(elementRef: Ref<HTMLElement | null>) {
  const offsetWidth = ref(0);
  const offsetHeight = ref(0);

  const resizeObserver = new ResizeObserver(() => {
    const el = elementRef.value;
    if (!el) {
      return;
    }

    offsetWidth.value = el.offsetWidth;
    offsetHeight.value = el.offsetHeight;
  });

  watch(elementRef, (currEl, prevEl) => {
    if (prevEl === currEl) {
      return;
    }

    if (prevEl) {
      resizeObserver.unobserve(prevEl);
    }

    if (currEl) {
      resizeObserver.observe(currEl);
    }
  });

  return {
    offsetWidth: computed(() => offsetWidth.value),
    offsetHeight: computed(() => offsetHeight.value),
  };
}
