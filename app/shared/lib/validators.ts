export const required = (message: string) => (value: string) => !!value || message;

export const email = (message: string) => (value: string) => /.+@.+\..+/.test(value) || message;

export const minLength = (n: number, message: string) => (value: string) =>
  value.length >= n || message;

const RESERVED_SLUGS = new Set(["new", "edit"]);

export const slug = (message: string) => (value: string) => {
  const validFormat =
    /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value) && value.length >= 3 && value.length <= 64;
  return (validFormat && !RESERVED_SLUGS.has(value)) || message;
};

// Empty values pass here on purpose — this validator only checks *format*,
// the same way `slug` above focuses on shape. Emptiness is a separate
// concern already covered by composing `required(...)` alongside this one
// in a field's `:rules` array (see collection-form.vue for the pattern).
export const url = (message: string) => (value: string) => {
  if (value === "") return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:" || message;
  } catch {
    return message;
  }
};
