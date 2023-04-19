import { isWebkit } from "@/compatibility-fixes";
import { computed, type Ref } from "vue";

export function useSettingsAnimation(ref: Ref<HTMLElement | null>) {
  const animationCom = computed(() => {
    const iconEl = ref.value;
    if (!iconEl) {
      return;
    }

    if (isWebkit) {
      const { style } = iconEl;
      // For some reason this prevents the element from being darker during
      // animation, but only in Chrome.
      style.transformOrigin = "12px 14px";
      style.transform = "rotate(-45deg)";
      style.willChange = "transform";
    }

    const keyframes = [
      { offset: 0, transform: "rotate(-45deg)" },
      { offset: 1, transform: "rotate(0)" },
    ];
    const a = iconEl.animate(keyframes, { easing: "linear", duration: 120 });
    a.finish();
    return a;
  });

  function turn() {
    const animation = animationCom.value;
    if (animation && animation.playState === "finished") {
      animation.currentTime = 0;
      animation.play();
    }
  }

  return { turn };
}
