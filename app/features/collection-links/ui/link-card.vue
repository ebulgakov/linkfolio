<script lang="ts" setup>
import type { LinkItem } from "~/shared/api";

const props = defineProps<{ link: LinkItem; collectionId: string }>();

const emit = defineEmits<{ delete: [linkId: string] }>();

const { t } = useI18n();

const displayTitle = computed(() => props.link.title || props.link.url);

const statusConfig = computed(() => {
  switch (props.link.fetchStatus) {
    case "fetched":
      return { label: t("links.card.statusFetched"), color: "success" };
    case "failed":
      return { label: t("links.card.statusFailed"), color: "error" };
    default:
      return { label: t("links.card.statusPending"), color: "default" };
  }
});

function onDeleteClick() {
  emit("delete", props.link.id);
}
</script>

<template>
  <v-card>
    <v-img v-if="link.imageUrl" :src="link.imageUrl" height="160" cover />
    <div v-else class="d-flex align-center justify-center bg-surface-variant" style="height: 160px">
      <v-icon icon="mdi-link-variant" size="48" />
    </div>

    <v-card-title class="text-truncate">{{ displayTitle }}</v-card-title>

    <v-card-text v-if="link.description">{{ link.description }}</v-card-text>

    <v-card-text>
      <v-chip size="small" :color="statusConfig.color">{{ statusConfig.label }}</v-chip>
    </v-card-text>

    <v-card-actions>
      <v-btn
        :href="link.url"
        target="_blank"
        rel="noopener noreferrer"
        icon="mdi-open-in-new"
        variant="text"
        :aria-label="t('links.card.openLink')"
      />
      <!--
        v-btn with `:to` (not a NuxtLink wrapping a v-btn): Vuetify's router
        integration makes v-btn itself render as the anchor when `to` is
        set, same as the open-link button above does via `href`. Nesting a
        plain v-btn inside a NuxtLink would put a <button> inside an <a> -
        invalid HTML and broken keyboard/screen-reader navigation, the same
        pitfall called out in collections/index.vue's list markup.
      -->
      <v-btn
        :to="`/collections/${collectionId}/links/${link.id}/edit`"
        icon="mdi-pencil"
        variant="text"
        :aria-label="t('links.card.editLink')"
      />
      <v-spacer />
      <v-btn
        icon="mdi-delete"
        variant="text"
        color="error"
        :aria-label="t('links.card.deleteButton')"
        @click="onDeleteClick"
      />
    </v-card-actions>
  </v-card>
</template>
