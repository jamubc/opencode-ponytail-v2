// opencode-ponytail-v2: ponytail's OpenCode behavior, on the V2 plugin API.
//
// Upstream's OpenCode plugin implements the V1 plugin API only, so OpenCode 2.x
// refuses to load it ("Plugin must export a default definition with an id and
// an effect or setup function"). This entrypoint registers the same three
// things through V2: the system-prompt injection (session "context" hook), the
// six commands (ctx.command.transform), and the six skills (ctx.skill.transform).
//
// The instruction builders, skills, and commands under vendor/upstream are
// copied verbatim from the pinned upstream release, so the injected text and
// the command/skill content are byte-identical to upstream's.
import { commandDefinitions } from "./src/commands.js"
import { instructionsForMode } from "./src/instructions.js"
import { readMode } from "./src/mode.js"
import { skillEntries } from "./src/skills.js"

export default {
  id: "ponytail",

  async setup(ctx) {
    // Upstream V1: experimental.chat.system.transform appended the ruleset to
    // the last system prompt block. Same text, appended the same way.
    await ctx.session.hook("context", (event) => {
      const text = instructionsForMode(readMode())
      if (!text) return
      const system = event.system
      const last = system[system.length - 1]
      if (last && last.type === "text" && typeof last.text === "string") {
        last.text += "\n\n" + text
      } else {
        system.push({ type: "text", text })
      }
    })

    // Upstream V1: config.command entries, with command.execute.before writing
    // the /ponytail level before the command prompt was submitted.
    await ctx.command.transform((editor) => {
      for (const definition of commandDefinitions(ctx)) editor.add(definition)
    })

    // Upstream V1: config.skills.paths pointing at the bundled skills directory.
    const skills = skillEntries()
    if (skills.length > 0) {
      await ctx.skill.transform((editor) => {
        for (const skill of skills) editor.add(skill)
      })
    }
  },
}
