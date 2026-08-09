<script lang="ts" setup>
import { LandingHero, LandingHighlights } from "~/features/home-landing";
import { useHomepagePublishedCollections } from "~/features/published-collections";
import { CollectionCardSquare } from "~/shared/ui";

const { t } = useI18n();

const randomPublishedCollections = await useHomepagePublishedCollections();
</script>

<template>
  <v-container>
    <LandingHero />
    <LandingHighlights />

    <h2 class="text-h6 text-center mb-4">{{ t("pages.home.showcase.title") }}</h2>

    <v-row>
      <v-col
        v-for="collection in randomPublishedCollections"
        :key="collection.id"
        cols="12"
        sm="6"
        md="3"
      >
        <CollectionCardSquare
          :to="`/shared/${collection.slug}`"
          :title="collection.name"
          :description="collection.description"
          :image-url="collection.imageUrl"
        />
      </v-col>
    </v-row>

    <div class="text-center mt-4">
      <NuxtLink to="/published-collections">{{ t("pages.home.viewAllPublished") }}</NuxtLink>
    </div>
  </v-container>
</template>
