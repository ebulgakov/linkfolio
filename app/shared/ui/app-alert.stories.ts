import AppAlert from "./app-alert.vue";

import type { Meta, StoryObj } from "@storybook-vue/nuxt";

const meta: Meta<typeof AppAlert> = {
  title: "Shared UI/Alert",
  component: AppAlert,
  argTypes: {
    type: {
      control: "select",
      options: ["success", "info", "warning", "error"]
    },
    variant: {
      control: "select",
      options: ["flat", "tonal", "outlined", "text", "elevated", "plain"]
    }
  },
  args: {
    type: "info",
    text: "This is an alert message."
  }
};

export default meta;

type Story = StoryObj<typeof AppAlert>;

export const Success: Story = {
  args: { type: "success", text: "Your changes were saved successfully." }
};

export const Info: Story = {
  args: { type: "info", text: "New updates are available." }
};

export const Warning: Story = {
  args: { type: "warning", text: "This action might have side effects." }
};

export const ErrorState: Story = {
  args: { type: "error", text: "Something went wrong. Please try again." }
};

export const Closable: Story = {
  args: { type: "info", text: "Dismiss me by clicking the close icon.", closable: true }
};

export const WithSlotContent: Story = {
  args: { type: "warning", text: undefined },
  render: args => ({
    components: { AppAlert },
    setup() {
      return { args };
    },
    template: `
      <AppAlert v-bind="args">
        <strong>Custom</strong> slot content instead of the text prop.
      </AppAlert>
    `
  })
};
