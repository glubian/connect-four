<script setup lang="ts">
import { store } from "@/store";
import { computed } from "vue";
import AppPopover from "./AppPopover.vue";

const props = defineProps<{ shown?: boolean; restartLabel?: boolean }>();
const emit = defineEmits<{ (ev: "update:shown", v: boolean): void }>();

const isShown = computed({
  get() {
    return props.shown;
  },
  set(v) {
    emit("update:shown", v);
  },
});

function reset() {}

function cancel() {
  isShown.value = false;
}

function start() {
  isShown.value = false;
  store.restartGame();
}
</script>

<template>
  <AppPopover v-model:shown="isShown">
    <form class="change-rules-popover" @submit="$event.preventDefault()">
      <div class="dialog-title">{{ $t("page.changeRules.title") }}</div>

      <div class="section-label">
        <i class="mi-clock"></i>
        <span>{{ $t("page.changeRules.section.timer.label") }}</span>
      </div>
      <div class="section">
        <div class="setting">
          <span>{{ $t("page.changeRules.section.timer.timePerTurn") }}</span>
          <button class="flat">{{ $t("unit.seconds", 20) }}</button>
        </div>
        <div class="setting">
          <span>{{ $t("page.changeRules.section.timer.passRemaining") }}</span>
        </div>
        <div class="setting">
          <span>{{ $t("page.changeRules.section.timer.atMost") }}</span>
          <button class="flat">{{ $t("unit.seconds", 60) }}</button>
        </div>
      </div>

      <div class="section-label">
        <i class="mi-circle"></i>
        <span>{{ $t("page.changeRules.section.objectives.label") }}</span>
      </div>
      <div class="section">
        <div class="setting">
          <span>{{
            $t("page.changeRules.section.objectives.allowDraws")
          }}</span>
        </div>
      </div>

      <div class="actions">
        <button class="flat action-reset" @click="reset">
          {{ $t("page.changeRules.action.reset") }}
        </button>
        <div class="space"></div>
        <button class="flat" @click="cancel">
          {{ $t("page.changeRules.action.cancel") }}
        </button>
        <button class="flat" @click="start">
          {{ $t(`page.changeRules.action.${restartLabel ? "re" : ""}start`) }}
        </button>
      </div>
    </form>
  </AppPopover>
</template>

<style scoped lang="scss">
@use "@/layout.scss";

.change-rules-popover {
  box-sizing: border-box;
  padding: 32px 24px 16px 24px;
  min-width: 440px;
}

.section-label {
  display: flex;
  align-items: center;
  height: 40px;
  gap: 16px;

  i {
    font-size: 24px;
  }
}

.dialog-title + .section-label {
  margin-top: 24px;
}

.section + .section-label {
  margin-top: 32px;
}

.setting {
  min-height: 40px;
  margin-bottom: 16px;

  & > button {
    margin-left: 16px;
  }

  & > span:first-child {
    padding: 0 4px;
  }

  & > span {
    display: inline-block;
    margin-top: calc(((40px - 1rem) / 2) - 1px);
    vertical-align: top;
  }
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 24px;
  .space {
    flex: 1;
  }
}

@media (max-width: layout.$popover-appearance-desktop) {
  .change-rules-popover {
    min-width: 0;
  }

  .action-reset {
    display: none;
  }
}
</style>
