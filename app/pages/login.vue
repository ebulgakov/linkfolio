<script lang="ts" setup>
import { LoginForm } from "~/features/login";

definePageMeta({ middleware: "guest" });
</script>

<template>
  <v-container class="fill-height d-flex align-center justify-center">
    <v-card title="Log in" style="width: 100%; max-width: 400px">
      <v-card-text>
        <LoginForm />
      </v-card-text>
    </v-card>
  </v-container>
</template>
