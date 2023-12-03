<script lang="ts" setup>
import { otherPlayer, type Player } from "@/game";
import { playerClass } from "@/game-ui";
import { store, type RestartRequest } from "@/store";
import { TIME_PER_TURN_MIN } from "@/ws";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import TimeoutBar from "./TimeoutBar.vue";
import TimeoutCircle from "./TimeoutCircle.vue";

const props = defineProps<{ req: RestartRequest; player: Player }>();

const restartDetails = computed(() => playerClass(otherPlayer(props.player)));

const { t } = useI18n();

// namespace
const ns = computed(() =>
  props.req.config
    ? "page.restartRequest.withChanges"
    : "page.restartRequest.withoutChanges"
);

const title = computed(() => t(ns.value + ".title"));
const description = computed(() => t(ns.value + ".description"));

const timerChanges = computed(() => {
  const res: string[] = [];

  const { config } = props.req;
  if (!config) {
    return res;
  }

  const { timePerTurn, timeCap } = config;
  const curr = store.config;
  if (curr.timePerTurn === timePerTurn && curr.timeCap === timeCap) {
    return res;
  }

  const MS_IN_S = 1000;
  if (timePerTurn < TIME_PER_TURN_MIN) {
    res.push(t(ns.value + ".time.unlimited"));
    return res;
  } else {
    const secondsPerTurn = timePerTurn / MS_IN_S;
    const secondsStr = t("unit.seconds", secondsPerTurn);
    res.push(t(ns.value + ".time.perTurn", [secondsStr]));
  }

  const timeCapEnabled = timeCap > timePerTurn;
  if (curr.timeCap !== timeCap) {
    res.push(t(`${ns.value}.time.cap${timeCapEnabled ? "" : "Disabled"}`));
    if (timeCapEnabled) {
      const secondsPerTurn = timeCap / MS_IN_S;
      const secondsStr = t("unit.seconds", secondsPerTurn);
      res.push(t(ns.value + ".time.capAt", [secondsStr]));
    }
  }

  return res;
});

const allowDraws = computed(() => {
  const { config } = props.req;
  if (!config || config.allowDraws === store.config.allowDraws) {
    return "";
  }

  return t(`${ns.value}.draws.${config.allowDraws ? "" : "dis"}allowed`);
});
const rejectLabel = computed(() => t(ns.value + ".reject"));
const acceptLabel = computed(() => t(ns.value + ".accept"));
</script>

<template>
  <div class="restart-details" :class="restartDetails">
    <TimeoutBar class="bar" :start="req.received" :end="req.timeout" />
    <div class="title">
      <div class="dialog-title">{{ title }}</div>
      <TimeoutCircle
        class="circle"
        :start="req.received"
        :end="req.timeout"
        :size="28"
        :width="4"
      />
    </div>
    <div class="description">{{ description }}</div>
    <ul v-if="!!timerChanges.length">
      <template v-for="(msg, i) in timerChanges" :key="i">
        <li class="section-label" v-if="i === 0">
          <i class="mi-clock"></i>
          <span class="item">{{ msg }}</span>
        </li>
        <li v-else>
          <span class="icon dot"></span>
          <span class="item">{{ msg }}</span>
        </li>
      </template>
    </ul>
    <ul v-if="allowDraws">
      <li class="section-label">
        <span class="icon objectives"></span>
        <span class="item">{{ allowDraws }}</span>
      </li>
    </ul>
    <div class="actions">
      <button class="flat" @click="store.respondToRestartRequest(false)">
        {{ rejectLabel }}
      </button>
      <button class="flat" @click="store.respondToRestartRequest(true)">
        {{ acceptLabel }}
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "sass:math";
@use "@/layout.scss";
@use "/gen/dist/inline-images.scss";

$list-indent: 40px;
$dot-size: 4px;

.restart-details {
  box-sizing: border-box;
  padding: 32px 24px 16px 24px;
  width: 100%;
}

.p1 {
  --bar: var(--c-p1);
  --bar-background: var(--c-p1-bar);
}

.p2 {
  --bar: var(--c-p2);
  --bar-background: var(--c-p2-bar);
}

.title {
  display: flex;
}

.bar {
  display: none;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
  border-radius: 4px 4px 0 0;
}

@media (min-width: layout.$restart-popover-auto) {
  .bar {
    display: block;
  }

  .circle {
    display: none;
  }
}

.dialog-title {
  flex: 1;
}

.description {
  margin: 16px 0;
}

ul {
  margin: 0;
  padding: 0;
}

li {
  display: flex;
  align-items: flex-start;
  list-style-type: none;
  margin-bottom: 8px;
  gap: 16px;

  &:first-child {
    margin: 0;

    .item {
      align-self: center;
      margin: 8px 0;
    }

    .icon {
      margin: 8px 0;
    }
  }

  & > :first-child {
    margin: -2px 0;
  }

  i {
    font-size: 24px;
    padding: 8px 0;
  }

  .item {
    flex: 1;
  }

  &:last-child:not(:first-child) {
    margin-bottom: 16px;
  }
}

.actions {
  display: flex;
  justify-content: flex-end;

  box-sizing: border-box;
  padding-left: 40px;
  margin-top: 24px;
  gap: 8px;
}
</style>
