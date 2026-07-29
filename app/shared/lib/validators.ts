export const required = (message: string) => (value: string) => !!value || message;

export const email = (message: string) => (value: string) => /.+@.+\..+/.test(value) || message;

export const minLength = (n: number, message: string) => (value: string) =>
  value.length >= n || message;
