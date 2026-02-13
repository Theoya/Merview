---
allowed-tools: Bash(merview *), Bash(npm install -g *), Bash(git clone *), Bash(npm install), Bash(npm run build*)
---

# Mermaid Diagram Viewer

Render a Mermaid diagram file and open it for interactive viewing with pan and zoom.

## Before Running

First check if `merview` is installed:

```bash
command -v merview >/dev/null 2>&1 && echo "installed" || echo "not installed"
```

If **not installed**, set it up (one-time):

```bash
git clone https://github.com/RocketAnabasis/Mermaid-Viewer.git /tmp/mermaid-viewer && cd /tmp/mermaid-viewer && npm install && npm run build:prod && npm install -g .
```

## Usage

```bash
merview $ARGUMENTS
```

## Options

- `--theme dark|light|auto` — Color theme (default: dark)
- `--browser` — Open in browser instead of Electron app

## Examples

```bash
merview diagram.mermaid
merview --theme light flowchart.mmd
merview --browser diagram.mermaid
merview                              # standalone app with drag-and-drop
```

## Notes

- Default: opens in a native Electron window with file watching (auto-reloads on save)
- `--browser` falls back to opening in the default browser
- Supports mouse wheel zoom, click-drag panning, and fit-to-screen
- Works with all Mermaid diagram types: flowcharts, sequence, class, state, ER, etc.
