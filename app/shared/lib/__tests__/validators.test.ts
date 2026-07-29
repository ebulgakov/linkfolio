import { describe, expect, it } from "vitest";

import { email, minLength, required } from "../validators";

describe("required", () => {
  const validate = required("This field is required.");

  it("fails on an empty string with the given message", () => {
    expect(validate("")).toBe("This field is required.");
  });

  it("passes on a non-empty string", () => {
    expect(validate("hello")).toBe(true);
  });
});

describe("email", () => {
  const validate = email("Please enter a valid email.");

  it("fails on a plain string without @ or .", () => {
    expect(validate("notanemail")).toBe("Please enter a valid email.");
  });

  it("passes on a valid-looking email", () => {
    expect(validate("user@example.com")).toBe(true);
  });
});

describe("minLength", () => {
  const validate = minLength(8, "Must be at least 8 characters.");

  it("fails on a string shorter than n", () => {
    expect(validate("short")).toBe("Must be at least 8 characters.");
  });

  it("passes on a string of exactly n characters", () => {
    expect(validate("exactly8")).toBe(true);
  });

  it("passes on a string longer than n", () => {
    expect(validate("waylongerthaneight")).toBe(true);
  });
});
