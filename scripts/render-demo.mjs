import { Liquid } from 'liquidjs';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const temporary = await mkdtemp(path.join(tmpdir(), 'shadow-liquid-'));
const names = ['value-stacks', 'transformation', 'comparasion'];
const schemas = {};
const escape = (value = '') => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);

// Only the local demonstration adapts Shopify's platform tags. The submitted
// Liquid files retain the real image filters, fonts, and product form tags.
function adapt(source) {
  return source.replace(/{%\s*schema\s*%}[\s\S]*?{%\s*endschema\s*%}/g, '')
    .replace(/{%\s*style\s*%}/g, '<style>').replace(/{%\s*endstyle\s*%}/g, '</style>')
    .replace(/{%\s*form\s+[^%]+%}/g, '<form class="sl-product__form" data-demo-cart id="{{ form_id }}">')
    .replace(/{%\s*endform\s*%}/g, '</form>');
}
const engine = new Liquid({ root: temporary, extname: '.liquid', strictFilters: true });
engine.registerFilter('asset_url', name => '../assets/' + name);
engine.registerFilter('stylesheet_tag', url => `<link rel="stylesheet" href="${escape(url)}">`);
engine.registerFilter('font_modify', (font, field, value) => ({ ...font, [field]: value }));
engine.registerFilter('font_face', font => {
  const file = font.family === 'Oswald' ? 'oswald-bold' : font.weight === '700' ? 'poppins-bold' : 'poppins-regular';
  return `@font-face{font-family:${font.family};src:url(media/${file}.woff2) format('woff2');font-weight:${font.weight};font-style:normal;font-display:swap}`;
});
engine.registerFilter('image_url', image => typeof image === 'string' ? image : image?.src || '');
engine.registerFilter('image_tag', (src, ...args) => {
  const attrs = Object.fromEntries(args.filter(Array.isArray));
  return `<img src="${escape(src)}" alt="${escape(attrs.alt)}" loading="${escape(attrs.loading || 'lazy')}"${attrs.class ? ` class="${escape(attrs.class)}"` : ''}>`;
});
engine.registerFilter('placeholder_svg_tag', (type, className) => `<svg class="${escape(className)}" viewBox="0 0 300 300" role="img" aria-label="Image placeholder"><rect width="300" height="300" fill="#e9e9e9"/><path d="M60 230 120 140 160 190 200 120 260 230Z" fill="#a0a0a0"/><circle cx="90" cy="80" r="25" fill="#b0b0b0"/></svg>`);
engine.registerFilter('money', amount => 'Rs. ' + (Number(amount || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 }));

for (const name of ['sl-icon', 'sl-section-style', 'sl-product-card']) {
  await writeFile(path.join(temporary, name + '.liquid'), adapt(await readFile(path.join(root, 'snippets', name + '.liquid'), 'utf8')));
}
for (const name of names) {
  const source = await readFile(path.join(root, 'sections', name + '.liquid'), 'utf8');
  schemas[name] = JSON.parse(source.match(/{% schema %}([\s\S]*?){% endschema %}/)[1]);
  await writeFile(path.join(temporary, name + '.liquid'), adapt(source));
}

function defaults(schema) {
  const output = {};
  for (const setting of schema.settings || []) if ('default' in setting) output[setting.id] = setting.default;
  return output;
}
function makeSection(name, index) {
  const schema = schemas[name];
  const settings = defaults(schema);
  settings.heading_font = { family: 'Oswald', fallback_families: 'sans-serif', weight: 700 };
  settings.body_font = { family: 'Poppins', fallback_families: 'sans-serif', weight: 400 };
  return { id: 'demo-' + name + index, settings, blocks: schema.presets[0].blocks.map((block, i) => ({ id: name + '-block-' + i, type: block.type, settings: { ...defaults(schema.blocks.find(type => type.type === block.type)), ...block.settings }, shopify_attributes: `data-shopify-editor-block="${name}-${i}"` })) };
}
const sections = names.map(makeSection);
const stacks = sections[0];
stacks.settings.accent_color = '#03c52e';
stacks.settings.promo_image = { src: 'media/stacks-promo.png', alt: 'Athlete holding a shaker in green gym lighting' };
stacks.settings.promo_link = '#sl-demo-value-stacks0';
const products = [
  ['Mass Builder Stack', 'Your everyday foundation for calorie intake, strength training and muscle-building goals.', 'mass-builder.png', 209900, 229800, true],
  ['Strength & Size Stack', 'A training-focused combination of mass gainer and 250 g creatine monohydrate.', 'strength-size.png', 249900, 269800, true],
  ['Ultimate Bulk', 'A premium bulking combination for athletes looking to increase calorie intake.', 'ultimate-bulk.png', 259900, 279800, false],
].map(([title, description, image, price, compare_at_price, available], i) => {
  const variant = { id: 100 + i, title: 'Default Title', price, compare_at_price, available };
  return { title, description, featured_image: { src: 'media/' + image }, url: '#demo-product-' + i, selected_or_first_available_variant: variant, variants: [variant] };
});
stacks.blocks.forEach((block, i) => { block.settings.product = products[i]; });
sections[1].blocks.forEach((block, i) => {
  const customer = ['aditya', 'karan', 'priya'][i];
  block.settings.before_image = { src: `media/${customer}-before.png` };
  block.settings.after_image = { src: `media/${customer}-after.png` };
});

