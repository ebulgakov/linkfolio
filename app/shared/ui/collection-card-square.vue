<script lang="ts" setup>
import { computed } from "vue";

import { NuxtLink } from "#components";

const props = defineProps<{
  to?: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  noFlip?: boolean;
}>();

const canFlip = computed(() => !!props.description && !props.noFlip);
</script>

<template>
  <div
    class="collection-card-square rounded elevation-1"
    :class="{ 'collection-card-square--flip': canFlip }"
  >
    <component
      :is="to ? NuxtLink : 'div'"
      v-bind="to ? { to } : {}"
      class="collection-card-square__flipper"
    >
      <div class="collection-card-square__face collection-card-square__face--front">
        <v-img v-if="imageUrl" :src="imageUrl" :alt="title" cover class="fill-height" />
        <div v-else class="d-flex align-center justify-center bg-surface-variant fill-height">
          <v-icon icon="mdi-folder-multiple-outline" size="48" />
        </div>

        <div class="collection-card-square__scrim">
          <div class="text-truncate text-white text-h6">{{ title }}</div>
        </div>
      </div>

      <!-- Back face is text-only by design: it shares the front's single
           anchor as the card's only tab stop, so it must never gain a
           focusable element - that would create a hidden-but-tabbable
           control while the face is rotated away from view. -->
      <div v-if="canFlip" class="collection-card-square__face collection-card-square__face--back">
        <p class="collection-card-square__description text-body-2">{{ description }}</p>
      </div>
    </component>

    <div v-if="$slots.overlay" class="collection-card-square__overlay">
      <slot name="overlay" />
    </div>
  </div>
</template>

<style scoped>
.collection-card-square {
  position: relative;
  aspect-ratio: 1 / 1;
  perspective: 1200px;
  overflow: hidden;
}

.collection-card-square__flipper {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  color: inherit;
  text-decoration: none;
  transform-style: preserve-3d;
  transition: transform 0.6s;
}

.collection-card-square--flip:hover .collection-card-square__flipper {
  transform: rotateY(180deg);
}

.collection-card-square__face {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
  backface-visibility: hidden;
}

.collection-card-square__face--back {
  transform: rotateY(180deg);
  background: rgb(var(--v-theme-surface));
  padding: 16px;
  display: flex;
  align-items: center;
}

.collection-card-square__description {
  display: -webkit-box;
  -webkit-line-clamp: 6;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0;
}

.collection-card-square__scrim {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  padding: 24px 12px 8px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
}

.collection-card-square__overlay {
  position: absolute;
  inset-inline: 0;
  top: 0;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  padding: 8px;
}

.collection-card-square--flip:hover .collection-card-square__overlay {
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}

@media (prefers-reduced-motion: reduce) {
  .collection-card-square__flipper {
    transition: none;
  }
}
</style>
