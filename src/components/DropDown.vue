<script setup lang="ts">
import { layoutStore } from "@/layout-store";
import { computed, ref, watch, type Ref } from "vue";
import AppPopover from "./AppPopover.vue";

type ObjectKey = string | number | symbol;
type DropDownValues = { [key: ObjectKey]: string };

const props = defineProps<{ values?: DropDownValues; selected?: ObjectKey }>();
const emit = defineEmits<{ (ev: "update:selected", v: ObjectKey): void }>();

const DEFAULT_KEY = "select";
const DEFAULT_VALUE = "Select";
const DEFAULT_VALUES: DropDownValues = { select: "Select" } as const;

const buttonRef: Ref<HTMLButtonElement | null> = ref(null);
const buttonLabel = computed(() => {
  const { values, selected } = props;
  return (values ?? DEFAULT_VALUES)[selected ?? DEFAULT_KEY] ?? DEFAULT_VALUE;
});
const buttonLeft = ref(0);
const buttonTop = ref(0);

const isOpen = ref(false);

function open() {
  isOpen.value = true;
  const el = buttonRef.value;
  if (el) {
    const { top, left } = el.getBoundingClientRect();
    buttonTop.value = top;
    buttonLeft.value = left;
  }
}

function close() {
  isOpen.value = false;
}

function select(v: string) {
  emit("update:selected", v);
  close();
}

watch(layoutStore, close);
</script>

<template>
  <button class="flat control" type="button" @click="open" ref="buttonRef">
    <span>{{ buttonLabel }}</span>
    <i class="mi-caret-down"></i>
  </button>
  <AppPopover
    :top="buttonTop"
    :left="buttonLeft"
    flat
    background="hidden"
    layout="desktop"
    v-model:shown="isOpen"
  >
    <div class="context-menu">
      <button
        class="flat"
        type="button"
        v-for="[value, display] in Object.entries(values ?? DEFAULT_VALUES)"
        :key="value"
        @click="select(value)"
      >
        {{ display }}
      </button>
    </div>
  </AppPopover>
</template>

<style lang="scss" scoped>
button {
  display: inline-flex;
  align-items: center;
  gap: 16px;
  padding: 0 12px;
  font-weight: normal;
}

i {
  font-size: 24px;
}

.context-menu {
  border: var(--c-context-menu-border);
  background-color: var(--c-context-menu);
  border-radius: 4px;
  padding: 8px 0;
  margin-top: -9px;
}

.context-menu > button {
  width: 100%;
  // gap (16px) + icon width (24px) + right margin (12px)
  padding-right: 16px + 24px + 12px;
}
</style>
