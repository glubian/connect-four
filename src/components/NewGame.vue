<script setup lang="ts">
import { store } from "@/store";
import { TIME_PER_TURN_MIN, type GameConfig } from "@/ws";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import DropDown from "./DropDown.vue";

const props = defineProps<{ restartLabel?: boolean }>();
const emit = defineEmits<{ (ev: "hide", config: GameConfig | null): void }>();

const { t } = useI18n();

/** Milliseconds in a second. */
const MS_IN_S = 1000;

const timePerTurn = ref("20000");
const timePerTurnList = computed(() => ({
  "0": t("page.changeRules.section.timer.unlimited"),
  "4000": t("unit.seconds", 4),
  "8000": t("unit.seconds", 8),
  "12000": t("unit.seconds", 12),
  "20000": t("unit.seconds", 20),
  "32000": t("unit.seconds", 32),
}));

const timeCapEnabled = ref(false);

function genTimeCap(timePerTurn: number): number[] {
  if (timePerTurn < TIME_PER_TURN_MIN) {
    return [0];
  }

  const min = 32000; // ms
  const max = 60000; // ms
  const out = [timePerTurn + timePerTurn];
  for (
    let i = out[0] + timePerTurn;
    i <= max && (out.length < 3 || i <= min);
    i += timePerTurn
  ) {
    out.push(i);
    if (out.length >= 3) {
      i += timePerTurn;
    }
  }

  return out;
}

const timeCap = ref("40000");
const timeCapList = computed(() => {
  const list = genTimeCap(+timePerTurn.value);
  const out: { [key: string]: string } = {};
  for (const item of list) {
    out[item] = t("unit.seconds", item / MS_IN_S);
  }

  return out;
});

const applyButtonLabel = computed(() =>
  t(`page.changeRules.action.${props.restartLabel ? "restart" : "apply"}`)
);

watch(timeCapList, () => {
  if (!(timeCap.value in timeCapList.value)) {
    const timePerTurnValue = +timePerTurn.value;
    timeCap.value = (timePerTurnValue + timePerTurnValue).toString();
  }
});

const allowDraws = ref(false);

function reset() {
  const { config } = store;

  const configTimePerTurn = config.timePerTurn.toString();
  if (configTimePerTurn in timePerTurnList.value) {
    timePerTurn.value = configTimePerTurn;
  }

  timeCapEnabled.value = config.timeCap > config.timePerTurn;

  const configTimeCap = config.timeCap.toString();
  if (configTimeCap in timeCapList.value) {
    timeCap.value = configTimeCap;
  }

  allowDraws.value = store.config.allowDraws;
}

watch(() => store.config, reset, { immediate: true });

function cancel() {
  emit("hide", null);
}

function apply() {
  emit("hide", {
    timePerTurn: +timePerTurn.value,
    timeCap: timeCapEnabled.value ? +timeCap.value : 0,
    allowDraws: allowDraws.value,
  });
}
</script>

<template>
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
      <div class="setting checkbox" v-if="+timePerTurn">
        <input
          type="checkbox"
          id="passRemaining"
          class="flat"
          v-model="timeCapEnabled"
        />
        <label for="passRemaining">{{
          $t("page.changeRules.section.timer.passRemaining")
        }}</label>
      </div>
      <div class="setting" v-if="+timePerTurn && timeCapEnabled">
        <span>{{ $t("page.changeRules.section.timer.atMost") }}</span>
        <DropDown :values="timeCapList" v-model:selected="timeCap" />
      </div>
    </div>

    <div class="section-label">
      <div class="icon objectives"></div>
      <span>{{ $t("page.changeRules.section.objectives.label") }}</span>
    </div>
    <div class="section">
      <div class="setting checkbox">
        <input
          type="checkbox"
          id="allowDraws"
          class="flat"
          v-model="allowDraws"
        />
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
      <button class="flat" type="button" @click="apply">
        {{ applyButtonLabel }}
      </button>
    </div>
  </form>
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
  margin-right: 0;
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
