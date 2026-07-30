import { reactive, ref } from "vue";

import { authClient } from "~/shared/api/auth-client";

export function useForgotPasswordForm() {
  const { t } = useI18n();
  const form = reactive({ email: "" });
  const pending = ref(false);
  const errorMessage = ref<string | null>(null);
  const submitted = ref(false);

  async function submit() {
    errorMessage.value = null;
    submitted.value = false;
    pending.value = true;

    try {
      await authClient.requestPasswordReset(
        { email: form.email, redirectTo: `${window.location.origin}/reset-password` },
        {
          onError: () => {
            errorMessage.value = t("errors.generic");
          },
          onSuccess: () => {
            submitted.value = true;
          }
        }
      );
    } catch {
      errorMessage.value ??= t("errors.generic");
    } finally {
      pending.value = false;
    }
  }

  return { form, pending, errorMessage, submitted, submit };
}
