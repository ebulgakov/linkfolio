<script lang="ts" setup>
import { SignupForm } from "~/features/signup";

definePageMeta({ middleware: "guest" });

const { t } = useI18n();
</script>

<template>
  <v-container class="fill-height d-flex align-center justify-center">
    <v-card :title="t('pages.signup.title')" style="width: 100%; max-width: 400px">
      <v-card-text>
        <SignupForm />
      </v-card-text>
    </v-card>
  </v-container>
</template>
