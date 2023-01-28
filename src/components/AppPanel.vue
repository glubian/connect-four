<script setup lang="ts">
import { PanelLayout, PANEL_APPEAR_DURATION } from "@/layout";
import { layoutStore } from "@/layout-store";
import { computed } from "vue";
const props = defineProps<{ isShown?: boolean }>();
const layout = computed(() => layoutStore.panelLayout);
</script>

<template>
  <Transition name="appear" :duration="PANEL_APPEAR_DURATION">
    <div class="panel-overlay" :class="layout" v-if="props.isShown">
      <Transition name="background">
        <div class="background" v-if="layout !== PanelLayout.Desktop"></div>
      </Transition>
      <div class="panel c1">
        <slot />
      </div>
    </div>
  </Transition>
</template>

<style scoped lang="scss">
@use "@/layout";

.panel-overlay {
  position: relative;
  z-index: 50;
}

.background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;

  background-color: var(--c-dialog-background);
  transition: background-color 200ms ease-in-out;

  .layout-desktop & {
    background-color: transparent;
  }
}

.panel {
  position: fixed;
  top: 0;
  right: 0;

  background: var(--c);
  color: var(--c-text);

  box-sizing: border-box;
  width: calc(100vw - 100vh);
  min-width: layout.$panel-min-width;
  max-width: layout.$panel-max-width;
  height: 100vh;

  transform: translate(0, 0);

  .layout-mobile & {
    min-width: initial;
    max-width: initial;
    width: 100vw;
  }
}

.appear-enter-from,
.appear-leave-to {
  .panel {
    $min: layout.$panel-min-width;
    $max: layout.$panel-max-width;
    transform: translate(max(min(calc(100vw - 100vh), $max), $min), 0);
  }

  &.layout-mobile .panel {
    transform: translate(0, 100vh);
  }

  .background {
    background-color: transparent;
  }
}

.appear-enter-active {
  .panel {
    transition: transform layout.$panel-appear-duration ease-out;
  }
}

.appear-leave-active {
  .panel {
    transition: transform layout.$panel-appear-duration ease-in;
  }
}

.background-enter-from,
.background-leave-to {
  background-color: transparent;
}
</style>