const pieces = [];
for (let i = 0; i < names.length; i++) pieces.push(await engine.renderFile(names[i], { section: sections[i] }));
const shell = (body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Shadow Labs — Shopify Section Demo</title><style>body{margin:0;background:#050805} .demo-bar{font:13px/1.5 system-ui,sans-serif;color:#c3c9c3;background:#101510;padding:14px 24px;display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px}.demo-bar a{color:#61e36f;margin-right:18px}.demo-notice{font:14px system-ui;color:#ccc;background:#121812;padding:20px;text-align:center}.demo-toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:100;background:#fff;color:#111;border-radius:10px;padding:16px 24px;box-shadow:0 8px 30px #0008;font:14px system-ui}</style></head><body><nav class="demo-bar" aria-label="Demonstration navigation"><span>Shopify Liquid sections · assessment demonstration</span><div><a href="#sl-demo-value-stacks0">Value stacks</a><a href="#sl-demo-transformation1">Transformations</a><a href="#sl-demo-comparasion2">Comparison</a></div></nav>${body}<footer class="demo-notice">Local demonstration of the actual Liquid templates with sample product data. Cart actions are simulated; Shopify product forms work in a connected store.</footer><div class="demo-toast" role="status" hidden></div><script>document.querySelectorAll('[data-demo-cart]').forEach(form=>form.addEventListener('submit',event=>{event.preventDefault();const toast=document.querySelector('.demo-toast');toast.textContent='Demo only — product form submitted. No purchase or live cart change.';toast.hidden=false;setTimeout(()=>toast.hidden=true,4000)}));document.querySelectorAll('a[href^="#demo-product-"]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();const toast=document.querySelector('.demo-toast');toast.textContent='Demo product — choose your store product in Shopify to enable its product page.';toast.hidden=false;setTimeout(()=>toast.hidden=true,4000)}));</script></body></html>`.replace(/[ \t]+$/gm, '');
await mkdir(path.join(root, 'demo'), { recursive: true });
await writeFile(path.join(root, 'demo', 'index.html'), shell(pieces.join('\n')));

// Edge case fixtures exercise the same templates, not copies of their markup.
const emptySections = names.map(makeSection);
emptySections[0].blocks = [];
emptySections[0].settings.show_promo = false;
emptySections[1].blocks = [];
emptySections[2].blocks = [];
const emptyMarkup = [];
for (let i = 0; i < names.length; i++) emptyMarkup.push(await engine.renderFile(names[i], { section: emptySections[i] }));
await writeFile(path.join(root, 'demo', 'empty.html'), shell(emptyMarkup.join('\n')));
const variantSection = makeSection('value-stacks', 3);
variantSection.settings.show_promo = false;
const variants = [{ id: 401, title: 'Available — discounted', price: 209900, compare_at_price: 229800, available: true }, { id: 402, title: 'Sold out — regular price', price: 249900, compare_at_price: 0, available: false }];
variantSection.blocks = [{ id: 'variant-test', settings: { product: { ...products[0], variants, selected_or_first_available_variant: variants[0] } } }];
await writeFile(path.join(root, 'demo', 'variants.html'), shell(await engine.renderFile('value-stacks', { section: variantSection })));
await rm(temporary, { recursive: true, force: true });
console.log('Rendered demo/index.html, demo/empty.html, and demo/variants.html from the actual Liquid files.');
