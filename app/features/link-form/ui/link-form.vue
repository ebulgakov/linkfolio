<script lang="ts" setup>
import type { LinkItem } from "~/shared/api";

import { useLinkForm } from "~/features/link-form";
import { required, url } from "~/shared/lib";
import { Alert } from "~/shared/ui";

const props = defineProps<{ collectionId: string; link?: LinkItem }>();

// See collection-form.vue for why this local interface exists instead of
// relying on Vuetify's ambient `VForm` type: Vuetify isn't a direct
// dependency of this app, so its type can't actually resolve from this
// file's module-resolution context.
interface VFormInstance {
  validate: () => Promise<{
    valid: boolean;
    errors: { id: number | string; errorMessages: string[] }[];
  }>;
}

const { t } = useI18n();
const {
  isEditing,
  form,
  pending,
  errorMessage,
  errors,
  previewStatus,
  submitDisabled,
  onTitleInput,
  onDescriptionInput,
  onImageUrlInput,
  submit
} = useLinkForm(props.collectionId, props.link);

const formRef = useTemplateRef<VFormInstance>("formRef");

const urlRules = computed(() => [
  required(t("validation.urlRequired")),
  url(t("validation.urlInvalid"))
]);

const previewStatusMessage = computed(() => {
  switch (previewStatus.value) {
    case "checking":
      return t("links.form.previewChecking");
    case "fetched":
      return t("links.form.previewFetched");
    case "failed":
      return t("links.form.previewFailed");
    default:
      return undefined;
  }
});

async function onSubmit() {
  const { valid: isValid } = await formRef.value!.validate();
  if (!isValid) return;
  await submit();
}
</script>

<template>
  <v-form ref="formRef" @submit.prevent="onSubmit">
    <Alert v-if="errorMessage" type="error" :text="errorMessage" class="mb-4" />

    <Alert
      v-if="isEditing"
      type="warning"
      variant="tonal"
      :text="t('links.form.editSharedWarning')"
      class="mb-4"
    />

    <v-text-field
      v-if="isEditing"
      :model-value="form.url"
      :label="t('links.form.urlLabel')"
      :hint="t('links.form.urlReadonlyHint')"
      persistent-hint
      readonly
    />
    <v-text-field
      v-else
      v-model="form.url"
      :label="t('links.form.urlLabel')"
      :rules="urlRules"
      :error-messages="errors.url"
      :hint="previewStatusMessage"
      persistent-hint
    >
      <template #append-inner>
        <v-progress-circular
          v-if="previewStatus === 'checking'"
          indeterminate
          size="20"
          width="2"
        />
        <v-icon v-else-if="previewStatus === 'fetched'" icon="mdi-check-circle" color="success" />
        <v-icon v-else-if="previewStatus === 'failed'" icon="mdi-alert-circle" color="warning" />
      </template>
    </v-text-field>

    <!--
      The hint above conveys checking/fetched/failed transitions visually
      only. This mirrors it into an aria-live region (visually hidden, since
      the hint text is already visible) so screen-reader users are notified
      of the async prefill too.
    -->
    <span class="visually-hidden" aria-live="polite">{{ previewStatusMessage }}</span>

    <!--
      Deliberately :model-value + @update:model-value instead of v-model:
      the on*Input handlers flip the composable's per-field dirty flag
      before writing the form value. Switching these to v-model would bypass
      that flag, so an incoming preview response could keep silently
      overwriting the user's manually-typed value.
    -->
    <v-text-field
      :model-value="form.title"
      :label="t('links.form.titleLabel')"
      :error-messages="errors.title"
      @update:model-value="onTitleInput"
    />

    <v-textarea
      :model-value="form.description"
      :label="t('links.form.descriptionLabel')"
      :error-messages="errors.description"
      rows="3"
      @update:model-value="onDescriptionInput"
    />

    <v-text-field
      :model-value="form.imageUrl"
      :label="t('links.form.imageUrlLabel')"
      :error-messages="errors.imageUrl"
      @update:model-value="onImageUrlInput"
    />

    <v-btn type="submit" color="primary" :loading="pending" :disabled="submitDisabled" block>
      {{ isEditing ? t("links.form.editSubmit") : t("links.form.createSubmit") }}
    </v-btn>
  </v-form>
</template>

<style scoped>
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
