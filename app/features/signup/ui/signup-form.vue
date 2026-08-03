<script lang="ts" setup>
import { useSignupForm } from "~/features/signup";
import { email, minLength, required } from "~/shared/lib";
import { Alert, Input } from "~/shared/ui";

const { t } = useI18n();
const { form, pending, errorMessage, showForgotPasswordLink, submit } = useSignupForm();

const formRef = useTemplateRef("formRef");
const showPassword = ref(false);

const emailRules = computed(() => [
  required(t("validation.emailRequired")),
  email(t("validation.emailInvalid"))
]);
const passwordRules = computed(() => [
  required(t("validation.passwordRequired")),
  minLength(8, t("validation.passwordMinLength", { min: 8 }))
]);

async function onSubmit() {
  const { valid: isValid } = await formRef.value!.validate();
  if (!isValid) return;
  await submit();
}
</script>

<template>
  <v-form ref="formRef" @submit.prevent="onSubmit">
    <Alert v-if="errorMessage" type="error" :text="errorMessage" class="mb-4" />

    <Input
      v-model="form.email"
      :label="t('forms.email')"
      type="email"
      autocomplete="email"
      :rules="emailRules"
    />

    <Input
      v-model="form.password"
      :label="t('forms.password')"
      :type="showPassword ? 'text' : 'password'"
      autocomplete="new-password"
      :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
      :rules="passwordRules"
      :aria-label="showPassword ? t('forms.hidePassword') : t('forms.showPassword')"
      @click:append-inner="showPassword = !showPassword"
    />

    <div v-if="showForgotPasswordLink" class="d-flex justify-end mb-4">
      <NuxtLink to="/forgot-password" class="text-primary">{{
        t("auth.forgotPasswordLink")
      }}</NuxtLink>
    </div>

    <v-btn type="submit" color="primary" :loading="pending" :disabled="pending" block>
      {{ t("signup.submit") }}
    </v-btn>

    <div class="d-flex justify-center mt-4">
      <span>{{ t("signup.haveAccountPrompt") }}&nbsp;</span>
      <NuxtLink to="/login" class="text-primary">{{ t("signup.haveAccountLink") }}</NuxtLink>
    </div>
  </v-form>
</template>
