import AppWordmark from "./app-wordmark.vue";

import type { Meta, StoryObj } from "@storybook-vue/nuxt";

const meta: Meta<typeof AppWordmark> = {
  title: "Shared UI/Logo/AppWordmark",
  component: AppWordmark
};

export default meta;

type Story = StoryObj<typeof AppWordmark>;

export const Default: Story = {};
