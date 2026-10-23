#!/usr/bin/env node
/**
 * Fetches React Bits components from https://reactbits.dev/r/<Name>-JS-TW.json
 * and writes each file's content to src/components/reactbits/<Name>.jsx
 * (flattening the nested folder structure the JSON uses).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'src', 'components', 'reactbits');

mkdirSync(OUT_DIR, { recursive: true });

const NAMES = [
  'DepthText', 'SplitFlapText', 'MagicBento', 'AnimatedList', 'RubberSegment',
  'LatticeLoader', 'SloshGauge', 'ElectricBorder', 'HoldButton', 'SwipeToast', 'Stepper',
  'Radar', 'BorderGlow', 'StatusMark', 'Counter', 'ShinyText', 'FadeContent', 'AnimatedContent',
];

const results = [];

for (const name of NAMES) {
  const url = `https://reactbits.dev/r/${name}-JS-TW.json`;
  process.stdout.write(`Fetching ${name}... `);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`FAIL (HTTP ${res.status})`);
      results.push({ name, ok: false, reason: `HTTP ${res.status}` });
      continue;
    }
    const json = await res.json();
    // files[0] is always the component file, e.g. "DepthText/DepthText.jsx"
    const file = json.files?.[0];
    if (!file?.content) {
      console.log(`FAIL (no content in JSON)`);
      results.push({ name, ok: false, reason: 'no content' });
      continue;
    }
    const outPath = join(OUT_DIR, `${name}.jsx`);
    writeFileSync(outPath, file.content, 'utf8');
    const deps = json.dependencies ?? [];
    console.log(`OK (deps: ${deps.length ? deps.join(', ') : 'none'})`);
    results.push({ name, ok: true, deps });
  } catch (err) {
    console.log(`ERROR: ${err.message}`);
    results.push({ name, ok: false, reason: err.message });
  }
}

console.log('\n--- Summary ---');
const ok = results.filter(r => r.ok);
const fail = results.filter(r => !r.ok);
console.log(`Fetched: ${ok.length}/${NAMES.length}`);
if (fail.length) {
  console.log('Failed:', fail.map(r => `${r.name} (${r.reason})`).join(', '));
}
console.log('\nAll deps across components:');
const allDeps = [...new Set(results.flatMap(r => r.deps ?? []))];
console.log(allDeps.length ? allDeps.join('\n') : '(none)');
