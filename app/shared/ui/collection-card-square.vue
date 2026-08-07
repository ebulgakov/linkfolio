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
      <!-- No backface-visibility:hidden here on purpose: past 90deg of the
           flip, the browser renders this face's own content mirrored rather
           than swapping to a separate back face - the "true 3D flip" effect.
           The title mirrors/reads backwards too as a result; that's an
           accepted consequence of keeping the same preview image on both
           sides instead of a distinct back panel. -->
      <div class="collection-card-square__face">
        <v-img v-if="imageUrl" :src="imageUrl" :alt="title" cover class="fill-height" />
        <div v-else class="d-flex align-center justify-center bg-surface-variant fill-height">
          <v-icon icon="mdi-folder-multiple-outline" size="48" />
        </div>

        <div class="collection-card-square__scrim">
          <div class="text-truncate text-white text-h6">{{ title }}</div>
        </div>
      </div>
    </component>

    <!-- Non-rotating sibling layer, not part of the flipper: fades in on
         hover so the description stays upright and readable over the
         mirrored image underneath, while pointer-events:none keeps the
         card clickable through it (see CSS). -->
    <div v-if="canFlip" class="collection-card-square__description-overlay">
      <p class="collection-card-square__description text-body-2">{{ description }}</p>
    </div>

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
}

.collection-card-square__description-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: inherit;
  display: flex;
  align-items: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.55);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s;
}

.collection-card-square--flip:hover .collection-card-square__description-overlay {
  opacity: 1;
}

.collection-card-square__description {
  display: -webkit-box;
  -webkit-line-clamp: 6;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0;
  color: white;
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
  .collection-card-square__flipper,
  .collection-card-square__description-overlay {
    transition: none;
  }
}
</style>
