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
  <div class="collection-card-square" :class="{ 'collection-card-square--flip': canFlip }">
    <component
      :is="to ? NuxtLink : 'div'"
      v-bind="to ? { to } : {}"
      class="collection-card-square__flipper rounded elevation-1"
    >
      <div class="collection-card-square__face">
        <template v-if="imageUrl">
          <img :src="imageUrl" :alt="title" class="collection-card-square__blur" />
          <v-img :src="imageUrl" :alt="title" content class="fill-height" />
        </template>

        <div v-else class="d-flex align-center justify-center bg-surface-variant fill-height">
          <v-icon icon="mdi-folder-multiple-outline" size="48" />
        </div>

        <div class="collection-card-square__scrim">
          <div class="text-truncate text-white text-h6">{{ title }}</div>
        </div>

        <div v-if="description" class="collection-card-square__description">
          <p class="text-body-2">
            {{ description }}
          </p>
        </div>
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
}

.collection-card-square__flipper {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  color: inherit;
  text-decoration: none;
  transform-style: preserve-3d;
  transition: transform 300ms linear;
  will-change: transform;
}

.collection-card-square__blur {
  filter: blur(8px);
  z-index: -1;
  position: absolute;
  object-fit: cover;
  width: 100%;
  height: 100%;
  opacity: 0.4;
}

.collection-card-square--flip:hover .collection-card-square__flipper,
.collection-card-square--flip:focus-within .collection-card-square__flipper {
  transform: rotateY(180deg);
}
.collection-card-square--flip:hover .collection-card-square__scrim,
.collection-card-square--flip:focus-within .collection-card-square__scrim {
  opacity: 0;
}
.collection-card-square--flip:hover .collection-card-square__description,
.collection-card-square--flip:focus-within .collection-card-square__description {
  opacity: 1;
}

.collection-card-square__face {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
  z-index: 0;
  background: #fff;
}

.collection-card-square__description {
  opacity: 0;
  transform: rotateY(180deg);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: white;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  will-change: opacity;
  transition-delay: 150ms;
  transition-duration: 0ms;
  background: rgba(0, 0, 0, 0.8);
  padding: 12px;
}

.collection-card-square__scrim {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  padding: 24px 12px 8px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8) 40%, transparent);
  will-change: opacity;
  transition-delay: 150ms;
  transition-duration: 0ms;
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

.collection-card-square--flip:hover .collection-card-square__overlay,
.collection-card-square--flip:focus-within .collection-card-square__overlay {
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}

@media (prefers-reduced-motion: reduce) {
  .collection-card-square__flipper,
  .collection-card-square__description,
  .collection-card-square__scrim {
    transition: none;
  }
}
</style>
