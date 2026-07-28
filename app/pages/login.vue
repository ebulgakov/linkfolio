<script lang="ts" setup>
import { LoginForm } from '~/features/login'

definePageMeta({ middleware: 'guest' })
</script>

<template>
  <a-flex justify="center" align="center" style="min-height: 100vh; padding: 24px">
    <a-card title="Log in" style="width: 100%; max-width: 400px">
      <LoginForm />
    </a-card>
  </a-flex>
</template>
