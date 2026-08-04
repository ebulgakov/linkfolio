import { describe, expect, it } from "vitest";

import { MAX_IMAGE_BYTES, sniffImageType } from "../image-validate";

describe("MAX_IMAGE_BYTES", () => {
  it("is 2MB", () => {
    expect(MAX_IMAGE_BYTES).toBe(2 * 1024 * 1024);
  });
});

describe("sniffImageType", () => {
  it("identifies a PNG from its magic bytes", () => {
    const bytes = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d
    ]);

    expect(sniffImageType(bytes)).toBe("image/png");
  });

  it("identifies a JPEG from its magic bytes", () => {
    const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

    expect(sniffImageType(bytes)).toBe("image/jpeg");
  });

  it("identifies a GIF87a from its magic bytes", () => {
    const bytes = Buffer.from("GIF87a" + "extra-payload", "ascii");

    expect(sniffImageType(bytes)).toBe("image/gif");
  });

  it("identifies a GIF89a from its magic bytes", () => {
    const bytes = Buffer.from("GIF89a" + "extra-payload", "ascii");

    expect(sniffImageType(bytes)).toBe("image/gif");
  });

  it("identifies a WebP (RIFF/WEBP) from its magic bytes", () => {
    const bytes = Buffer.concat([
      Buffer.from("RIFF", "ascii"),
      Buffer.from([0x00, 0x00, 0x00, 0x00]), // file size field, value irrelevant to sniffing
      Buffer.from("WEBP", "ascii")
    ]);

    expect(sniffImageType(bytes)).toBe("image/webp");
  });

  it("returns null for an SVG's bytes (XML declaration form)", () => {
    const bytes = Buffer.from(
      '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"></svg>',
      "utf-8"
    );

    expect(sniffImageType(bytes)).toBeNull();
  });

  it("returns null for an SVG's bytes (bare <svg> form)", () => {
    const bytes = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>', "utf-8");

    expect(sniffImageType(bytes)).toBeNull();
  });

  it("returns null for an empty buffer", () => {
    expect(sniffImageType(Buffer.alloc(0))).toBeNull();
  });

  it("returns null for a too-short buffer that can't match any format", () => {
    expect(sniffImageType(Buffer.from([0x89]))).toBeNull();
  });

  it("returns null for a PNG-mimicking buffer truncated before the full 8-byte signature", () => {
    // First 4 bytes are correct PNG magic, but the buffer is cut short of
    // the full 8-byte signature isPng() requires.
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

    expect(sniffImageType(bytes)).toBeNull();
  });

  it("returns null for a WebP-mimicking buffer truncated before the WEBP marker", () => {
    // Correct "RIFF" + size, but cut short before the "WEBP" bytes at
    // offset 8-11.
    const bytes = Buffer.concat([
      Buffer.from("RIFF", "ascii"),
      Buffer.from([0x00, 0x00, 0x00, 0x00])
    ]);

    expect(sniffImageType(bytes)).toBeNull();
  });
});
