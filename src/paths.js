// Where everything lives: the vendored upstream content, and upstream's flag
// file. Paths are resolved from this module so the package works from any
// install location (npm cache, git install, local checkout).
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))

/** Root of the vendored upstream content, mirroring upstream's layout. */
export const UPSTREAM_DIR = path.resolve(here, "..", "vendor", "upstream")
export const UPSTREAM_HOOKS_DIR = path.join(UPSTREAM_DIR, "hooks")
export const UPSTREAM_INSTRUCTIONS = path.join(UPSTREAM_HOOKS_DIR, "ponytail-instructions.js")
export const UPSTREAM_CONFIG = path.join(UPSTREAM_HOOKS_DIR, "ponytail-config.js")
export const UPSTREAM_SKILLS_DIR = path.join(UPSTREAM_DIR, "skills")
export const UPSTREAM_COMMANDS_DIR = path.join(UPSTREAM_DIR, ".opencode", "command")
export const UPSTREAM_FRONTMATTER = path.join(
  UPSTREAM_DIR,
  ".opencode",
  "plugins",
  "ponytail-frontmatter.cjs",
)

// Upstream's V1 OpenCode plugin keeps the active level in this file (see its
// ponytail.mjs). Keep the exact path so levels stay shared across every
// ponytail host, exactly like upstream.
export function defaultStatePath() {
  return path.join(
    process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"),
    "opencode",
    ".ponytail-active",
  )
}
