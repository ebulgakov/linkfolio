import { reactive, ref } from "vue";

import { authClient } from "~/shared/api/auth-client";

function sanitizeRedirect(candidate: unknown): string {
  if (typeof candidate !== "string" || !candidate) return "/";
  try {
    const url = new URL(candidate, window.location.origin);
    return url.origin === window.location.origin ? `${url.pathname}${url.search}${url.hash}` : "/";
  } catch {
    return "/";
  }
}

export function useLoginForm() {
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
                ? "Please verify your email before signing in."
                : ctx.error.status === 401
                  ? "Invalid email or password."
                  : "Something went wrong. Please try again.";
          },
          onSuccess: async () => {
            await navigateTo(sanitizeRedirect(route.query.redirect));
          }
        }
      );
    } catch {
      errorMessage.value ??= "Something went wrong. Please try again.";
    } finally {
      pending.value = false;
    }
  }

  return { form, pending, errorMessage, submit };
}
