import fs from 'node:fs';

const files = [
  'components/FilterDrawer.tsx',
  'stores/useMarketplaceStore.ts',
];

const guardedSymbols = [
  'uniqueEras',
  'eraOptions',
  'availableEraOptions',
  'derivedEraOptions',
];

let hasError = false;

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');

  if (/^<<<<<<<|^=======|^>>>>>>>/m.test(src)) {
    hasError = true;
    console.error(`[check-duplicate-symbols] merge conflict markers found in ${file}`);
  }

  for (const symbol of guardedSymbols) {
    const re = new RegExp(`\\bconst\\s+${symbol}\\s*=`, 'g');
    const matches = src.match(re) || [];
    if (matches.length > 1) {
      hasError = true;
      console.error(`[check-duplicate-symbols] ${file}: const ${symbol} declared ${matches.length} times`);
    }
  }
}

if (hasError) {
  console.error('\nDuplicate/merge guard failed.');
  process.exit(1);
}

console.log('Duplicate/merge guard passed.');
