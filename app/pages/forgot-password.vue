<script lang="ts" setup>
import { ForgotPasswordForm } from "~/features/forgot-password";

definePageMeta({ middleware: "guest" });

const { t } = useI18n();
</script>

<template>
  <v-container class="fill-height d-flex align-center justify-center">
    <v-card :title="t('pages.forgotPassword.title')" style="width: 100%; max-width: 400px">
      <v-card-text>
        <ForgotPasswordForm />
      </v-card-text>
    </v-card>
  </v-container>
</template>
