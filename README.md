# opencode-ponytail-v2

[Ponytail](https://github.com/DietrichGebert/ponytail) for **OpenCode V2**.

Ponytail makes your agent think like the laziest senior dev in the room: before
writing code it stops at the first rung that holds (does this need to exist →
already in the codebase → stdlib → native platform feature → installed
dependency → one line → the minimum that works), while never cutting input
validation, error handling, security, or accessibility.

Upstream ships an OpenCode plugin, but it implements the **V1 plugin API only**,
so OpenCode 2.x refuses to load it:

```
Plugin must export a default definition with an id and an effect or setup function
```

This package ports the same behavior to the V2 plugin API. It does not
reimplement ponytail: the ruleset, skills, commands, and instruction builders
under `vendor/upstream/` are copied verbatim from the pinned upstream release, so
what the model sees is byte-identical.

## What it does

- Injects the active level's ruleset into the system prompt of every request
  (`lite`, `full`, `ultra`; `off` stays silent).
- Registers the six commands: `/ponytail`, `/ponytail-review`, `/ponytail-audit`,
  `/ponytail-debt`, `/ponytail-gain`, `/ponytail-help`.
- Registers the six bundled skills with the same ids, names, descriptions, and
  content as upstream.
- Persists `/ponytail <level>` to the same flag file upstream uses
  (`$XDG_CONFIG_HOME/opencode/.ponytail-active`, falling back to
  `~/.config/opencode/.ponytail-active`), so levels stay shared with every other
  ponytail host.
- Resolves the default level exactly like upstream: `PONYTAIL_DEFAULT_MODE` →
  `~/.config/ponytail/config.json` (`defaultMode`) → `full`.

Deliberately preserved upstream quirk, for parity: a bare `/ponytail` persists
the default level (it does not merely report). A level change is written before
the command's prompt is sent, so it applies from that request on.

## Requirements

OpenCode 2.x (verified on 2.0.14). For OpenCode 1.x, use upstream's own plugin.

## Install

Add the package to `plugins` in your OpenCode config. A project config
(`opencode.json` in the repo) scopes it to that project; the global config
(`~/.config/opencode/opencode.jsonc`) applies everywhere:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@filecrop/opencode-ponytail-v2"]
}
```

Or from a local checkout (point at the directory, not `index.js`):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/path/to/opencode-ponytail-v2"]
}
```

Check it loaded with `opencode plugin list` (look for `ponytail`).

Then use it as upstream documents: `/ponytail lite|full|ultra|off`, or just work:
the ruleset arrives on its own.

## Why it works on V2

The upstream V1 hooks map to V2 like this:

| Upstream (V1)                              | This package (V2)                                          |
| ------------------------------------------ | ---------------------------------------------------------- |
| `experimental.chat.system.transform`       | `ctx.session.hook("context", ...)` appending to `event.system` |
| `config.command` + `command.execute.before`| `ctx.command.transform`, with `execute` rendering the same template and persisting `/ponytail` |
| `config.skills.paths`                      | `ctx.skill.transform`, registering each vendored `SKILL.md` |

The plugin is a plain `{ id, setup }` object, so it has **no runtime
dependencies**: nothing to install alongside it and nothing to build.

## Repo layout

```
index.js                 V2 plugin entry (id + setup)
src/                     paths, mode state, instructions, commands, skills
vendor/upstream/         upstream content, verbatim (hooks, skills, commands, LICENSE);
                         its package.json marks the vendored CJS builders as CommonJS
scripts/upstream.mjs     sync/check the vendored content against the pinned release
test/plugin.test.js      node --test suite
```

## Updating from upstream

The pinned release is the `@dietrichgebert/ponytail` version in
`devDependencies`; `vendor/upstream/UPSTREAM_VERSION` records it.

```sh
npm install
npm run check-drift      # fails if vendor/upstream differs from the pinned release
npm run sync-upstream    # after bumping the devDependency; then review the diff
npm test
```

## Scope

OpenCode V2 only. No V1 fallback, no other hosts. This is an unofficial port;
see upstream for the ruleset itself. The port aims for exact behavioral parity;
if it ever diverges, that is a bug.

## Credits & license

MIT. The ruleset, skills, commands, and instruction builders come from
[ponytail](https://github.com/DietrichGebert/ponytail) by Dietrich Gebert
(MIT); see `vendor/upstream/LICENSE`.
