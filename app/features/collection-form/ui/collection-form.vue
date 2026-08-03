<script lang="ts" setup>
import type { Collection } from "~/shared/api";

import { useCollectionForm } from "~/features/collection-form";
import { required, slug, url } from "~/shared/lib";
import { Alert, Input } from "~/shared/ui";

const props = defineProps<{ collection?: Collection }>();

// `GlobalComponents["VForm"]` (from Vuetify's ambient `vue` module
// augmentation) type-checks but silently resolves to `any` here: Vuetify
// isn't a direct dependency of this app (only vuetify-nuxt-module is), so
// its nested `import('vuetify/components')` type query can't actually
// resolve from this file's module-resolution context, and
// `skipLibCheck: true` hides the failure instead of erroring. An explicit
// `import { VForm } from "vuetify/components"` fails outright for the same
// reason - "vuetify" isn't resolvable as a bare specifier here. So the ref
// is typed against VForm's actual exposed `validate()` shape instead,
// copied from vuetify/lib/components/VForm/VForm.d.ts - narrower than the
// full instance type, but real (not `any`) for the one method this
// component calls.
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
  slugStatus,
  submitDisabled,
  showShareWarning,
  showPassword,
  onSlugInput,
  submit,
  confirmAndSubmit,
  cancelShareWarning
} = useCollectionForm(props.collection);

const formRef = useTemplateRef<VFormInstance>("formRef");

const nameRules = computed(() => [required(t("validation.nameRequired"))]);
const slugRules = computed(() => [
  required(t("validation.slugRequired")),
  slug(t("validation.slugInvalid"))
]);
const imageUrlRules = computed(() => [url(t("validation.urlInvalid"))]);

const slugStatusMessage = computed(() => {
  switch (slugStatus.value) {
    case "checking":
      return t("collections.form.slugChecking");
    case "free":
      return t("collections.form.slugAvailable");
    case "taken":
      return t("collections.form.slugTaken");
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

    <Input
      v-model="form.name"
      :label="t('collections.form.nameLabel')"
      :rules="nameRules"
      :error-messages="errors.name"
    />

    <!--
      Deliberately :model-value + @update:model-value instead of v-model:
      onSlugInput() flips the composable's dirty flag before writing
      form.slug. Switching this to v-model="form.slug" would bypass that
      flag, so auto-sync from `name` would keep silently overwriting the
      user's manually-typed slug on every subsequent name keystroke.
    -->
    <Input
      :model-value="form.slug"
      :label="t('collections.form.slugLabel')"
      :rules="slugRules"
      :error-messages="errors.slug"
      :hint="slugStatusMessage"
      persistent-hint
      @update:model-value="onSlugInput"
    >
      <template #append-inner>
        <v-progress-circular v-if="slugStatus === 'checking'" indeterminate size="20" width="2" />
        <v-icon v-else-if="slugStatus === 'free'" icon="mdi-check-circle" color="success" />
        <v-icon v-else-if="slugStatus === 'taken'" icon="mdi-close-circle" color="error" />
      </template>
    </Input>

    <v-textarea
      v-model="form.description"
      :label="t('collections.form.descriptionLabel')"
      :error-messages="errors.description"
      rows="3"
    />

    <v-switch
      v-model="form.shared"
      :label="t('collections.form.sharedLabel')"
      color="primary"
      :error-messages="errors.shared"
    />

    <v-switch
      v-model="form.published"
      :label="t('collections.form.publishedLabel')"
      color="primary"
      :error-messages="errors.published"
    />

    <!--
      Deliberately a plain, unmasked text field (no type="password") - the
      owner must always be able to see the current value here, unlike a real
      password input. See use-collection-form.ts: this is stored and
      round-tripped as plain text, not hashed.

      v-if="showPassword" - tri-state visibility from the composable: hidden
      by default, shown once shared, hidden again once published. The value
      itself is left untouched in form state while hidden, so re-toggling
      published back off restores it without the user retyping anything.
    -->
    <Input
      v-if="showPassword"
      v-model="form.password"
      :label="t('collections.form.passwordLabel')"
      :hint="t('collections.form.passwordHint')"
      persistent-hint
      :error-messages="errors.password"
    />

    <Input
      v-model="form.imageUrl"
      :label="t('collections.form.imageUrlLabel')"
      :rules="imageUrlRules"
      :error-messages="errors.imageUrl"
    />

    <v-btn type="submit" color="primary" :loading="pending" :disabled="submitDisabled" block>
      {{ isEditing ? t("collections.form.editSubmit") : t("collections.form.createSubmit") }}
    </v-btn>

    <!--
      Nested inside v-form so the component has a single root node (lets a
      parent's attrs, e.g. class, auto-inherit onto the form element).
      Vuetify teleports the dialog's content to <body>, so it never ends up
      nested in the form's DOM, and its buttons default to type="button" -
      neither submits the outer form.
    -->
    <v-dialog v-model="showShareWarning" max-width="480">
      <v-card>
        <v-card-title>{{ t("collections.shareWarning.title") }}</v-card-title>
        <v-card-text>{{ t("collections.shareWarning.message") }}</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="cancelShareWarning">
            {{ t("collections.shareWarning.cancel") }}
          </v-btn>
          <v-btn color="primary" :loading="pending" @click="confirmAndSubmit">
            {{ t("collections.shareWarning.confirm") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-form>
</template>
