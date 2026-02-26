const fs = require('fs');
const path = require('path');

const root = process.cwd();

function walk(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'build') continue;
      walk(full, exts, out);
    } else if (entry.isFile() && exts.includes(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

function lineNumber(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function normalizePath(raw) {
  if (!raw) return '';
  let p = raw.trim();
  p = p.replace(/^https?:\/\/[^/]+/i, '');
  p = p.split('?')[0];
  p = p.replace(/^\/api(?=\/|$)/i, '');
  p = p.replace(/\$\{[^}]+\}/g, ':param');
  p = p.replace(/:[A-Za-z_][A-Za-z0-9_]*/g, ':param');
  p = p.replace(/\/+/g, '/');
  if (!p.startsWith('/')) p = '/' + p;
  if (p.length > 1) p = p.replace(/\/+$/g, '');
  return p;
}

function loadEndpointConfig() {
  const cfgPath = path.join(root, 'client/src/configs/endpoint.config.ts');
  const map = {};
  if (!fs.existsSync(cfgPath)) return map;
  const text = fs.readFileSync(cfgPath, 'utf8');
  const re = /(\w+)\s*:\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(text))) {
    map[m[1]] = m[2];
  }
  return map;
}

function collectServerRoutes() {
  const routesDir = path.join(root, 'server/src/interfaces/http/routes');
  const files = walk(routesDir, ['.ts']);
  const prefixByFile = {
    'accounts.routes.ts': '/accounts',
    'pmc.routes.ts': '/pmc',
    'cache.routes.ts': '/cache',
    'common.routes.ts': '',
  };

  const out = [];
  const re = /(\w+Router)\.(get|post|put|patch|delete)\(\s*(["'`])([^"'`]+)\3/g;

  for (const file of files) {
    const base = path.basename(file);
    const prefix = prefixByFile[base];
    if (prefix === undefined) continue;
    const text = fs.readFileSync(file, 'utf8');
    const parseText = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    let m;
    while ((m = re.exec(parseText))) {
      const method = m[2].toUpperCase();
      const rawPath = `${prefix}${m[4]}`;
      const normalizedPath = normalizePath(rawPath);
      out.push({
        method,
        path: normalizedPath,
        file: path.relative(root, file).replace(/\\/g, '/'),
        line: lineNumber(parseText, m.index),
      });
    }
  }

  return out;
}

function collectClientCalls(endpointConfigMap) {
  const files = walk(path.join(root, 'client/src'), ['.ts', '.tsx']);
  const out = [];

  const axiosCallRe = /AxiosBase\.(get|post|put|patch|delete)\(\s*(?:`([^`]+)`|'([^']+)'|"([^"]+)")/g;
  const fetchBlockRe = /fetchDataWithAxios(?:<[^>]*>)?\(\s*\{([\s\S]*?)\}\s*\)/g;

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const parseText = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

    let m;
    while ((m = axiosCallRe.exec(parseText))) {
      const method = m[1].toUpperCase();
      const rawPath = m[2] || m[3] || m[4] || '';
      out.push({
        method,
        path: normalizePath(rawPath),
        rawPath,
        file: path.relative(root, file).replace(/\\/g, '/'),
        line: lineNumber(parseText, m.index),
        source: 'AxiosBase',
      });
    }

    while ((m = fetchBlockRe.exec(parseText))) {
      const block = m[1];
      const methodMatch = block.match(/method\s*:\s*['"](get|post|put|patch|delete)['"]/i);
      const urlMatch = block.match(/url\s*:\s*(?:`([^`]+)`|'([^']+)'|"([^"]+)"|endpointConfig\.(\w+))/);
      if (!methodMatch || !urlMatch) continue;

      let rawPath = urlMatch[1] || urlMatch[2] || urlMatch[3] || '';
      if (!rawPath && urlMatch[4]) rawPath = endpointConfigMap[urlMatch[4]] || '';
      if (!rawPath) continue;

      out.push({
        method: methodMatch[1].toUpperCase(),
        path: normalizePath(rawPath),
        rawPath,
        file: path.relative(root, file).replace(/\\/g, '/'),
        line: lineNumber(parseText, m.index),
        source: 'ApiService',
      });
    }
  }

  return out;
}

function keyOf(x) {
  return `${x.method} ${x.path}`;
}

function uniqByKey(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const k = keyOf(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

function toMdTable(rows, headers) {
  const head = `| ${headers.join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((r) => `| ${r.join(' | ')} |`).join('\n');
  return [head, sep, body].filter(Boolean).join('\n');
}

const endpointConfigMap = loadEndpointConfig();
const serverRoutes = uniqByKey(collectServerRoutes()).sort((a, b) => keyOf(a).localeCompare(keyOf(b)));
const clientCallsRaw = collectClientCalls(endpointConfigMap).filter((x) => x.path && x.path !== '/');
const clientCalls = uniqByKey(clientCallsRaw).sort((a, b) => keyOf(a).localeCompare(keyOf(b)));

const serverKeySet = new Set(serverRoutes.map(keyOf));
const clientKeySet = new Set(clientCalls.map(keyOf));

const matched = clientCalls.filter((c) => serverKeySet.has(keyOf(c)));
const unmatchedClient = clientCalls.filter((c) => !serverKeySet.has(keyOf(c)));
const serverNotUsedByClient = serverRoutes.filter((s) => !clientKeySet.has(keyOf(s)));

const now = new Date().toISOString();

const md = [];
md.push('# API Contract and Client Sync Matrix');
md.push('');
md.push(`Generated: ${now}`);
md.push('');
md.push('## Summary');
md.push('');
md.push(`- Server endpoints discovered: ${serverRoutes.length}`);
md.push(`- Client endpoint calls discovered: ${clientCalls.length}`);
md.push(`- Client calls matched to server: ${matched.length}`);
md.push(`- Client calls missing on server: ${unmatchedClient.length}`);
md.push(`- Server endpoints not called by client: ${serverNotUsedByClient.length}`);
md.push('');

md.push('## Client Calls Missing on Server');
md.push('');
if (unmatchedClient.length === 0) {
  md.push('None');
} else {
  md.push(
    toMdTable(
      unmatchedClient.map((x) => [x.method, `\`${x.path}\``, `\`${x.file}:${x.line}\``]),
      ['Method', 'Path', 'Client Source']
    )
  );
}
md.push('');

