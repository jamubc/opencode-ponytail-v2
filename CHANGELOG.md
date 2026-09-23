# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-09-23

Initial release. Upstream's OpenCode plugin (`@dietrichgebert/ponytail@4.10.0`)
uses the V1 plugin API only, and OpenCode 2.x refuses to load it. This package
ports it to the V2 plugin API.

### Added

- V2 entrypoint: default export `{ id: "ponytail", setup }`.
- Ruleset injection via `ctx.session.hook("context")`, replacing V1
  `experimental.chat.system.transform`.
- Six commands via `ctx.command.transform`, replacing V1 `config.command` and
  `command.execute.before`. `/ponytail <level>` persists the level before the
  prompt is sent.
- Six skills via `ctx.skill.transform`, replacing V1 `config.skills.paths`.
- Upstream ruleset, skills, commands, and instruction builders vendored
  verbatim from `@dietrichgebert/ponytail@4.10.0` under `vendor/upstream/`.
- `vendor/upstream/package.json` with `"type": "commonjs"` so the vendored CJS
  builders load inside this ESM package.
- `npm run sync-upstream` and `npm run check-drift` to update and verify the
  vendored content.

### Removed

- V1 `client.app.log` call on level change: V2 has no equivalent.

[0.1.0]: https://github.com/jamubc/opencode-ponytail-v2/releases/tag/v0.1.0
