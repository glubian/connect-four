<script setup lang="ts">
const props = defineProps<{ enabled?: boolean }>();
</script>

<template>
  <button class="app-setting-toggle">
    <span><slot></slot></span>
    <i :style="{ opacity: +(props.enabled ?? 0) }" class="mi-check"></i>
  </button>
</template>

<style scoped lang="scss">
button {
  gap: 12px;
  padding-right: 20px;
}

button:focus-visible span {
  text-decoration: underline;
}
</style>
