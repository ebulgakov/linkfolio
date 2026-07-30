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
