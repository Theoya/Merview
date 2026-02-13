# Mermaid Viewer

Preview Mermaid diagrams with pan, zoom, and auto-reload. Works as a CLI tool, Electron app, VS Code extension, or Claude Code skill.

---

## Install

### Windows (one command)

```powershell
irm https://raw.githubusercontent.com/RocketAnabasis/Mermaid-Viewer/main/install.ps1 | iex
```

This clones the repo, builds it, and adds `merview` to your PATH. Requires [Node.js](https://nodejs.org) and [Git](https://git-scm.com).

<img width="1018" height="927" alt="image" src="https://github.com/user-attachments/assets/311d614d-045d-4a79-a049-bba22ef06eb7" />
<img width="1224" height="829" alt="image" src="https://github.com/user-attachments/assets/550c4842-ea40-4ef3-ba97-e8c4516c0bf3" />

### Download the app (no Node.js needed)

Grab the latest installer or portable exe from **[Releases](https://github.com/RocketAnabasis/Mermaid-Viewer/releases)**:

| Platform | File |
|----------|------|
| Windows (installer) | `Mermaid-Viewer-Setup-x.x.x.exe` |
| Windows (portable) | `Mermaid-Viewer-x.x.x.exe` |
| macOS | `Mermaid-Viewer-x.x.x.dmg` |
| Linux | `Mermaid-Viewer-x.x.x.AppImage` |

### WSL / Linux / macOS (manual)

```bash
git clone https://github.com/RocketAnabasis/Mermaid-Viewer.git
cd Mermaid-Viewer
bash install.sh
```

---

## Usage

```
merview diagram.mermaid              # open in Electron window
merview diagram.mermaid --browser    # open in browser
merview README.md                    # extract mermaid blocks from markdown
merview                              # standalone app (drag & drop)
```

### Options

| Flag | Description |
|------|-------------|
| `-t, --theme <dark\|light\|auto>` | Color theme (default: dark) |
| `-b, --browser` | Open in default browser instead of Electron |

### Supported files

- `.mermaid`, `.mmd` — rendered directly
- `.md`, `.markdown` — extracts all ` ```mermaid ` code blocks and renders them

---

## Features

- **Pan & zoom** — mouse wheel zoom, click-drag pan, fit-to-screen
- **Auto-reload** — watches the file and reloads on save
- **Drag & drop** — drop files onto the Electron window
- **Native menus** — File > Open, View > Theme, zoom controls
- **Markdown support** — extracts and renders mermaid blocks from `.md` files
- **All diagram types** — flowcharts, sequence, class, state, ER, pie, gantt, etc.

---

## Claude Code Skill

Use `/merview` in any Claude Code session. The skill auto-installs if not present.

**Manual install:**

```bash
mkdir -p ~/.claude/commands
curl -o ~/.claude/commands/merview.md https://raw.githubusercontent.com/RocketAnabasis/Mermaid-Viewer/main/claude-skill/mermaid-view.md
```

---

## Development

```bash
npm install
npm run build          # build all entry points
npm run watch          # rebuild on change
npm run electron:dev   # build + launch Electron
npm run electron:dist  # package native installer
```

## License

MIT
