import { reactive, ref } from 'vue'
import { authClient } from '~/shared/api/auth-client'

export function useLoginForm() {
  const route = useRoute()
  const form = reactive({ email: '', password: '' })
  const pending = ref(false)
  const errorMessage = ref<string | null>(null)

  async function submit() {
    errorMessage.value = null
    pending.value = true

    await authClient.signIn.email(
      { email: form.email, password: form.password },
      {
        onError: (ctx) => {
          errorMessage.value =
            ctx.error.status === 403
              ? 'Please verify your email before signing in.'
              : ctx.error.status === 401
                ? 'Invalid email or password.'
                : 'Something went wrong. Please try again.'
        },
        onSuccess: async () => {
          const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
          await navigateTo(redirect)
        }
      }
    )
    pending.value = false
  }

  return { form, pending, errorMessage, submit }
}
