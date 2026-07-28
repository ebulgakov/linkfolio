<script lang="ts" setup>
import { useSignupForm } from '~/features/signup'

const { form, pending, errorMessage, submit } = useSignupForm()
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
      :rules="[
        { required: true, message: 'Password is required' },
        { min: 8, message: 'Password must be at least 8 characters' }
      ]"
    >
      <a-input-password v-model:value="form.password" autocomplete="new-password" />
    </a-form-item>

    <a-form-item>
      <a-button type="primary" html-type="submit" :loading="pending" block>
        Sign up
      </a-button>
    </a-form-item>
  </a-form>
</template>
