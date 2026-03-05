#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const [, , lockfileArg, ...allowlistArgs] = process.argv

if (!lockfileArg) {
  console.error('Usage: node verify-postinstall-allowlist.cjs <lockfile> [allowedPackage ...]')
  process.exit(1)
}

const lockfilePath = path.resolve(process.cwd(), lockfileArg)
if (!fs.existsSync(lockfilePath)) {
  console.error(`Lockfile not found: ${lockfilePath}`)
  process.exit(1)
}

const raw = fs.readFileSync(lockfilePath, 'utf8')
const lock = JSON.parse(raw)
const packages = lock.packages || {}
const allowed = new Set(allowlistArgs)
const scriptHooks = ['preinstall', 'install', 'postinstall', 'prepare']
const violations = []

for (const [pkgPath, meta] of Object.entries(packages)) {
  if (!pkgPath.startsWith('node_modules/') || !meta || typeof meta !== 'object') continue
  const scripts = meta.scripts || {}
  const hooks = scriptHooks.filter((hook) => typeof scripts[hook] === 'string' && scripts[hook].trim())
  if (!hooks.length) continue

  const packageName = pkgPath.slice('node_modules/'.length)
  if (!allowed.has(packageName)) {
    violations.push({
      packageName,
      hooks,
    })
  }
}

if (violations.length) {
  console.error('Unexpected install-time scripts detected:')
  for (const violation of violations) {
    console.error(`- ${violation.packageName}: ${violation.hooks.join(', ')}`)
  }
  process.exit(1)
}

console.log(`Install script audit passed for ${path.basename(lockfilePath)}.`)

