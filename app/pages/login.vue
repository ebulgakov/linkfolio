<script lang="ts" setup>
import { LoginForm } from "~/features/login";
import AuthCard from "~/shared/ui/AuthCard.vue";

definePageMeta({ middleware: "guest" });

const { t } = useI18n();
</script>

<template>
  <AuthCard :title="t('pages.login.title')">
    <LoginForm />
  </AuthCard>
</template>
