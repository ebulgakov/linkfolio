import { reactive, ref } from "vue";

import { authClient } from "~/shared/api/auth-client";

export function useSignupForm() {
  const { t } = useI18n();
  const form = reactive({ email: "", password: "" });
  const pending = ref(false);
  const errorMessage = ref<string | null>(null);
  const showForgotPasswordLink = ref(false);

  async function submit() {
    errorMessage.value = null;
    showForgotPasswordLink.value = false;
    pending.value = true;
    const name = form.email.split("@")[0] || form.email;

    try {
      await authClient.signUp.email(
        { email: form.email, password: form.password, name },
        {
          onError: ctx => {
            const emailTaken =
              ctx.error.status === 422 ||
              ctx.error.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL";
            showForgotPasswordLink.value = emailTaken;
            errorMessage.value = emailTaken ? t("signup.errors.emailTaken") : t("errors.generic");
          },
          onSuccess: async () => {
            const session = await authClient.getSession();
            if (session?.data) {
              await refreshNuxtData("auth-session");
              await navigateTo("/");
            } else {
              errorMessage.value = t("signup.success.unverified");
            }
          }
        }
      );
    } catch {
      errorMessage.value ??= t("errors.generic");
    } finally {
      pending.value = false;
    }
  }

  return { form, pending, errorMessage, showForgotPasswordLink, submit };
}
