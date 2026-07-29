<script lang="ts" setup>
import { useLoginForm } from "~/features/login";
import { email, required } from "~/shared/lib/validators";

const { form, pending, errorMessage, submit } = useLoginForm();

const formRef = useTemplateRef("formRef");
const showPassword = ref(false);

async function onSubmit() {
  const { valid: isValid } = await formRef.value!.validate();
  if (!isValid) return;
  await submit();
}
</script>

<template>
  <v-form ref="formRef" @submit.prevent="onSubmit">
    <v-alert v-if="errorMessage" type="error" :text="errorMessage" class="mb-4" />

    <v-text-field
      v-model="form.email"
      label="Email"
      type="email"
      autocomplete="email"
      :rules="[required('Email is required'), email('Please enter a valid email')]"
    />

    <v-text-field
      v-model="form.password"
      label="Password"
      :type="showPassword ? 'text' : 'password'"
      autocomplete="current-password"
      :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
      :rules="[required('Password is required')]"
      :aria-label="showPassword ? 'Hide password' : 'Show password'"
      @click:append-inner="showPassword = !showPassword"
    />

    <v-btn type="submit" color="primary" :loading="pending" :disabled="pending" block>
      Log in
    </v-btn>

    <div class="d-flex justify-center mt-4">
      <NuxtLink to="/signup" class="text-primary">Don't have an account? Sign up</NuxtLink>
    </div>
  </v-form>
</template>
