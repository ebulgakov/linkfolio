import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import { createVuetify } from "vuetify";

import CollectionCardSquare from "../collection-card-square.vue";

interface CollectionCardSquareProps {
  to?: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  noFlip?: boolean;
}

// Vuetify's components need a real Vuetify instance to render (they inject
// their defaults/theme via provide/inject) - mountSuspended gives Nuxt
// context but doesn't run the app's vuetify-nuxt-module plugin, so it's
// supplied explicitly here, same as Vuetify's own unit-testing docs.
const vuetify = createVuetify();

function mountCard(
  props: CollectionCardSquareProps,
  extra: { route?: string; slots?: Record<string, () => string> } = {}
) {
  return mountSuspended(CollectionCardSquare, {
    props,
    route: extra.route,
    slots: extra.slots,
    global: { plugins: [vuetify] }
  });
}

describe("CollectionCardSquare", () => {
  it("renders the title and the image when imageUrl is provided", async () => {
    const wrapper = await mountCard({
      title: "My Collection",
      imageUrl: "https://example.com/cover.jpg"
    });

    expect(wrapper.text()).toContain("My Collection");
    const image = wrapper.findComponent({ name: "VImg" });
    expect(image.exists()).toBe(true);
    expect(image.props("src")).toBe("https://example.com/cover.jpg");
    expect(wrapper.find(".mdi-folder-multiple-outline").exists()).toBe(false);
  });

  it("renders the placeholder icon when imageUrl is absent", async () => {
    const wrapper = await mountCard({ title: "No Image Collection" });

    expect(wrapper.findComponent({ name: "VImg" }).exists()).toBe(false);
    expect(wrapper.find(".mdi-folder-multiple-outline").exists()).toBe(true);
  });

  it("is flippable with a description overlay when description is set and noFlip is not", async () => {
    const wrapper = await mountCard({
      title: "Flippable",
      description: "A handful of useful links."
    });

    expect(wrapper.classes()).toContain("collection-card-square--flip");
    const overlay = wrapper.find(".collection-card-square__description-overlay");
    expect(overlay.exists()).toBe(true);
    expect(overlay.text()).toBe("A handful of useful links.");
  });

  it("does not flip when description is empty", async () => {
    const wrapper = await mountCard({ title: "No Description", description: null });

    expect(wrapper.classes()).not.toContain("collection-card-square--flip");
    expect(wrapper.find(".collection-card-square__description-overlay").exists()).toBe(false);
  });

  it("does not flip when noFlip is true even with a description", async () => {
    const wrapper = await mountCard({
      title: "Flip Disabled",
      description: "A handful of useful links.",
      noFlip: true
    });

    expect(wrapper.classes()).not.toContain("collection-card-square--flip");
    expect(wrapper.find(".collection-card-square__description-overlay").exists()).toBe(false);
  });

  it("renders as a NuxtLink-based anchor when `to` is passed", async () => {
    const wrapper = await mountCard(
      { title: "Linked", to: "/shared/my-collection" },
      { route: "/" }
    );

    const flipper = wrapper.find(".collection-card-square__flipper");
    expect(flipper.element.tagName).toBe("A");
    expect(flipper.attributes("href")).toBe("/shared/my-collection");
  });

  it("renders as a plain div when `to` is not passed", async () => {
    const wrapper = await mountCard({ title: "Not Linked" });

    const flipper = wrapper.find(".collection-card-square__flipper");
    expect(flipper.element.tagName).toBe("DIV");
  });

  it("renders the overlay slot when provided", async () => {
    const wrapper = await mountCard(
      { title: "With Overlay" },
      { slots: { overlay: () => "Overlay content" } }
    );

    expect(wrapper.find(".collection-card-square__overlay").exists()).toBe(true);
    expect(wrapper.text()).toContain("Overlay content");
  });

  it("does not render the overlay wrapper when no overlay slot is given", async () => {
    const wrapper = await mountCard({ title: "Without Overlay" });

    expect(wrapper.find(".collection-card-square__overlay").exists()).toBe(false);
  });
});
