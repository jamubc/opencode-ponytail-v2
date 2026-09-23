// Active-level state: upstream's flag file, read and written the same way
// upstream's V1 OpenCode plugin does.
import fs from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"
import { UPSTREAM_CONFIG, defaultStatePath } from "./paths.js"

const require = createRequire(import.meta.url)
const upstream = require(UPSTREAM_CONFIG)

export const getDefaultMode = upstream.getDefaultMode
export const normalizePersistedMode = upstream.normalizePersistedMode

// Same reader as upstream's V1 transform: persisted level, else the resolved
// default (PONYTAIL_DEFAULT_MODE -> ~/.config/ponytail/config.json -> "full").
export function readMode(statePath = defaultStatePath()) {
  try {
    return (
      normalizePersistedMode(fs.readFileSync(statePath, "utf8").trim()) || getDefaultMode()
    )
  } catch {
    return getDefaultMode()
  }
}

// Same writer as upstream's V1 command hook.
export function writeMode(mode, statePath = defaultStatePath()) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true })
  fs.writeFileSync(statePath, mode)
}
