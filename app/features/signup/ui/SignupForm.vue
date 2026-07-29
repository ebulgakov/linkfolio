<script lang="ts" setup>
import { useSignupForm } from "~/features/signup";
import { email, minLength, required } from "~/shared/lib/validators";

const { form, pending, errorMessage, submit } = useSignupForm();

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
      autocomplete="new-password"
      :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
      :rules="[
        required('Password is required'),
        minLength(8, 'Password must be at least 8 characters')
      ]"
      :aria-label="showPassword ? 'Hide password' : 'Show password'"
      @click:append-inner="showPassword = !showPassword"
    />

    <v-btn type="submit" color="primary" :loading="pending" :disabled="pending" block>
      Sign up
    </v-btn>

    <div class="d-flex justify-center mt-4">
      <NuxtLink to="/login" class="text-primary">Already have an account? Log in</NuxtLink>
    </div>
  </v-form>
</template>