md.push('## Server Endpoints Not Used by Client');
md.push('');
if (serverNotUsedByClient.length === 0) {
  md.push('None');
} else {
  md.push(
    toMdTable(
      serverNotUsedByClient.map((x) => [x.method, `\`${x.path}\``, `\`${x.file}:${x.line}\``]),
      ['Method', 'Path', 'Server Source']
    )
  );
}
md.push('');

md.push('## Fully Matched Endpoints');
md.push('');
md.push(
  toMdTable(
    matched.map((x) => [x.method, `\`${x.path}\``]),
    ['Method', 'Path']
  )
);
md.push('');

fs.writeFileSync(path.join(root, 'Optimization/API_CLIENT_SYNC_MATRIX.md'), md.join('\n'));
fs.writeFileSync(
  path.join(root, 'Optimization/api-client-sync.json'),
  JSON.stringify({
    generatedAt: now,
    summary: {
      serverEndpoints: serverRoutes.length,
      clientEndpoints: clientCalls.length,
      matched: matched.length,
      unmatchedClient: unmatchedClient.length,
      serverNotUsedByClient: serverNotUsedByClient.length,
    },
    unmatchedClient,
    serverNotUsedByClient,
    matched,
  }, null, 2)
);

console.log('Generated Optimization/API_CLIENT_SYNC_MATRIX.md');
console.log(`Matched ${matched.length}/${clientCalls.length} client endpoints`);
console.log(`Unmatched client endpoints: ${unmatchedClient.length}`);
