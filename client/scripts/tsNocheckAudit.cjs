#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..', 'src')
const needle = '@ts-nocheck'

function walk(dir, acc) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(full, acc)
      continue
    }
    if (!/\.(ts|tsx)$/.test(entry.name)) continue
    const text = fs.readFileSync(full, 'utf8')
    if (text.includes(needle)) {
      acc.push(path.relative(path.resolve(__dirname, '..'), full).replace(/\\/g, '/'))
    }
  }
}

function groupByArea(files) {
  const groups = {}
  for (const file of files) {
    const parts = file.split('/')
    const area = parts.length >= 3 ? `${parts[0]}/${parts[1]}/${parts[2]}` : file
    groups[area] = (groups[area] || 0) + 1
  }
  return Object.entries(groups).sort((a, b) => b[1] - a[1])
}

const files = []
walk(root, files)
files.sort()

const payload = {
  total: files.length,
  files,
  grouped: groupByArea(files).map(([area, count]) => ({ area, count })),
  generatedAt: new Date().toISOString(),
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(payload, null, 2))
  process.exit(0)
}

console.log(`Total @ts-nocheck files: ${payload.total}`)
console.log('')
console.log('By area:')
for (const row of payload.grouped) {
  console.log(`- ${row.area}: ${row.count}`)
}
console.log('')
console.log('Files:')
for (const file of payload.files) {
  console.log(`- ${file}`)
}
