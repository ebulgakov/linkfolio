<script lang="ts" setup>
import { ResetPasswordForm } from "~/features/reset-password";

definePageMeta({ middleware: "guest" });

const { t } = useI18n();
</script>

<template>
  <v-container class="fill-height d-flex align-center justify-center">
    <v-card :title="t('pages.resetPassword.title')" style="width: 100%; max-width: 400px">
      <v-card-text>
        <ResetPasswordForm />
      </v-card-text>
    </v-card>
  </v-container>
</template>
