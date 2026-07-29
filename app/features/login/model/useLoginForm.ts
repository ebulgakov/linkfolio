import { reactive, ref } from "vue";

import { authClient } from "~/shared/api/auth-client";

export function sanitizeRedirect(candidate: unknown): string {
  if (typeof candidate !== "string" || !candidate) return "/";
  try {
    const url = new URL(candidate, window.location.origin);
    return url.origin === window.location.origin ? `${url.pathname}${url.search}${url.hash}` : "/";
  } catch {
    return "/";
  }
}

export function useLoginForm() {
  const { t } = useI18n();
  const route = useRoute();
  const form = reactive({ email: "", password: "" });
  const pending = ref(false);
  const errorMessage = ref<string | null>(null);

  async function submit() {
    errorMessage.value = null;
    pending.value = true;

    try {
      await authClient.signIn.email(
        { email: form.email, password: form.password },
        {
          onError: ctx => {
            errorMessage.value =
              ctx.error.status === 403
                ? t("login.errors.notVerified")
                : ctx.error.status === 401
                  ? t("login.errors.invalidCredentials")
                  : t("errors.generic");
          },
          onSuccess: async () => {
            await refreshNuxtData("auth-session");
            await navigateTo(sanitizeRedirect(route.query.redirect));
          }
        }
      );
    } catch {
      errorMessage.value ??= t("errors.generic");
    } finally {
      pending.value = false;
    }
  }

  return { form, pending, errorMessage, submit };
}
