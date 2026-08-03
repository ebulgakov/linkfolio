<script lang="ts" setup>
import { useResetPasswordForm } from "~/features/reset-password";
import { minLength, required } from "~/shared/lib";
import { Alert, Input } from "~/shared/ui";

const { t } = useI18n();
const { form, pending, errorMessage, success, hasValidToken, submit } = useResetPasswordForm();

const formRef = useTemplateRef("formRef");
const showPassword = ref(false);

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

    <template v-if="success">
      <Alert type="success" :text="t('resetPassword.success')" class="mb-4" />
      <div class="d-flex justify-center mt-4">
        <NuxtLink to="/login" class="text-primary">{{ t("resetPassword.backToLogin") }}</NuxtLink>
      </div>
    </template>

    <template v-else-if="hasValidToken">
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

      <v-btn type="submit" color="primary" :loading="pending" :disabled="pending" block>
        {{ t("resetPassword.submit") }}
      </v-btn>
    </template>

    <template v-else>
      <Alert type="error" :text="t('resetPassword.errors.invalidToken')" class="mb-4" />
      <div class="d-flex justify-center mt-4">
        <NuxtLink to="/forgot-password" class="text-primary">{{
          t("resetPassword.requestNewLink")
        }}</NuxtLink>
      </div>
    </template>
  </v-form>
</template>
