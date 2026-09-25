// Single source of truth for the event-page builder's section catalog --
// shared by the admin builder (type picker + per-type editors) and the
// public renderer (SectionRenderer). Adding a new section type means adding
// one entry here plus its editor/renderer component pair; nothing else
// needs to change.
export const SECTION_TYPES = [
  {
    type: "hero",
    label: "Hero banner",
    description: "Full-width banner with eyebrow, title, subtitle, and a background/portrait image pair.",
    defaultConfig: () => ({
      eyebrow: "", title: "", subtitle: "", image: "", image_crop: null,
      secondary_image: "", secondary_image_crop: null, cta_label: "Shop now",
      cta_anchor: "", order_by_note: "",
    }),
  },
  {
    type: "countdown",
    label: "Countdown strip",
    description: "A standalone countdown to the event's date (uses the countdown set in Basics above).",
    defaultConfig: () => ({ variant: "dark" }),
  },
  {
    type: "shloka",
    label: "Quote / Shloka strip",
    description: "A short centered quote with a translation or subtitle beneath it.",
    defaultConfig: () => ({ quote: "", translation: "" }),
  },
  {
    type: "product_grid",
    label: "Product grid",
    description: "A filtered grid of products (bestsellers, new arrivals, a merchandising tag, or a category).",
    defaultConfig: () => ({ heading: "", subheading: "", filter: {}, empty_state_message: "" }),
  },
  {
    type: "attribute_grid",
    label: "Attribute grid",
    description: "A set of items with a title/subtitle/description/colour each -- e.g. day colours, a schedule, or special offers.",
    defaultConfig: () => ({ heading: "", subheading: "", layout: "badges", items: [] }),
  },
  {
    type: "urgency_banner",
    label: "Urgency banner",
    description: "A bold call-to-action strip, e.g. \"Order by X for guaranteed delivery.\"",
    defaultConfig: () => ({ heading: "", subtext: "", cta_label: "Shop now", cta_link: "/" }),
  },
  {
    type: "rich_text",
    label: "Rich text block",
    description: "Freeform paragraphs of text with an optional heading.",
    defaultConfig: () => ({ heading: "", body: "" }),
  },
  {
    type: "image_gallery",
    label: "Image gallery",
    description: "A grid of images, each with an optional caption.",
    defaultConfig: () => ({ heading: "", images: [] }),
  },
  {
    type: "faq_accordion",
    label: "FAQ accordion",
    description: "A collapsible list of question/answer pairs.",
    defaultConfig: () => ({ heading: "", items: [] }),
  },
];

export const SECTION_TYPE_MAP = Object.fromEntries(SECTION_TYPES.map((s) => [s.type, s]));
