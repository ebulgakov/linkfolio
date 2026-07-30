<script lang="ts" setup>
import { ForgotPasswordForm } from "~/features/forgot-password";
import { AuthCard } from "~/shared/ui";

definePageMeta({ middleware: "guest" });

const { t } = useI18n();
</script>

<template>
  <AuthCard :title="t('pages.forgotPassword.title')">
    <ForgotPasswordForm />
  </AuthCard>
</template>
