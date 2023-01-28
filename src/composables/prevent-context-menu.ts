import { watch, type Ref } from "vue";

/** Prevents context menu from appearing on the referenced element. */
export function usePreventContextMenu(r: Ref<HTMLElement | null>) {
  function onContextMenu(ev: MouseEvent) {
    if (r.value && r.value === ev.target) {
      ev.preventDefault();
    }
  }

  watch(
    r,
    (curr, prev) => {
      if (curr && prev) {
        return;
      }

      if (!curr) {
        document.removeEventListener("contextmenu", onContextMenu);
      } else {
        document.addEventListener("contextmenu", onContextMenu);
      }
    },
    { immediate: true }
  );
}
