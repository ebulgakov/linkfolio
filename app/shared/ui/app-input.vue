<script lang="ts" setup>
defineProps<{
  modelValue?: string | null;
  label?: string;
  type?: string;
  rules?: ((value: string) => true | string)[];
  errorMessages?: string | string[];
  hint?: string;
  persistentHint?: boolean;
  readonly?: boolean;
  density?: "default" | "comfortable" | "compact";
  hideDetails?: boolean | "auto";
  clearable?: boolean;
  prependInnerIcon?: string;
  appendInnerIcon?: string;
  autocomplete?: string;
  ariaLabel?: string;
}>();

defineEmits<{
  "update:modelValue": [value: string];
  "click:append-inner": [event: MouseEvent];
}>();
</script>

<template>
  <v-text-field
    :model-value="modelValue"
    :label="label"
    :type="type"
    :rules="rules"
    :error-messages="errorMessages"
    :hint="hint"
    :persistent-hint="persistentHint"
    :readonly="readonly"
    :density="density"
    :hide-details="hideDetails"
    :clearable="clearable"
    :prepend-inner-icon="prependInnerIcon"
    :append-inner-icon="appendInnerIcon"
    :autocomplete="autocomplete"
    :aria-label="ariaLabel"
    @update:model-value="$emit('update:modelValue', $event)"
    @click:append-inner="$emit('click:append-inner', $event)"
  >
    <template v-if="$slots['append-inner']" #append-inner>
      <slot name="append-inner" />
    </template>
  </v-text-field>
</template>
