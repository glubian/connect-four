import {
  watch,
  type Ref,
  type WatchStopHandle,
  onMounted,
  onUnmounted,
} from "vue";

/** Prevents context menu from appearing on the referenced element. */
export function usePreventContextMenu(r: Ref<HTMLElement | null>) {
  let isEnabled = false;
  let unwatch: WatchStopHandle | null = null;

  function onContextMenu(ev: MouseEvent) {
    if (r.value && r.value === ev.target) {
      ev.preventDefault();
    }
  }

  function toggleEventListener(enabled: boolean) {
    if (enabled === isEnabled) {
      return;
    }

    if (enabled) {
      document.addEventListener("contextmenu", onContextMenu);
    } else {
      document.removeEventListener("contextmenu", onContextMenu);
    }

    isEnabled = enabled;
  }

  onMounted(() => {
    unwatch = watch(r, (curr) => toggleEventListener(!!curr), {
      immediate: true,
    });
  });

  onUnmounted(() => {
    if (unwatch) {
      unwatch();
    }

    toggleEventListener(false);
  });
}
