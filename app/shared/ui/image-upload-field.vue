<script lang="ts" setup>
import { ref, watch } from "vue";

import Alert from "./app-alert.vue";

import { useImageUpload } from "~/shared/lib";

const props = defineProps<{ modelValue: string | null }>();
const emit = defineEmits<{
  "update:modelValue": [value: string | null];
  // Lets a parent form block/disable submission while an upload is still in
  // flight - without this, submitting between "file picked" and "uploadImage()
  // resolves" would save the old imageUrl while the new Blob upload
  // completes with nothing in the database ever pointing at it.
  "update:pending": [value: boolean];
}>();

const { t } = useI18n();

const { pending, error, canUseClipboardReadApi, onFileSelected, pasteFromClipboard, remove } =
  useImageUpload(props, emit);

watch(pending, value => emit("update:pending", value), { immediate: true });

// Vuetify's own local model for the file picker - reset right after every
// pick so re-selecting the same file later still fires a change (the native
// <input> otherwise won't emit for an unchanged value).
const pickedFile = ref<File | null>(null);

function handleFilePick(fileOrFiles: File | File[] | null) {
  onFileSelected(fileOrFiles);
  pickedFile.value = null;
}
</script>

<template>
  <!--
    No @paste listener here - the primary clipboard path is registered on
    `document` inside useImageUpload() itself, so Ctrl+V works regardless of
    which element on the page currently has focus (see the composable for
    why). This div is a plain layout wrapper.
  -->
  <div class="image-upload-field">
    <!--
      Plain v-img, deliberately NOT NuxtImg: @nuxt/image (nuxt.config.ts) is
      configured with a Cloudinary provider whose baseURL is hardcoded for
      this app's static branding assets (app/shared/ui/logo). Routing an
      absolute Vercel Blob upload URL through that provider would mangle it -
      do not "optimize" this back to NuxtImg.
    -->
    <v-img
      v-if="modelValue"
      :src="modelValue"
      :alt="t('forms.imageUpload.previewAlt')"
      max-height="160"
      max-width="240"
      class="mb-2"
    />

    <v-file-input
      v-model="pickedFile"
      :label="t('forms.imageUpload.chooseFileLabel')"
      accept="image/png,image/jpeg,image/gif,image/webp"
      :disabled="pending"
      density="comfortable"
      @update:model-value="handleFilePick"
    />

    <div class="d-flex align-center ga-2 mb-2">
      <v-btn
        v-if="canUseClipboardReadApi"
        variant="tonal"
        size="small"
        type="button"
        :disabled="pending"
        @click="pasteFromClipboard"
      >
        {{ t("forms.imageUpload.pasteButton") }}
      </v-btn>

      <v-btn
        v-if="modelValue"
        variant="text"
        size="small"
        color="error"
        type="button"
        :disabled="pending"
        @click="remove"
      >
        {{ t("forms.imageUpload.removeButton") }}
      </v-btn>

      <template v-if="pending">
        <v-progress-circular indeterminate size="20" width="2" />
        <span class="text-caption">{{ t("forms.imageUpload.uploadingLabel") }}</span>
      </template>
    </div>

    <Alert v-if="error" type="error" :text="error" />
  </div>
</template>
