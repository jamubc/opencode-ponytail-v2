import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import plugin from "../index.js"
import { commandDefinitions, listCommands, setModeFromArguments } from "../src/commands.js"
import { getPonytailInstructions, instructionsForMode } from "../src/instructions.js"
import { writeMode } from "../src/mode.js"
import { skillEntries } from "../src/skills.js"

const MODE_COMMANDS = [
  "ponytail",
  "ponytail-audit",
  "ponytail-debt",
  "ponytail-gain",
  "ponytail-help",
  "ponytail-review",
]

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ponytail-v2-"))
}

async function runWithEnv(env, fn) {
  const saved = Object.fromEntries(Object.entries(env).map(([key]) => [key, process.env[key]]))
  Object.assign(process.env, env)
  try {
    return await fn()
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

// A stand-in for the V2 plugin context: captures registrations and prompt calls.
function fakeContext() {
  const registered = { hooks: new Map(), commands: [], skills: [], prompts: [] }
  const ctx = {
    session: {
      hook: async (name, fn) => {
        registered.hooks.set(name, fn)
      },
      prompt: async (input) => {
        registered.prompts.push(input)
      },
    },
    command: {
      transform: async (fn) => {
        fn({ add: (definition) => registered.commands.push(definition) })
      },
    },
    skill: {
      transform: async (fn) => {
        fn({ add: (skill) => registered.skills.push(skill) })
      },
    },
  }
  return { ctx, registered }
}

test("exports a V2 plugin definition", () => {
  assert.equal(plugin.id, "ponytail")
  assert.equal(typeof plugin.setup, "function")
})

test("setup registers the context hook, six commands, and six skills", async () => {
  const { ctx, registered } = fakeContext()
  await plugin.setup(ctx)
  assert.ok(registered.hooks.has("context"))
  assert.deepEqual(registered.commands.map((c) => c.name).sort(), MODE_COMMANDS)
  assert.deepEqual(registered.skills.map((s) => s.id).sort(), MODE_COMMANDS)
})

test("the context hook appends the active level's ruleset to the last text block", async () => {
  const dir = tempDir()
  const statePath = path.join(dir, "opencode", ".ponytail-active")
  await runWithEnv({ XDG_CONFIG_HOME: dir }, async () => {
    writeMode("ultra", statePath)
    const { ctx, registered } = fakeContext()
    await plugin.setup(ctx)
    const hook = registered.hooks.get("context")
    const event = { system: [{ type: "text", text: "base" }] }
    hook(event)
    assert.equal(event.system.length, 1)
    assert.equal(event.system[0].text, "base\n\n" + getPonytailInstructions("ultra"))
  })
})

test("off injects nothing, and an empty system prompt gets a fresh text block", async () => {
  const dir = tempDir()
  const statePath = path.join(dir, "opencode", ".ponytail-active")
  await runWithEnv({ XDG_CONFIG_HOME: dir }, async () => {
    writeMode("off", statePath)
    const { ctx, registered } = fakeContext()
    await plugin.setup(ctx)
    const hook = registered.hooks.get("context")

    const off = { system: [{ type: "text", text: "base" }] }
    hook(off)
    assert.equal(off.system[0].text, "base")

    writeMode("lite", statePath)
    const empty = { system: [] }
    hook(empty)
    assert.equal(empty.system.length, 1)
    assert.equal(empty.system[0].text, getPonytailInstructions("lite"))
  })
})

test("/ponytail <level> persists the level and submits the rendered template", async () => {
  const dir = tempDir()
  const statePath = path.join(dir, "state")
  const { ctx, registered } = fakeContext()
  const definitions = commandDefinitions(ctx, { statePath })
  await definitions
    .find((definition) => definition.name === "ponytail")
    .execute({ sessionID: "s1", prompt: { text: "ultra" }, delivery: "steer" })

  assert.equal(fs.readFileSync(statePath, "utf8"), "ultra")
  assert.equal(registered.prompts.length, 1)
  assert.match(registered.prompts[0].text, /^Switch to ponytail ultra mode\./)
  assert.ok(!registered.prompts[0].text.includes("$ARGUMENTS"))
  assert.equal(registered.prompts[0].sessionID, "s1")
  assert.equal(registered.prompts[0].delivery, "steer")
})

test("bare /ponytail persists the default level, like upstream", async () => {
  const dir = tempDir()
  const statePath = path.join(dir, "state")
  await runWithEnv({ PONYTAIL_DEFAULT_MODE: "lite" }, async () => {
    const { ctx } = fakeContext()
    const definitions = commandDefinitions(ctx, { statePath })
    await definitions
      .find((definition) => definition.name === "ponytail")
      .execute({ sessionID: "s1", prompt: { text: "" }, delivery: "steer" })
    assert.equal(fs.readFileSync(statePath, "utf8"), "lite")
  })
})

test("an invalid level changes nothing", () => {
  const statePath = path.join(tempDir(), "state")
  assert.equal(setModeFromArguments("nonsense", statePath), null)
  assert.equal(fs.existsSync(statePath), false)
})

test("the other commands submit their template and touch no state", async () => {
  const dir = tempDir()
  const statePath = path.join(dir, "state")
  const { ctx, registered } = fakeContext()
  const definitions = commandDefinitions(ctx, { statePath })
  await definitions
    .find((definition) => definition.name === "ponytail-review")
    .execute({ sessionID: "s2", prompt: { text: "src/" }, delivery: "queue" })

  assert.equal(fs.existsSync(statePath), false)
  assert.equal(registered.prompts.length, 1)
  assert.match(registered.prompts[0].text, /^Review the current code changes/)
  assert.equal(registered.prompts[0].delivery, "queue")
})

test("commands carry upstream descriptions and templates", () => {
  const commands = listCommands()
  assert.equal(commands.length, 6)
  for (const command of commands) {
    assert.ok(command.description, `${command.name} has no description`)
    assert.ok(command.template, `${command.name} has no template`)
  }
})

test("all six skills parse with names, descriptions, and content", () => {
  const entries = skillEntries()
  assert.equal(entries.length, 6)
  for (const entry of entries) {
    assert.ok(entry.id)
    assert.ok(entry.name)
    assert.ok(entry.description && entry.description.length > 0, `${entry.id} has no description`)
    assert.ok(entry.content.length > 0, `${entry.id} has no content`)
    assert.ok(!entry.content.startsWith("---"), `${entry.id} content includes frontmatter`)
    assert.ok(fs.existsSync(entry.path))
  }
  assert.match(entries.find((entry) => entry.id === "ponytail-review").description, /over-engineering/)
})

test("instructions match upstream's builder for every runtime level", () => {
  for (const mode of ["lite", "full", "ultra"]) {
    const text = instructionsForMode(mode)
    assert.ok(text.includes("PONYTAIL MODE ACTIVE"))
    assert.equal(text, getPonytailInstructions(mode))
  }
  assert.equal(instructionsForMode("off"), null)
})
