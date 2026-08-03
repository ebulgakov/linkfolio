import AppLogo from "./app-logo.vue";

import type { Meta, StoryObj } from "@storybook-vue/nuxt";

const meta: Meta<typeof AppLogo> = {
  title: "Shared UI/Logo/AppLogo",
  component: AppLogo
};

export default meta;

type Story = StoryObj<typeof AppLogo>;

export const Default: Story = {};
