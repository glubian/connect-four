<script setup lang="ts">
import { FocusTrap } from "focus-trap-vue";
import { computed, ref, type Ref } from "vue";

const props = defineProps({
  message: String,
  shown: Boolean,
  dismissible: {
    type: Boolean,
    required: false,
  },
});
const emit = defineEmits(["update:shown"]);

const backgroundRef: Ref<HTMLDivElement | null> = ref(null);
const focusTrapRef: Ref<typeof FocusTrap | null> = ref(null);

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
    <div class="background" @click="dismiss" v-if="shown" ref="backgroundRef">
      <FocusTrap v-model:active="focusTrapModel" ref="focusTrapRef">
        <div class="dialog c1">
          <div class="message">{{ message }}</div>
          <div class="actions"><slot></slot></div>
        </div>
      </FocusTrap>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
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
}

.dialog {
  margin: 16px;
  padding: 24px 16px 16px 16px;

  width: 100%;
  max-width: 360px;

  background: var(--c1);
  box-shadow: var(--c-dialog-drop-shadow);
}

.message {
  padding-bottom: 16px;
}

.actions {
  display: flex;
  width: 100%;
  gap: 8px;
  justify-content: flex-end;
}
</style>
