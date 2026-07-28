<script lang="ts" setup>
import { ref } from 'vue';
const value1 = ref<number>(0);
const value2 = ref<[number, number]>([20, 50]);
</script>

<template>
  <div>
    <a-flex gap="middle">
      <a-button>Base button</a-button>
      <a-button type="primary">Primary button</a-button>
    </a-flex>

    <a-slider id="test" v-model:value="value1"  />
    <a-slider v-model:value="value2" range />
  </div>
</template>
