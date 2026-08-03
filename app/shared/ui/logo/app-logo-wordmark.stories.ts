import AppLogoWordmark from "./app-logo-wordmark.vue";

import type { Meta, StoryObj } from "@storybook-vue/nuxt";

const meta: Meta<typeof AppLogoWordmark> = {
  title: "Shared UI/Logo/AppLogoWordmark",
  component: AppLogoWordmark
};

export default meta;

type Story = StoryObj<typeof AppLogoWordmark>;

export const Default: Story = {};
