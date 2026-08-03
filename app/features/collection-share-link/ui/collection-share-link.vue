<script lang="ts" setup>
import { useCollectionShareLink } from "../model/use-collection-share-link";

import { Input } from "~/shared/ui";

const props = defineProps<{ slug: string }>();

const { t } = useI18n();
const { shareUrl, copied, copyFailed, onCopyClick } = useCollectionShareLink(props.slug);
</script>

<template>
  <div class="d-flex align-center ga-2 mb-4">
    <Input
      :model-value="shareUrl"
      :label="t('collections.detail.shareLinkLabel')"
      readonly
      density="compact"
      hide-details
      style="max-width: 420px"
    />
    <v-btn
      icon="mdi-content-copy"
      variant="text"
      :aria-label="t('collections.detail.copyButton')"
      @click="onCopyClick"
    />
    <v-snackbar v-model="copied" timeout="2000">{{ t("collections.detail.copied") }}</v-snackbar>
    <v-snackbar v-model="copyFailed" timeout="3000" color="error">{{
      t("errors.generic")
    }}</v-snackbar>
  </div>
</template>
