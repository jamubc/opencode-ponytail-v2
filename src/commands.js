// The six slash commands. Upstream's V1 plugin registered the command files
// through the config hook and persisted `/ponytail <level>` in
// command.execute.before. V2 registers the same names, descriptions, and
// prompt templates via ctx.command.transform, and `execute` submits the same
// rendered template upstream's config commands sent.
import fs from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"
import { UPSTREAM_COMMANDS_DIR, UPSTREAM_FRONTMATTER, defaultStatePath } from "./paths.js"
import { getDefaultMode, normalizePersistedMode, writeMode } from "./mode.js"

const require = createRequire(import.meta.url)
const { parseCommandFile } = require(UPSTREAM_FRONTMATTER)

export function listCommands() {
  return fs
    .readdirSync(UPSTREAM_COMMANDS_DIR)
    .filter((file) => file.endsWith(".md"))
    .sort()
    .map((file) => {
      const parsed = parseCommandFile(path.join(UPSTREAM_COMMANDS_DIR, file))
      if (!parsed) return null
      return {
        name: path.basename(file, ".md"),
        description: parsed.description,
        template: parsed.template,
      }
    })
    .filter(Boolean)
}

// Upstream's V1 command.execute.before: `/ponytail <level>` persists the level;
// bare `/ponytail` persists the default, exactly like upstream (known quirk,
// preserved on purpose). Invalid levels change nothing.
export function setModeFromArguments(args, statePath = defaultStatePath()) {
  const arg = String(args ?? "").trim()
  const mode = arg ? normalizePersistedMode(arg) : getDefaultMode()
  if (!mode) return null
  writeMode(mode, statePath)
  return mode
}

// V2 command definitions bound to the plugin context. `prompt.text` is the
// invocation text (what the user typed after the command name); upstream's
// config commands rendered `$ARGUMENTS` from exactly that.
export function commandDefinitions(ctx, { statePath = defaultStatePath() } = {}) {
  return listCommands().map(({ name, description, template }) => ({
    name,
    description,
    async execute({ sessionID, prompt, delivery }) {
      const args = String(prompt?.text ?? "").trim()
      if (name === "ponytail") setModeFromArguments(args, statePath)
      await ctx.session.prompt({
        ...prompt,
        sessionID,
        text: template.replaceAll("$ARGUMENTS", args),
        delivery,
      })
    },
  }))
}
