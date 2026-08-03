import AppInput from "./app-input.vue";

import type { Meta, StoryObj } from "@storybook-vue/nuxt";

const meta: Meta<typeof AppInput> = {
  title: "Shared UI/Input",
  component: AppInput,
  argTypes: {
    type: {
      control: "select",
      options: ["text", "email", "password"]
    },
    density: {
      control: "select",
      options: ["default", "comfortable", "compact"]
    }
  },
  args: {
    label: "Label",
    modelValue: ""
  }
};

export default meta;

type Story = StoryObj<typeof AppInput>;

export const Default: Story = {
  args: { label: "Email", modelValue: "" }
};

export const WithLabelAndRules: Story = {
  args: {
    label: "Email",
    modelValue: "",
    rules: [(value: string) => !!value || "Email is required"]
  }
};

export const Password: Story = {
  render: args => ({
    components: { AppInput },
    setup() {
      const showPassword = ref(false);
      return { args, showPassword };
    },
    template: `
      <AppInput
        v-bind="args"
        :type="showPassword ? 'text' : 'password'"
        :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
        @click:append-inner="showPassword = !showPassword"
      />
    `
  }),
  args: {
    label: "Password",
    modelValue: "hunter2",
    autocomplete: "current-password"
  }
};

export const ReadonlyWithHint: Story = {
  args: {
    label: "Share URL",
    modelValue: "https://linkfolio.app/s/abc123",
    readonly: true,
    hint: "Anyone with this link can view the collection",
    persistentHint: true
  }
};

export const WithAppendInnerSlotContent: Story = {
  args: {
    label: "Slug",
    modelValue: "my-collection"
  },
  render: args => ({
    components: { AppInput },
    setup() {
      return { args };
    },
    template: `
      <AppInput v-bind="args">
        <template #append-inner>
          <v-icon icon="mdi-check-circle" color="success" />
        </template>
      </AppInput>
    `
  })
};
