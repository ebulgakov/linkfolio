<script lang="ts" setup>
import { useForgotPasswordForm } from "~/features/forgot-password";
import { email, required } from "~/shared/lib/validators";

const { t } = useI18n();
const { form, pending, errorMessage, submitted, submit } = useForgotPasswordForm();

const formRef = useTemplateRef("formRef");

const emailRules = computed(() => [
  required(t("validation.emailRequired")),
  email(t("validation.emailInvalid"))
]);

async function onSubmit() {
  const { valid: isValid } = await formRef.value!.validate();
  if (!isValid) return;
  await submit();
}
</script>

<template>
  <v-form ref="formRef" @submit.prevent="onSubmit">
    <v-alert v-if="errorMessage" type="error" :text="errorMessage" class="mb-4" />

    <template v-if="!submitted">
      <v-text-field
        v-model="form.email"
        :label="t('forms.email')"
        type="email"
        autocomplete="email"
        :rules="emailRules"
      />

      <v-btn type="submit" color="primary" :loading="pending" :disabled="pending" block>
        {{ t("forgotPassword.submit") }}
      </v-btn>
    </template>

    <v-alert v-else type="success" :text="t('forgotPassword.success')" class="mb-4" />

    <div class="d-flex justify-center mt-4">
      <NuxtLink to="/login" class="text-primary">{{ t("forgotPassword.backToLogin") }}</NuxtLink>
    </div>
  </v-form>
</template>
