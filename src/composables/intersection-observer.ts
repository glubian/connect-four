import {
  onMounted,
  onUnmounted,
  shallowRef,
  type Ref,
  type WatchStopHandle,
  type ShallowRef,
  triggerRef,
  watch,
} from "vue";

type ObjectKey = number | string | symbol;
type Refs = { [key: ObjectKey]: Ref<HTMLElement | null> };

interface IntersectionObserverConfig<T extends Refs> {
  /** Reference to the root element. */
  rootRef: Ref<HTMLElement | null>;
  /** References of elements to track. */
  refs: T;
  /** Offsets added to each side of the root element's bounding box. */
  rootMargin?: string;
  /** Intersection thresholds. */
  thresholds?: number | number[];
}

/**
 * A map with the same set of keys as another object, but values of
 * a different type.
 */
type DerivedMap<T extends {}, U> = { [key in keyof T]: U };

/**
 * Creates a object, with the same set of keys as `map` and values set using
 * `initFn` function.
 */
function deriveMapFn<T extends {}, U>(
  map: T,
  initFn: (key: keyof T) => U
): DerivedMap<T, U> {
  const dMap: Partial<DerivedMap<T, U>> = {};
  for (const key of Object.keys(map) as (keyof T)[]) {
    dMap[key] = initFn(key);
  }

  return dMap as DerivedMap<T, U>;
}

/** A component-friendly interface for `IntersectionObserver`. */
export function useIntersectionObserver<T extends Refs>({
  rootRef,
  refs,
  rootMargin,
  thresholds,
}: IntersectionObserverConfig<T>) {
  type EntriesMap = DerivedMap<T, ShallowRef<IntersectionObserverEntry | null>>;
  /** A map of element refs and their current intersection observer entries. */
  const entries: EntriesMap = deriveMapFn(refs, () => shallowRef(null));
  /**
   * Indicates which entries should be updated when an update occurs for a
   * given element.
   */
  const targetMap: Map<HTMLElement, (keyof T)[]> = new Map();

  const handles: WatchStopHandle[] = [];
  let observer: IntersectionObserver | null = null;

  function intersectionObserverCb(updated: IntersectionObserverEntry[]) {
    for (const entry of updated) {
      const keys = targetMap.get(entry.target as HTMLElement);
      if (!keys) {
        continue;
      }

      for (const key of keys) {
        entries[key].value = entry;
        triggerRef(entries[key]);
      }
    }
  }

  /** Updates element associated with a reference. */
  function updateElement(
    key: keyof T,
    curr?: HTMLElement | null,
    prev?: HTMLElement | null
  ) {
    if (prev) {
      unobserveElement(key, prev);
    }

    if (curr) {
      const keys = targetMap.get(curr) ?? [];
      keys.push(key);
      targetMap.set(curr, keys);

      if (observer) {
        observer.observe(curr);
      }
    }
  }

  /**
   * Unobserves the element and updates target map and associated entry.
   * @param key - key of reference which has changed its value
   * @param el - previous element value
   */
  function unobserveElement(key: keyof T, el: HTMLElement) {
    if (observer) {
      observer.unobserve(el);
    }

    const keys = targetMap.get(el);
    if (keys) {
      const index = keys.indexOf(key);
      if (index !== -1) {
        keys.splice(index, 1);
      }
      if (!keys.length) {
        targetMap.delete(el);
      }
    }

    entries[key].value = null;
  }

  /** Attaches a new observer to a given element (and destroys the old one). */
  function attachObserver(rootEl: HTMLElement | null) {
    removeObserver();
    if (rootEl) {
      observer = new IntersectionObserver(intersectionObserverCb, {
        root: rootEl,
        rootMargin,
        threshold: thresholds,
      });
      for (const { value } of Object.values(refs)) {
        if (value) {
          observer.observe(value);
        }
      }
    }
  }

  /** Disposes of the intersection observer and resets the state. */
  function removeObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
      Object.values(entries).forEach((e) => (e.value = null));
      targetMap.clear();
    }
  }

  onMounted(() => {
    for (const [key, value] of Object.entries(refs)) {
      const handle = watch(
        value,
        (curr, prev) => updateElement(key, curr, prev),
        {
          immediate: true,
        }
      );
      handles.push(handle);
    }

    const rootRefHandle = watch(rootRef, attachObserver, { immediate: true });
    handles.push(rootRefHandle);
  });

  onUnmounted(() => {
    removeObserver();
    handles.forEach((stop) => stop());
    handles.length = 0;
  });

  return { entries };
}
