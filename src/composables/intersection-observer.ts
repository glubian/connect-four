import { shallowRef, triggerRef, watch, type Ref, type ShallowRef } from "vue";

type ElementMap = { [key: string]: Ref<HTMLElement | null> };
type ShallowRefMap<T extends {}, U> = { [key in keyof T]: ShallowRef<U> };

function shallowRefMap<T extends {}, U>(
  obj: T,
  value: U
): Readonly<ShallowRefMap<T, U>> {
  const res: Partial<ShallowRefMap<T, U>> = {};
  for (const key of Object.keys(obj) as (keyof T)[]) {
    res[key] = shallowRef(value);
  }

  return res as ShallowRefMap<T, U>;
}

interface IntersectionObserverConfig<T extends ElementMap> {
  rootRef: Ref<HTMLElement | null>;
  refs: T;
  rootMargin?: string;
  threshold?: number;
}

/** Provides a component-friendly interface for `IntersectionObserver`. */
export function useIntersectionObserver<T extends ElementMap>({
  rootRef,
  refs,
  rootMargin,
  threshold,
}: IntersectionObserverConfig<T>) {
  const entries: ShallowRefMap<T, IntersectionObserverEntry | null> =
    shallowRefMap(refs, null);
  const targetMap = new Map<HTMLElement, (keyof T)[]>();
  let observer: IntersectionObserver | null = null;

  for (const [key, { value }] of Object.entries(refs)) {
    if (!value) {
      continue;
    }

    const keys = targetMap.get(value) ?? [];
    keys.push(key);
    targetMap.set(value, keys);
  }

  for (const [key, value] of Object.entries(refs)) {
    watch(value, (curr, prev) => {
      if (prev) {
        if (observer) {
          observer.unobserve(prev);
        }

        targetMap.delete(prev);
        entries[key].value = null;
        triggerRef(entries[key]);
      }

      if (curr) {
        const keys = targetMap.get(curr) ?? [];
        keys.push(key);
        targetMap.set(curr, keys);

        if (observer) {
          observer.observe(curr);
        }
      }
    });
  }

  function update(updated: IntersectionObserverEntry[]) {
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

  watch(
    rootRef,
    (curr) => {
      if (observer) {
        observer.disconnect();
        observer = null;
        for (const entry of Object.values(entries)) {
          entry.value = null;
          triggerRef(entry);
        }
      }

      if (curr) {
        observer = new IntersectionObserver(update, {
          root: curr,
          rootMargin,
          threshold,
        });

        for (const { value } of Object.values(refs)) {
          if (value) {
            observer.observe(value);
          }
        }
      }
    },
    { immediate: true }
  );

  return { entries };
}
