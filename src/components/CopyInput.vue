<script setup lang="ts">
import { asTransformScaleValue } from "@/compatibility-fixes";
import { useI18n } from "vue-i18n";

const props = defineProps<{ value?: string }>();

const TRANSLATE_X = asTransformScaleValue(-1);
const TRANSLATE_Y_FROM = asTransformScaleValue(-1);
const TRANSLATE_Y_TO = asTransformScaleValue(1);

const SCALE_X_FROM = 0;
const SCALE_Y_FROM = asTransformScaleValue(40);
const SCALE_X_T0 = asTransformScaleValue(3);
const SCALE_Y_TO = asTransformScaleValue(38);

const TRANSFORM_FROM = `translate(${TRANSLATE_X}px, ${TRANSLATE_Y_FROM}px) scale(${SCALE_X_FROM}, ${SCALE_Y_FROM})`;
const TRANSFORM_TO = `translate(${TRANSLATE_X}px, ${TRANSLATE_Y_TO}px) scale(${SCALE_X_T0}, ${SCALE_Y_TO})`;

const buttonStyle = {
  "--transform-from": TRANSFORM_FROM,
  "--transform-to": TRANSFORM_TO,
} as const;

const IS_SHARING_SUPPORTED = !!navigator.share;

const { t } = useI18n();

function copyToClipboard() {
  const text = props.value;
  if (!text) {
    return;
  }

  navigator.clipboard.writeText(text);
}

function share() {
  const text = props.value;
  if (!text) {
    return;
  }

  /* global ShareData */
  const shareData: ShareData = { title: t("page.remotePlaySetup.shareTitle") };
  try {
    new URL(text);
    shareData.url = text;
  } catch (_) {
    shareData.text = text;
  }

  navigator.share(shareData);
}
</script>

<template>
  <div class="copy-input">
    <div class="input-wrapper">
      <input :value="props.value" type="text" readonly />
    </div>
    <button :style="buttonStyle" @click="copyToClipboard()">
      <i class="mi-copy"></i>
    </button>
    <button :style="buttonStyle" @click="share()" v-if="IS_SHARING_SUPPORTED">
      <i class="mi-share"></i>
    </button>
  </div>
</template>

<style scoped lang="scss">
.copy-input {
  display: inline-flex;
  justify-content: center;
  align-items: center;
}

.input-wrapper {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  padding: 0 8px;
  flex: 1;
  height: 40px;
  background: var(--c-control);
  border-radius: 4px 0 0 4px;
  box-shadow: var(--c-control-drop-shadow);
  border: var(--c-button-border);
}

input {
  all: unset;
  width: 100%;
  user-select: all;
}

button:is(button, :hover, :active) {
  border-radius: 0;
  &:last-child {
    border-radius: 0 4px 4px 0;
  }
}

button {
  position: relative;
  left: -1px;
}

button::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 1px;
  height: 1px;
  background: var(--c-drop-shadow);
  transform: var(--transform-from, translate(-1px, -1px) scale(0, 40));
  transform-origin: 0 0;
  transition: transform 48ms ease-in-out;
}

button:active::after {
  transform: var(--transform-to, translate(-1px, 1px) scale(3, 38));
}
</style>
