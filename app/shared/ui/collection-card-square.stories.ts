import CollectionCardSquare from "./collection-card-square.vue";

import type { Meta, StoryObj } from "@storybook-vue/nuxt";

const meta: Meta<typeof CollectionCardSquare> = {
  title: "Shared UI/CollectionCardSquare",
  component: CollectionCardSquare,
  args: {
    to: "/shared/my-collection",
    title: "My Collection",
    description: "A handful of useful links.",
    imageUrl: null
  }
};

export default meta;

type Story = StoryObj<typeof CollectionCardSquare>;

export const Default: Story = {};

export const WithImage: Story = {
  args: {
    imageUrl: "https://picsum.photos/seed/linkfolio/400/400"
  }
};

// No description means no back face to flip to, so hovering this story does nothing.
export const WithoutDescription: Story = {
  args: {
    description: null
  }
};

// Has a description (so it's flippable by default) but opts out via noFlip -
// mirrors how /collections uses this component.
export const NoFlip: Story = {
  args: {
    imageUrl: "https://picsum.photos/seed/linkfolio-noflip/400/400",
    noFlip: true
  }
};

export const WithBadgesAndAction: Story = {
  render: args => ({
    components: { CollectionCardSquare },
    setup() {
      return { args };
    },
    // This story has a description, so hovering flips it - the "Add link"
    // button lives in the overlay slot, which fades out with the front
    // face during the flip (overlay is front-face-only by design).
    template: `
      <CollectionCardSquare v-bind="args">
        <template #overlay>
          <div class="d-flex ga-2">
            <v-chip size="small" color="primary">Shared</v-chip>
            <v-chip size="small" color="secondary">Published</v-chip>
          </div>
          <v-btn color="primary">Add link</v-btn>
        </template>
      </CollectionCardSquare>
    `
  })
};

export const WithBadgesAndIconActions: Story = {
  render: args => ({
    components: { CollectionCardSquare },
    setup() {
      return { args };
    },
    template: `
      <CollectionCardSquare v-bind="args">
        <template #overlay>
          <div class="d-flex ga-2">
            <v-chip size="small" color="primary">Shared</v-chip>
          </div>
          <div class="d-flex align-center ga-2">
            <v-btn icon="mdi-pencil" variant="tonal" size="small" color="primary" aria-label="Edit" />
            <v-btn icon="mdi-delete" variant="tonal" size="small" color="error" aria-label="Delete collection" />
          </div>
        </template>
      </CollectionCardSquare>
    `
  }),
  args: {
    imageUrl: "https://picsum.photos/seed/linkfolio-2/400/400"
  }
};
