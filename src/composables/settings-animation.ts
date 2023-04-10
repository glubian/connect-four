import { computed, type Ref } from "vue";

export function useSettingsAnimation(ref: Ref<HTMLElement | null>) {
  const animationCom = computed(() => {
    const iconEl = ref.value;
    if (!iconEl) {
      return;
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
