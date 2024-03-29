<script setup lang="ts">
import { FocusTrap } from "focus-trap-vue";
import { computed, ref, type Ref } from "vue";

const props = defineProps({
  title: String,
  description: String,
  shown: Boolean,
  dismissible: Boolean,
});
const emit = defineEmits(["update:shown"]);

const backgroundRef: Ref<HTMLDivElement | null> = ref(null);

const focusTrapModel = computed({
  get() {
    return props.shown;
  },
  set(v) {
    emit("update:shown", v);
  },
});

function dismiss(ev: MouseEvent) {
  if (ev.target === backgroundRef.value && props.dismissible) {
    focusTrapModel.value = false;
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div class="background" @click="dismiss" v-if="shown" ref="backgroundRef">
        <FocusTrap v-model:active="focusTrapModel">
          <div class="dialog c1">
            <div class="title dialog-title">{{ title }}</div>
            <div class="description" v-if="description">{{ description }}</div>
            <div class="actions"><slot></slot></div>
          </div>
        </FocusTrap>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
$appear-duration: 80ms;

.background {
  display: flex;
  align-items: center;
  justify-content: center;

  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 99;

  background-color: var(--c-dialog-background);
  color: var(--c1-text);

  &:is(.dialog-enter-from, .dialog-leave-to) {
    opacity: 0;
  }

  &.dialog-enter-active {
    transition: opacity $appear-duration ease-out;
  }

  &.dialog-leave-active {
    transition: opacity $appear-duration ease-in;
  }
}

.dialog {
  margin: 16px;
  padding: 32px 24px 16px 24px;

  min-width: 0;
  width: 100%;
  max-width: 344px;
  border-radius: 4px;

  background: var(--c1);
  box-shadow: var(--c-dialog-drop-shadow);

  transform: translate(0, 0);

  :is(.dialog-enter-from, .dialog-leave-to) & {
    transform: translate(0, 8px);
    opacity: 0;
    box-shadow: none;
    body:is(.light, .dark) & {
      transform: translate(4px, 4px);
    }
  }

  .dialog-enter-active & {
    transition-property: opacity, transform, box-shadow;
    transition-duration: $appear-duration;
    transition-timing-function: ease-out;
  }

  .dialog-leave-active & {
    transition-property: opacity, transform, box-shadow;
    transition-duration: $appear-duration;
    transition-timing-function: ease-in;
  }
}

.title {
  margin-right: 48px;
  /* This is purely to fix layout on small displays. */
  white-space: nowrap;
}

.description {
  margin-top: 16px;
}

.actions {
  display: flex;
  justify-content: flex-end;

  box-sizing: border-box;
  width: 100%;
  padding-left: 40px;
  margin-top: 32px;
  gap: 8px;
}

.description + .actions {
  margin-top: 24px;
}
</style>
