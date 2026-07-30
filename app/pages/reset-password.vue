<script lang="ts" setup>
import { ResetPasswordForm } from "~/features/reset-password";
import { AuthCard } from "~/shared/ui";

definePageMeta({ middleware: "guest" });

const { t } = useI18n();
</script>

<template>
  <AuthCard :title="t('pages.resetPassword.title')">
    <ResetPasswordForm />
  </AuthCard>
</template>
