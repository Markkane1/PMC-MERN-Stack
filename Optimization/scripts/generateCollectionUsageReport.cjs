const fs = require('fs');
const path = require('path');

const root = process.cwd();

function walk(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', 'dist', 'build'].includes(e.name)) continue;
      walk(f, exts, out);
    } else if (exts.includes(path.extname(e.name))) {
      out.push(f);
    }
  }
  return out;
}

const modelFiles = walk(path.join(root, 'server/src/infrastructure/database/models'), ['.ts']);
const modelMap = new Map();

for (const file of modelFiles) {
  const text = fs.readFileSync(file, 'utf8');
  const regex = /export\s+const\s+(\w+Model)\s*=\s*mongoose\.model(?:<[^>]*>)?\(\s*'([^']+)'\s*,([\s\S]*?)\)/g;
  let m;
  while ((m = regex.exec(text))) {
    const modelConst = m[1];
    const defaultCollection = m[2];
    const argsChunk = m[3];
    const trailingCollection = argsChunk.match(/,\s*'([^']+)'\s*$/);
    const collection = trailingCollection ? trailingCollection[1] : defaultCollection;
    modelMap.set(modelConst, {
      model: defaultCollection,
      collection,
      file: path.relative(root, file).replace(/\\/g, '/'),
    });
  }
}

const runtimeRoots = [
  path.join(root, 'server/src/interfaces'),
  path.join(root, 'server/src/application'),
  path.join(root, 'server/src/infrastructure/database/repositories'),
  path.join(root, 'server/src/infrastructure/cache'),
  path.join(root, 'server/src/infrastructure/config'),
  path.join(root, 'server/src/infrastructure/ha'),
  path.join(root, 'server/src/infrastructure/monitoring'),
  path.join(root, 'server/src/app.ts'),
  path.join(root, 'server/src/server.ts'),
];

const runtimeFiles = [];
for (const candidate of runtimeRoots) {
  if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
    runtimeFiles.push(...walk(candidate, ['.ts']));
  } else if (fs.existsSync(candidate)) {
    runtimeFiles.push(candidate);
  }
}

const usedModels = [];
for (const [modelConst, info] of modelMap.entries()) {
  const pattern = new RegExp(`\\b${modelConst}\\b`);
  const refs = [];
  for (const file of runtimeFiles) {
    const text = fs.readFileSync(file, 'utf8');
    if (pattern.test(text)) {
      refs.push(path.relative(root, file).replace(/\\/g, '/'));
    }
  }
  if (refs.length > 0) {
    usedModels.push({ modelConst, ...info, refs: refs.slice(0, 5), refCount: refs.length });
  }
}

usedModels.sort((a, b) => a.collection.localeCompare(b.collection));
const usedCollections = [...new Set(usedModels.map((m) => m.collection))];
if (!usedCollections.includes('Counter')) {
  usedCollections.push('Counter');
}
usedCollections.sort();

const allCollections = [...new Set([...modelMap.values()].map((x) => x.collection))].sort();
const unusedCollections = allCollections.filter((c) => !usedCollections.includes(c));

const generatedAt = new Date().toISOString();

const md = [];
md.push('# DB Collection Access Hardening');
md.push('');
md.push(`Generated: ${generatedAt}`);
md.push('');
md.push('## Summary');
md.push('');
md.push(`- Model collections discovered: ${allCollections.length}`);
md.push(`- Collections used by API runtime: ${usedCollections.length}`);
md.push(`- Collections not referenced by API runtime: ${unusedCollections.length}`);
md.push('');
md.push('## API Collection Allow-List');
md.push('');
for (const c of usedCollections) md.push(`- \`${c}\``);
md.push('');
md.push('## Collections Not Used by API Runtime');
md.push('');
if (!unusedCollections.length) {
  md.push('- None');
} else {
  for (const c of unusedCollections) md.push(`- \`${c}\``);
}
md.push('');
md.push('## Hardening Actions Applied');
md.push('');
md.push('- Added runtime allow-list: `server/src/infrastructure/database/collectionAllowList.ts`.');
md.push('- Added dry-run prune script: `npm run db:prune-unused --prefix server`.');
md.push('- Added apply prune script: `npm run db:prune-unused:apply --prefix server`.');
md.push('- Existing backup cleanup remains available: `npm run cleanup:bak --prefix server`.');
md.push('');
md.push('## Notes');
md.push('');
md.push('- `Counter` is retained because numeric ID generation in model hooks depends on it.');
md.push('- Prune script excludes MongoDB system collections (e.g. `system.*`).');

fs.writeFileSync(path.join(root, 'Optimization/DB_COLLECTION_HARDENING.md'), md.join('\n'));
fs.writeFileSync(
  path.join(root, 'Optimization/db-collection-usage.json'),
  JSON.stringify({
    generatedAt,
    allCollections,
    usedCollections,
    unusedCollections,
    usedModels,
  }, null, 2)
);

console.log('Generated Optimization/DB_COLLECTION_HARDENING.md');
console.log(`Used collections: ${usedCollections.length}`);
console.log(`Unused collections: ${unusedCollections.length}`);
