<script lang="ts" setup>
import { useLoginForm } from '~/features/login'

const { form, pending, errorMessage, submit } = useLoginForm()
</script>

<template>
  <a-form layout="vertical" :model="form" @finish="submit">
    <a-alert
      v-if="errorMessage"
      type="error"
      :message="errorMessage"
      show-icon
      style="margin-bottom: 16px"
    />

    <a-form-item
      label="Email"
      name="email"
      :rules="[
        { required: true, message: 'Email is required' },
        { type: 'email', message: 'Please enter a valid email' }
      ]"
    >
      <a-input v-model:value="form.email" type="email" autocomplete="email" />
    </a-form-item>

    <a-form-item
      label="Password"
      name="password"
      :rules="[{ required: true, message: 'Password is required' }]"
    >
      <a-input-password v-model:value="form.password" autocomplete="current-password" />
    </a-form-item>

    <a-form-item>
      <a-button type="primary" html-type="submit" :loading="pending" block>
        Log in
      </a-button>
    </a-form-item>

    <a-flex justify="center">
      <NuxtLink to="/signup">Don't have an account? Sign up</NuxtLink>
    </a-flex>
  </a-form>
</template>
