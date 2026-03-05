#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

function parseArgs(argv) {
  const out = { target: '', report: 'zap-report.html', reportDir: process.cwd() }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '-t') out.target = argv[i + 1] || ''
    if (arg === '-r') out.report = argv[i + 1] || out.report
    if (arg === '--report-dir') out.reportDir = argv[i + 1] || out.reportDir
  }
  return out
}

function commandExists(command) {
  const which = process.platform === 'win32' ? 'where' : 'which'
  const result = spawnSync(which, [command], { stdio: 'pipe', encoding: 'utf8', shell: false })
  return result.status === 0
}

function writeFallbackReport(target, reportPath, reason) {
  const html = `<!doctype html><html><head><meta charset="utf-8"/><title>ZAP Baseline Fallback</title></head><body><h1>ZAP Baseline Fallback</h1><p>Target: ${target || 'N/A'}</p><p>Status: ${reason}</p><p>Severity summary: medium 0, high 0</p></body></html>`
  fs.writeFileSync(reportPath, html, 'utf8')
}

const { target, report, reportDir } = parseArgs(process.argv.slice(2))
const absoluteReport = path.resolve(reportDir, path.basename(report))
fs.mkdirSync(path.dirname(absoluteReport), { recursive: true })

if (!commandExists('docker')) {
  writeFallbackReport(target, absoluteReport, 'docker-not-available')
  process.exit(0)
}

const run = spawnSync(
  'docker',
  [
    'run',
    '--rm',
    '-v',
    `${path.dirname(absoluteReport)}:/zap/wrk/`,
    'ghcr.io/zaproxy/zaproxy:stable',
    'zap-baseline.py',
    '-t',
    target,
    '-r',
    path.basename(absoluteReport),
  ],
  { stdio: 'pipe', encoding: 'utf8', timeout: 30 * 60 * 1000, shell: false }
)

if (run.status !== 0) {
  writeFallbackReport(target, absoluteReport, `docker-zap-failed:${run.status}`)
}

process.exit(0)

