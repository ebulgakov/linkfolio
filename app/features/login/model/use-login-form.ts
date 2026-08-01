import { reactive, ref } from "vue";

import { authClient } from "~/shared/api";

export function sanitizeRedirect(candidate: unknown): string {
  if (typeof candidate !== "string" || !candidate) return "/collections";
  try {
    const url = new URL(candidate, window.location.origin);
    // A same-origin URL can still carry a pathname starting with "//" (e.g.
    // "https://this-origin//evil.com/phish") - Nuxt's navigateTo treats such
    // a value as a protocol-relative external URL (hasProtocol(...,
    // { acceptRelative: true })), so returning it as-is would hand an
    // external destination to a caller that never opted into external
    // navigation. Reject it same as an off-origin candidate.
    return url.origin === window.location.origin && !url.pathname.startsWith("//")
      ? `${url.pathname}${url.search}${url.hash}`
      : "/collections";
  } catch {
    return "/collections";
  }
}

export function useLoginForm() {
  const { t } = useI18n();
  const route = useRoute();
  const form = reactive({ email: "", password: "" });
  const pending = ref(false);
  const errorMessage = ref<string | null>(null);
  const showForgotPasswordLink = ref(false);

  async function submit() {
    errorMessage.value = null;
    showForgotPasswordLink.value = false;
    pending.value = true;

    try {
      await authClient.signIn.email(
        { email: form.email, password: form.password },
        {
          onError: ctx => {
            if (ctx.error.status === 401) {
              showForgotPasswordLink.value = true;
            }
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

  return { form, pending, errorMessage, showForgotPasswordLink, submit };
}
