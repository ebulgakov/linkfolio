import { reactive, ref } from "vue";

import { authClient } from "~/shared/api/auth-client";

export function useSignupForm() {
  const form = reactive({ email: "", password: "" });
  const pending = ref(false);
  const errorMessage = ref<string | null>(null);

  async function submit() {
    errorMessage.value = null;
    pending.value = true;
    const name = form.email.split("@")[0] || form.email;

    await authClient.signUp.email(
      { email: form.email, password: form.password, name },
      {
        onError: ctx => {
          errorMessage.value =
            ctx.error.status === 422 || ctx.error.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"
              ? "This email is already registered."
              : "Something went wrong. Please try again.";
        },
        onSuccess: async () => {
          const session = await authClient.getSession();
          if (session?.data) {
            await navigateTo("/");
          } else {
            errorMessage.value =
              "Signup succeeded, but you need to verify your email before signing in.";
          }
        }
      }
    );
    pending.value = false;
  }

  return { form, pending, errorMessage, submit };
}
