---
allowed-tools: Bash(merview *), Bash(npm install -g *), Bash(git clone *), Bash(npm install), Bash(npm run build*), Write(*), Read(*)
---

# Mermaid Diagram Viewer

Render Mermaid diagrams with pan/zoom, and add text annotations programmatically.

Use this skill **any time a concept needs to be visualized** — system architecture, data flows, state machines, sequences, class hierarchies, ER diagrams. Don't just write text descriptions when a diagram would communicate better.

## Before Running

Check if `merview` is installed:

```bash
command -v merview >/dev/null 2>&1 && echo "installed" || echo "not installed"
```

If **not installed**, set it up (one-time):

```bash
git clone https://github.com/RocketAnabasis/Mermaid-Viewer.git /tmp/mermaid-viewer && cd /tmp/mermaid-viewer && npm install && npm run build:prod && npm install -g .
```

---

## Full Agent Workflow

### 1. Write the diagram

Write Mermaid syntax to a `.mermaid` file, then open it.

```bash
cat > /tmp/architecture.mermaid << 'EOF'
graph TD
    Client -->|HTTP| API[API Gateway]
    API --> Auth[Auth Service]
    API --> Data[Data Service]
    Data --> DB[(PostgreSQL)]
EOF
```

Or use the Write tool to create the file, then open it.

### 2. Open the viewer

```bash
merview /tmp/architecture.mermaid
```

Options:
- `--theme dark|light|auto` — color theme (default: dark)
- `--browser` — open in browser instead of Electron window

### 3. Add text annotations

Add explanatory text blocks that appear overlaid on the diagram. The viewer auto-reloads them.

```bash
# Add a text block at diagram coordinates (x, y)
merview annotate /tmp/architecture.mermaid --text "**Auth:** JWT with 15m expiry" --x 400 --y 50

# Multi-line markdown
merview annotate /tmp/architecture.mermaid --text "**Note:** DB uses read replicas\n- Primary in us-east-1\n- Replica in us-west-2" --x 50 --y 300

# Custom color and size
merview annotate /tmp/architecture.mermaid --text "⚠️ Bottleneck — add caching here" --x 200 --y 200 --color "#ff6b6b" --font-size 13
```

**Annotation options:**

| Flag | Default | Description |
|------|---------|-------------|
| `--text <markdown>` | required | Markdown content (bold, italic, code, lists all work) |
| `--x <n>` | 50 | X position in diagram coordinates |
| `--y <n>` | 50 | Y position in diagram coordinates |
| `--color <hex>` | #f5c542 | Text color |
| `--font-size <n>` | 14 | Font size in px |
| `--width <n>` | 240 | Text block width in px |

**Manage annotations:**

```bash
merview annotate diagram.mermaid --list            # list all text annotations with IDs
merview annotate diagram.mermaid --list --json     # machine-readable JSON output (use this in scripts)
merview annotate diagram.mermaid --delete ann_xyz  # remove one by ID
merview annotate diagram.mermaid --clear           # remove all annotations
```

Annotations persist in a `.smv` sidecar file next to the diagram. The viewer hot-reloads changes.

---

## Positioning Guide

Diagram coordinates map to the SVG space (not screen pixels). Common starting points:
- Top of diagram: `--x 50 --y 10`
- Right side: `--x 600 --y 100` (adjust for diagram width)
- Below diagram: `--x 50 --y 500`

Open the diagram first to inspect positions visually when precision matters.

---

## Examples

**Architecture with notes:**
```bash
cat > /tmp/arch.mermaid << 'EOF'
graph LR
    LB[Load Balancer] --> API1[API Pod 1]
    LB --> API2[API Pod 2]
    API1 --> Cache[(Redis)]
    API2 --> Cache
    Cache --> DB[(Postgres)]
EOF
merview /tmp/arch.mermaid
merview annotate /tmp/arch.mermaid --text "**Scaling target:** 10k req/s" --x 10 --y 10
merview annotate /tmp/arch.mermaid --text "Cache TTL: 60s\nEviction: LRU" --x 420 --y 80
```

**State machine with explanations:**
```bash
cat > /tmp/states.mermaid << 'EOF'
stateDiagram-v2
    [*] --> IDLE
    IDLE --> ARMED: STATE ARM
    ARMED --> FIRING: STATE FIRE
    FIRING --> IDLE: complete
    ARMED --> IDLE: STATE ABORT
EOF
merview /tmp/states.mermaid
merview annotate /tmp/states.mermaid --text "Manual operator command required\nfor each transition" --x 10 --y 10 --color "#4fc3f7"
```

---

## All supported diagram types

flowchart, sequenceDiagram, classDiagram, stateDiagram-v2, erDiagram, gantt, pie, journey, gitGraph, C4Context, quadrantChart, xychart-beta, block-beta, packet-beta, architecture-beta, timeline, mindmap, sankey-beta, zenuml
