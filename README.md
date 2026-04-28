# strip-volatile

A [pi.dev](https://pi.dev) extension that strips volatile runtime data from `settings.json` on exit, preventing it from being persisted across sessions.

## What it strips

| Key | Why it's volatile |
|-----|-------------------|
| `defaultModel` | Set whenever you change models — leaks the last model used |
| `defaultProvider` | Set alongside `defaultModel` |
| `lastChangelogVersion` | Written on every version bump to control changelog display |

These keys are written to `~/.pi/agent/settings.json` during normal pi operation. This extension hooks `session_shutdown` and removes them synchronously before the process exits, so they never survive a restart.

## Install

```bash
pi install git:github.com/mcowger/strip-volatile
```

Or add to your `settings.json`:

```json
{
  "packages": ["git:github.com/mcowger/strip-volatile"]
}
```

## How it works

The extension subscribes to the `session_shutdown` event with `reason: "quit"`, which fires on normal exit (Ctrl+C, Ctrl+D, SIGHUP, SIGTERM). It reads `settings.json`, removes the three volatile keys, and writes the file back using synchronous I/O to ensure the cleanup completes before process termination.

Respects `PI_CODING_AGENT_DIR` if set (with `~` expansion), otherwise defaults to `~/.pi/agent`.

## Develop

```bash
bun install
bun run check       # lint + typecheck + test
pi -e .             # load extension locally
```

## License

MIT
