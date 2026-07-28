<script lang="ts" setup>
import { SignupForm } from '~/features/signup'
</script>

<template>
  <a-flex justify="center" align="center" style="min-height: 100vh; padding: 24px">
    <a-card title="Sign up" style="width: 100%; max-width: 400px">
      <SignupForm />
    </a-card>
  </a-flex>
</template>
