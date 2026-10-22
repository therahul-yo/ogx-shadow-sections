# Shadow Labs — reusable Shopify sections

OGX Studio qualification assessment, **Track 2**. Three responsive Shopify Online Store 2.0 sections recreated from the supplied screenshots and the public Shadow Labs reference. The comparison follows the supplied screenshot because the live site's comparison has since changed.

**[Open the live demonstration](https://therahul-yo.github.io/ogx-shadow-sections/demo/index.html)** · [Validation evidence](VALIDATION.md)

## Required files

| Section | File | Features |
| --- | --- | --- |
| Transformations | [`sections/transformation.liquid`](sections/transformation.liquid) | Before/after images, optional avatar, customer details, verification label, testimonials, touch/keyboard carousel |
| Comparison | [`sections/comparasion.liquid`](sections/comparasion.liquid) | Editable intro benefits and comparison rows, highlighted brand column, mobile table scrolling |
| Value stacks | [`sections/value-stacks.liquid`](sections/value-stacks.liquid) | Dynamic products or collection, variant prices and discounts, sold-out handling, native Shopify cart forms, optional campaign image and CTA |

`comparasion.liquid` intentionally uses the exact spelling required by the assessment.

## Install in an existing Shopify theme

1. Duplicate your theme for testing. Copy the three files from `sections/`, all three files from `snippets/`, and `assets/sl-sections.css` plus `assets/sl-sections.js` into the corresponding theme directories.
2. Open **Online Store → Themes → Customize**, then **Add section**. Add **Transformations**, **Brand comparison**, and **Value stacks**.
3. Upload the before/after photos and optional avatars; edit each story block. Blocks can be added, removed, and reordered.
4. Choose products in each Value stacks block. Alternatively, remove every product block and select a collection to populate cards automatically. Add a promotion image and link, or disable the promotion.
5. Customize fonts, font sizes, text, colors, spacing, corner radii, content width, columns, and labels in each section's settings.

Do **not** replace an existing theme's layout, config, or index template. The `layout/`, `config/`, `locales/`, and `templates/` directories here are a minimal standalone theme scaffold for optional installation into a separate development theme.

Unselected products render a disabled placeholder. Missing photos render an image placeholder. Missing avatars and optional links are omitted. The first available variant determines the initial price and availability; changing the variant updates the price, comparison price, savings badge, and cart button. Native product forms work without JavaScript. All currency output uses Shopify's `money` filter.

## Preview locally

The demo renders **the same submitted Liquid templates**, using LiquidJS and explicit sample Shopify objects. Its cart is a clearly labeled simulation, not a live checkout or proof of a store purchase.

```sh
npm ci
npm run demo
python3 -m http.server 4173 --bind 127.0.0.1
```

Open **http://127.0.0.1:4173/demo/index.html**. Additional fixtures: `demo/empty.html` for missing content and `demo/variants.html` for variant changes. Example photos and product imagery are local files; the demo does not contact Shadow Labs or a database.

## Validation

```sh
npm run check
node --check assets/sl-sections.js
npm test
```

`npm run check` parses all Liquid with Shopify's parser, validates schema ranges/presets, and runs the official Shopify Theme Check engine. Browser tests use Playwright Core with an installed Chromium browser. On macOS, installed Brave is detected automatically; elsewhere set `BROWSER_PATH` to your Chromium/Chrome executable. No personal browser profile is used.

Browser checks cover desktop, tablet, mobile, image loading, horizontal overflow, carousel buttons/keyboard controls, disabled products, missing content, and variant price/availability transitions. Screenshots are saved in `demo/qa/`.

**Limit:** no Shopify development store was connected during this assessment. A real store's editor, cart, inventory, and checkout require verification after installation. Local rendering and official static validation do not substitute for that store test.

## Implementation notes

- Each section has an independent schema with reorderable blocks and presets. Fonts use Shopify `font_picker` and `font_face`.
- CSS is namespaced with `sl-` and per-instance tokens scoped to the section ID. No theme stylesheet, component library, jQuery, or external runtime is required.
- Guarded custom elements avoid duplicate registration, isolate each instance, and clean up listeners/resize observers when sections unload. Shopify block selection scrolls the corresponding story into view.
- Native scrolling works without JavaScript, focus styles remain visible, and reduced-motion preferences are respected.
- Comparison text and customer testimonials reproduce assessment reference content; they are editable sample content, not independently verified product claims.

## Reference attribution

- Design and sample media: [Shadow Labs](https://shadowlabs.store/).
- Assessment screenshots: [provided Task 2 folder](https://drive.google.com/drive/folders/12eiaIZ36nN_865s_E0EfjbcuPZu4vTny).
- Original public media URLs are recorded in [`demo/media-sources.json`](demo/media-sources.json). Reference media is included solely to demonstrate this assessment recreation; underlying brand/media rights remain with their owners.
- Official documentation: [section schema](https://shopify.dev/docs/storefronts/themes/architecture/sections/section-schema), [input settings](https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings), [product object](https://shopify.dev/docs/api/liquid/objects/product), [Theme Check](https://shopify.dev/docs/storefronts/themes/tools/theme-check).

No credentials, environment files, personal records, or database connections are needed for Track 2.
