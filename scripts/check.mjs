import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { toLiquidHtmlAST } from '@shopify/liquid-html-parser';
import { check, Severity } from '@shopify/theme-check-node';
const root = path.resolve(import.meta.dirname, '..');
let failed = false;
for (const folder of ['sections', 'snippets', 'layout']) {
  for (const name of await readdir(path.join(root, folder))) {
    if (!name.endsWith('.liquid')) continue;
    const file = path.join(folder, name);
    const source = await readFile(path.join(root, file), 'utf8');
    try { toLiquidHtmlAST(source); console.log('Liquid parsed:', file); }
    catch (error) { failed = true; console.error('Liquid syntax error:', file, error.message); }
    const schemaText = source.match(/{% schema %}([\s\S]*?){% endschema %}/)?.[1];
    if (!schemaText) continue;
    const schema = JSON.parse(schemaText);
    for (const owner of [schema, ...(schema.blocks || [])]) {
      const ids = new Set();
      for (const setting of owner.settings || []) {
        if (setting.id && ids.has(setting.id)) throw new Error(`${file}: duplicate setting ${setting.id}`);
        ids.add(setting.id);
        if (setting.type === 'range') {
          if (setting.default < setting.min || setting.default > setting.max || (setting.default - setting.min) % setting.step !== 0 || (setting.max - setting.min) / setting.step > 100) throw new Error(`${file}: invalid range ${setting.id}`);
        }
      }
    }
    for (const preset of schema.presets || []) for (const block of preset.blocks || []) {
      if (!schema.blocks.some(type => type.type === block.type)) throw new Error(`${file}: invalid preset block`);
    }
    console.log('Schema validated:', file);
  }
}
const offenses = await check(root);
for (const issue of offenses) {
  console.log(`${issue.severity === Severity.ERROR ? 'ERROR' : 'WARNING'} ${path.relative(root, new URL(issue.uri).pathname)}:${issue.start?.line + 1} ${issue.check}: ${issue.message}`);
  if (issue.severity === Severity.ERROR) failed = true;
}
console.log(`Shopify Theme Check: ${offenses.length} findings.`);
process.exitCode = failed ? 1 : 0;
