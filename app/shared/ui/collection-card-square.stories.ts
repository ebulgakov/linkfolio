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

// No description means nothing to flip to, so hovering this story does nothing.
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
