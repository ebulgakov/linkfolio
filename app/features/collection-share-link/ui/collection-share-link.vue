<script lang="ts" setup>
import { useClipboard } from "~/shared/lib";

const props = defineProps<{ slug: string }>();

const { t } = useI18n();
const requestUrl = useRequestURL();
const shareUrl = computed(() => `${requestUrl.origin}/shared/${props.slug}`);
const { copy, copied } = useClipboard();

function onCopyClick() {
  copy(shareUrl.value);
}
</script>

<template>
  <div class="d-flex align-center ga-2 mb-4">
    <v-text-field
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
  </div>
</template>
