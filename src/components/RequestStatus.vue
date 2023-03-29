<script lang="ts" setup>
import { otherPlayer } from "@/game";
import { store } from "@/store";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const received = computed(() => {
  const { remoteRole, restartRequests } = store;
  return remoteRole === null ? null : restartRequests[otherPlayer(remoteRole)];
});

const sent = computed(() => {
  const { remoteRole, restartRequests } = store;
  return remoteRole === null ? null : restartRequests[remoteRole];
});

const message = computed(() => {
  return received.value
    ? t("page.restartRequest.pending")
    : sent.value
    ? t("page.restartRequest.waiting")
    : null;
});
</script>

<template>
  <div class="request-status" v-if="message">
    <span class="message">{{ message }}</span>
    <button class="icon" v-if="received">
      <i class="mi-chevron-down"></i>
    </button>
  </div>
</template>

<style lang="scss" scoped>
@use "@/game-ui.scss";

.request-status {
  display: flex;
  align-items: center;

  box-sizing: border-box;
  width: game-ui.$field-size-ui + 4px;
  height: 56px;
  padding: 0 8px 0 16px;
  margin-bottom: 64px;
  gap: 8px;
  border-radius: 4px;

  color: var(--c-text);
  border: 1px solid var(--c-text-tertiary);
}

.message {
  flex: 1;
}
</style>
