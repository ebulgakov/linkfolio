<script lang="ts" setup>
import type { SharedLinkItem } from "~/shared/api";

const props = defineProps<{ link: SharedLinkItem }>();

const { t } = useI18n();

const displayTitle = computed(() => props.link.title || props.link.url);
</script>

<template>
  <v-card>
    <v-img v-if="link.imageUrl" :src="link.imageUrl" :alt="displayTitle" height="160" cover />
    <div v-else class="d-flex align-center justify-center bg-surface-variant" style="height: 160px">
      <v-icon icon="mdi-link-variant" size="48" />
    </div>

    <v-card-title class="text-truncate">{{ displayTitle }}</v-card-title>

    <v-card-text v-if="link.description">{{ link.description }}</v-card-text>

    <v-card-actions>
      <v-btn
        :href="link.url"
        target="_blank"
        rel="noopener noreferrer"
        icon="mdi-open-in-new"
        variant="text"
        :aria-label="t('links.card.openLink')"
      />
    </v-card-actions>
  </v-card>
</template>
