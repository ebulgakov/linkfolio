import CollectionCard from "./collection-card.vue";

import type { Meta, StoryObj } from "@storybook-vue/nuxt";

const meta: Meta<typeof CollectionCard> = {
  title: "Shared UI/CollectionCard",
  component: CollectionCard,
  args: {
    to: "/shared/my-collection",
    title: "My Collection",
    description: "A handful of useful links.",
    imageUrl: null
  }
};

export default meta;

type Story = StoryObj<typeof CollectionCard>;

export const Default: Story = {};

export const WithImage: Story = {
  args: {
    imageUrl: "https://picsum.photos/seed/linkfolio/400/160"
  }
};

export const WithoutDescription: Story = {
  args: {
    description: null
  }
};

export const WithBadgesAndAction: Story = {
  render: args => ({
    components: { CollectionCard },
    setup() {
      return { args };
    },
    template: `
      <CollectionCard v-bind="args">
        <template #overlay>
          <div class="d-flex ga-2">
            <v-chip size="small" color="primary">Shared</v-chip>
            <v-chip size="small" color="secondary">Published</v-chip>
          </div>
          <v-btn color="primary">Add link</v-btn>
        </template>
      </CollectionCard>
    `
  })
};

export const WithBadgesAndIconActions: Story = {
  render: args => ({
    components: { CollectionCard },
    setup() {
      return { args };
    },
    template: `
      <CollectionCard v-bind="args">
        <template #overlay>
          <div class="d-flex ga-2">
            <v-chip size="small" color="primary">Shared</v-chip>
          </div>
          <div class="d-flex align-center ga-2">
            <v-btn icon="mdi-pencil" variant="tonal" size="small" color="primary" aria-label="Edit" />
            <v-btn icon="mdi-delete" variant="tonal" size="small" color="error" aria-label="Delete collection" />
          </div>
        </template>
      </CollectionCard>
    `
  }),
  args: {
    imageUrl: "https://picsum.photos/seed/linkfolio-2/400/160"
  }
};
