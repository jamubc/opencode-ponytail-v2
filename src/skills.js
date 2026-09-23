// The six skills. Upstream's V1 plugin handed OpenCode its skills directory
// via config.skills.paths; V2 has no config hook, so each skill is registered
// explicitly with the same id, name, description, and body that directory
// discovery would have read.
import fs from "node:fs"
import path from "node:path"
import { UPSTREAM_SKILLS_DIR } from "./paths.js"

// The vendored SKILL.md files use plain `name:` and folded `description: >`
// frontmatter. A tiny reader is enough; no YAML dependency for six files.
function readFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return null
  const [, frontmatter, body] = match
  const lines = frontmatter.split(/\r?\n/)
  const fields = {}
  for (let i = 0; i < lines.length; i++) {
    const entry = lines[i].match(/^([A-Za-z][\w-]*):\s*(.*)$/)
    if (!entry) continue
    const key = entry[1]
    const inline = entry[2].trim()
    if (inline && !inline.startsWith(">") && !inline.startsWith("|")) {
      fields[key] = inline
      continue
    }
    // Folded (`>`) or literal (`|`) block: take the more-indented lines that
    // follow. Blank lines inside the block are kept as separators.
    const block = []
    let j = i + 1
    for (; j < lines.length; j++) {
      const line = lines[j]
      if (line.trim() === "") {
        block.push("")
        continue
      }
      if (!/^\s/.test(line)) break
      block.push(line.trim())
    }
    i = j - 1
    fields[key] = inline.startsWith("|")
      ? block.join("\n").trim()
      : block.join(" ").replace(/\s+/g, " ").trim()
  }
  return { fields, body }
}

export function parseSkillFile(filePath) {
  const parsed = readFrontmatter(fs.readFileSync(filePath, "utf8"))
  if (!parsed) return null
  return {
    name: parsed.fields.name || path.basename(path.dirname(filePath)),
    description: parsed.fields.description || undefined,
    content: parsed.body.trim(),
  }
}

export function skillEntries(dir = UPSTREAM_SKILLS_DIR) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .map((id) => {
      const filePath = path.join(dir, id, "SKILL.md")
      const parsed = parseSkillFile(filePath)
      if (!parsed) return null
      return {
        id,
        name: parsed.name,
        description: parsed.description,
        path: filePath,
        content: parsed.content,
      }
    })
    .filter(Boolean)
}
