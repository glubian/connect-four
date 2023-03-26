<script setup lang="ts">
import { store } from "@/store";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import AppPopover from "./AppPopover.vue";
import DropDown from "./DropDown.vue";

const props = defineProps<{ shown?: boolean; restartLabel?: boolean }>();
const emit = defineEmits<{ (ev: "update:shown", v: boolean): void }>();

const { t } = useI18n();

const isShown = computed({
  get() {
    return props.shown;
  },
  set(v) {
    emit("update:shown", v);
  },
});

const timePerTurn = ref(20);
const timePerTurnList = computed(() => ({
  12: t("unit.seconds", 12),
  20: t("unit.seconds", 20),
  32: t("unit.seconds", 32),
  48: t("unit.seconds", 48),
  60: t("unit.seconds", 60),
}));

const atMost = ref(40);
const atMostList = computed(() => ({
  40: t("unit.seconds", 40),
  80: t("unit.seconds", 80),
  120: t("unit.seconds", 120),
}));

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
          <DropDown :values="timePerTurnList" v-model:selected="timePerTurn" />
        </div>
        <div class="setting checkbox">
          <input type="checkbox" id="passRemaining" class="flat" />
          <label for="passRemaining">{{
            $t("page.changeRules.section.timer.passRemaining")
          }}</label>
        </div>
        <div class="setting">
          <span>{{ $t("page.changeRules.section.timer.atMost") }}</span>
          <DropDown :values="atMostList" v-model:selected="atMost" />
        </div>
      </div>

      <div class="section-label">
        <div class="icon objectives"></div>
        <span>{{ $t("page.changeRules.section.objectives.label") }}</span>
      </div>
      <div class="section">
        <div class="setting checkbox">
          <input type="checkbox" id="allowDraws" class="flat" />
          <label for="allowDraws">{{
            $t("page.changeRules.section.objectives.allowDraws")
          }}</label>
        </div>
      </div>

      <div class="actions">
        <button class="flat action-reset" type="button" @click="reset">
          {{ $t("page.changeRules.action.reset") }}
        </button>
        <div class="space"></div>
        <button class="flat" type="button" @click="cancel">
          {{ $t("page.changeRules.action.cancel") }}
        </button>
        <button class="flat" type="button" @click="start">
          {{ $t(`page.changeRules.action.${restartLabel ? "re" : ""}start`) }}
        </button>
      </div>
    </form>
  </AppPopover>
</template>

<style scoped lang="scss">
@use "@/layout.scss";

$height: 40px;

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
  margin-top: 8px;
  margin-bottom: 16px;

  & > span:not(:last-child) {
    margin-right: 16px;
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

.setting.checkbox {
  display: flex;
}

input[type="checkbox"] {
  margin-left: 0;
}

label {
  display: inline-block;
  flex: 1;
  margin-top: calc((($height - 1rem) / 2) - 1px);
  margin-left: 16px;
  vertical-align: top;
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
