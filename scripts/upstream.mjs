#!/usr/bin/env node
// Vendored upstream content: sync it from the pinned @dietrichgebert/ponytail
// release, and check that vendor/upstream still matches that release exactly.
//
//   node scripts/upstream.mjs sync    copy from node_modules into vendor/upstream
//   node scripts/upstream.mjs check   verify vendor/upstream matches byte for byte
import fs from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const vendor = path.join(root, "vendor", "upstream")
const require = createRequire(import.meta.url)

const SKILL_IDS = [
  "ponytail",
  "ponytail-audit",
  "ponytail-debt",
  "ponytail-gain",
  "ponytail-help",
  "ponytail-review",
]
const COMMAND_FILES = [
  "ponytail.md",
  "ponytail-audit.md",
  "ponytail-debt.md",
  "ponytail-gain.md",
  "ponytail-help.md",
  "ponytail-review.md",
]

function locateUpstream() {
  let entry
  try {
    entry = require.resolve("@dietrichgebert/ponytail")
  } catch {
    console.error("Cannot resolve @dietrichgebert/ponytail. Run `npm install` first.")
    process.exit(1)
  }
  // entry is <package>/.opencode/plugins/ponytail.mjs
  return path.resolve(path.dirname(entry), "..", "..")
}

function vendoredFiles(upstreamRoot) {
  const pairs = [
    ["hooks/ponytail-config.js", "hooks/ponytail-config.js"],
    ["hooks/ponytail-instructions.js", "hooks/ponytail-instructions.js"],
    [".opencode/plugins/ponytail-frontmatter.cjs", ".opencode/plugins/ponytail-frontmatter.cjs"],
    ["LICENSE", "LICENSE"],
  ]
  for (const id of SKILL_IDS) pairs.push([`skills/${id}/SKILL.md`, `skills/${id}/SKILL.md`])
  for (const file of COMMAND_FILES) pairs.push([`.opencode/command/${file}`, `.opencode/command/${file}`])
  return pairs.map(([from, to]) => ({
    from: path.join(upstreamRoot, from),
    to: path.join(vendor, to),
  }))
}

function upstreamVersion(upstreamRoot) {
  return JSON.parse(fs.readFileSync(path.join(upstreamRoot, "package.json"), "utf8")).version
}

const command = process.argv[2]
const upstreamRoot = locateUpstream()

if (command === "sync") {
  const pairs = vendoredFiles(upstreamRoot)
  for (const { from, to } of pairs) {
    fs.mkdirSync(path.dirname(to), { recursive: true })
    fs.copyFileSync(from, to)
  }
  fs.mkdirSync(vendor, { recursive: true })
  const version = upstreamVersion(upstreamRoot)
  fs.writeFileSync(path.join(vendor, "UPSTREAM_VERSION"), version + "\n")
  console.log(`Synced ${pairs.length} files from @dietrichgebert/ponytail@${version}`)
} else if (command === "check") {
  const mismatches = []
  const version = upstreamVersion(upstreamRoot)
  const versionFile = path.join(vendor, "UPSTREAM_VERSION")
  const pinned = fs.existsSync(versionFile) ? fs.readFileSync(versionFile, "utf8").trim() : null
  if (pinned !== version) {
    mismatches.push(`UPSTREAM_VERSION: pinned ${pinned ?? "(missing)"}, installed ${version}`)
  }
  for (const { from, to } of vendoredFiles(upstreamRoot)) {
    const expected = fs.readFileSync(from)
    const actual = fs.existsSync(to) ? fs.readFileSync(to) : null
    if (actual === null || !expected.equals(actual)) mismatches.push(path.relative(root, to))
  }
  if (mismatches.length > 0) {
    console.error("Vendored upstream content is out of date:\n  " + mismatches.join("\n  "))
    console.error("Run `npm run sync-upstream`, review the diff, and re-run the tests.")
    process.exit(1)
  }
  console.log(`vendor/upstream matches @dietrichgebert/ponytail@${version}`)
} else {
  console.error("Usage: node scripts/upstream.mjs <sync|check>")
  process.exit(2)
}
