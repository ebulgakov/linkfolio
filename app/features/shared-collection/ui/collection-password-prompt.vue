<script lang="ts" setup>
import type { SharedLinkItem } from "~/shared/api";

import { useCollectionUnlock } from "~/features/shared-collection";
import { Alert } from "~/shared/ui";

const props = defineProps<{ slug: string }>();
const emit = defineEmits<{ unlocked: [links: SharedLinkItem[]] }>();

const { t } = useI18n();
const { password, pending, errorMessage, submit } = useCollectionUnlock(props.slug);

async function onSubmit() {
  const links = await submit();
  if (links) emit("unlocked", links);
}
</script>

<template>
  <v-form @submit.prevent="onSubmit">
    <Alert v-if="errorMessage" type="error" :text="errorMessage" class="mb-4" />

    <v-text-field
      v-model="password"
      type="password"
      :label="t('sharedCollection.passwordPrompt.label')"
    />

    <v-btn type="submit" color="primary" :loading="pending" block>
      {{ t("sharedCollection.passwordPrompt.submit") }}
    </v-btn>
  </v-form>
</template>
