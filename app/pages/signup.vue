<script lang="ts" setup>
import { SignupForm } from "~/features/signup";
import { AuthCard } from "~/shared/ui";

definePageMeta({ middleware: "guest" });

const { t } = useI18n();
</script>

<template>
  <AuthCard :title="t('pages.signup.title')">
    <SignupForm />
  </AuthCard>
</template>
