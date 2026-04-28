# pi-ext-CHANGEME

A [pi.dev](https://pi.dev) extension.

## Install

```bash
pi install git:github.com/vegardx/pi-ext-CHANGEME
```

## Develop

```bash
npm install
npm run check       # lint + typecheck + test
pi -e .             # load extension locally
```

## What's inside

- `index.ts` — extension entry point. The default export receives an
  [`ExtensionAPI`](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/extensions.md)
  instance — register events, commands, tools, and shortcuts from there.

## Creating a new extension from this template

```bash
gh repo create vegardx/pi-ext-my-ext --template vegardx/pi-ext-template --public --clone
cd pi-ext-my-ext
```

Then find-and-replace `CHANGEME` with your extension name in `package.json` and `README.md`.

## License

MIT
