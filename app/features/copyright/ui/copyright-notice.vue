<script lang="ts" setup>
import { useCopyright } from "~/features/copyright";

const { t } = useI18n();
const copyright = useCopyright();
const link = { href: "https://github.com/ebulgakov/linkfolio/" };
</script>

<template>
  <span class="text-caption">
    <a
      :href="link.href"
      :aria-label="t('footer.githubLinkLabel')"
      target="_blank"
      rel="noopener noreferrer"
      class="text-caption text-decoration-none text-primary"
    >
      {{ copyright }}
    </a>
  </span>
</template>
