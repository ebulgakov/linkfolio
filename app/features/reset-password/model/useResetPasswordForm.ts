import { computed, reactive, ref } from "vue";

import { authClient } from "~/shared/api/auth-client";

export function useResetPasswordForm() {
  const { t } = useI18n();
  const route = useRoute();
  const token = computed(() =>
    typeof route.query.token === "string" ? route.query.token : undefined
  );
  const hasValidToken = computed(() => !!token.value);

  const form = reactive({ password: "" });
  const pending = ref(false);
  const errorMessage = ref<string | null>(null);
  const success = ref(false);

  async function submit() {
    if (!token.value) return;

    errorMessage.value = null;
    success.value = false;
    pending.value = true;

    try {
      await authClient.resetPassword(
        { newPassword: form.password, token: token.value },
        {
          onError: ctx => {
            errorMessage.value =
              ctx.error.code === "INVALID_TOKEN"
                ? t("resetPassword.errors.invalidToken")
                : t("errors.generic");
          },
          onSuccess: () => {
            success.value = true;
          }
        }
      );
    } catch {
      errorMessage.value ??= t("errors.generic");
    } finally {
      pending.value = false;
    }
  }

  return { form, pending, errorMessage, success, hasValidToken, submit };
}
