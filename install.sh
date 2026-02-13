#!/usr/bin/env bash
set -e

echo "=== Mermaid Viewer Setup ==="
echo ""

# 1. Install npm dependencies
echo "[1/6] Installing dependencies..."
npm install

# 2. Build the project
echo "[2/6] Building..."
npm run build:prod

# 3. Install CLI globally (puts merview.cmd on Windows PATH via npm global prefix)
echo "[3/6] Installing merview CLI globally..."
npm install -g .

# 4. WSL fix — npm global shims use `node` but WSL only has `node.exe`
#    Create a proper wrapper in ~/.local/bin/ that handles path conversion
if grep -qi microsoft /proc/version 2>/dev/null; then
  echo "[4/6] Setting up WSL wrapper..."
  mkdir -p "$HOME/.local/bin"

  # Ensure node is callable (symlink node → node.exe)
  if ! command -v node &>/dev/null && command -v node.exe &>/dev/null; then
    ln -sf "$(command -v node.exe)" "$HOME/.local/bin/node"
    echo "  Created node symlink in ~/.local/bin/"
  fi

  # Get the npm global cli.js path and create a WSL wrapper
  NPM_GLOBAL="$(npm prefix -g)/node_modules/mermaid-viewer/dist/cli.js"
  cat > "$HOME/.local/bin/merview" << 'WRAPPER'
#!/bin/sh
# WSL wrapper for merview — converts paths for Windows node.exe
SCRIPT="__NPM_GLOBAL__"
WIN_SCRIPT=$(wslpath -w "$SCRIPT" 2>/dev/null || echo "$SCRIPT")

args=""
for arg in "$@"; do
  case "$arg" in
    /mnt/*)
      args="$args \"$(wslpath -w "$arg")\""
      ;;
    -*)
      args="$args \"$arg\""
      ;;
    *)
      if [ -f "$arg" ]; then
        abs=$(realpath "$arg")
        case "$abs" in
          /mnt/*)
            args="$args \"$(wslpath -w "$abs")\""
            ;;
          *)
            args="$args \"$arg\""
            ;;
        esac
      else
        args="$args \"$arg\""
      fi
      ;;
  esac
done

eval exec node.exe "\"$WIN_SCRIPT\"" $args
WRAPPER

  # Patch in the actual path
  NPM_GLOBAL_WSL=$(wslpath "$(npm prefix -g)" 2>/dev/null || npm prefix -g)
  NPM_GLOBAL_WSL="$NPM_GLOBAL_WSL/node_modules/mermaid-viewer/dist/cli.js"
  sed -i "s|__NPM_GLOBAL__|$NPM_GLOBAL_WSL|" "$HOME/.local/bin/merview"
  chmod +x "$HOME/.local/bin/merview"
  echo "  Installed WSL wrapper to ~/.local/bin/merview"
else
  echo "[4/6] Not WSL, skipping WSL wrapper"
fi

# 5. Install Claude Code slash command (global — works across all repos)
echo "[5/6] Installing Claude Code /merview command..."
COMMANDS_DIR="$HOME/.claude/commands"
mkdir -p "$COMMANDS_DIR"
cp claude-skill/mermaid-view.md "$COMMANDS_DIR/merview.md"
echo "  Installed to $COMMANDS_DIR/merview.md"

# 6. Verify Electron is available
echo "[6/6] Verifying Electron..."
if npx electron --version &>/dev/null 2>&1; then
  echo "  Electron $(npx electron --version) available"
else
  echo "  Note: Electron not found globally. Use --browser flag or run from repo dir."
fi

# Optionally install VS Code extension
if command -v code &>/dev/null; then
  echo ""
  read -p "Install VS Code extension? [y/N] " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    npx vsce package --allow-missing-repository
    code --install-extension mermaid-viewer-*.vsix
    echo "  VS Code extension installed!"
  fi
fi

echo ""
echo "Setup complete!"
echo ""
echo "  Usage:"
echo "    merview diagram.mermaid            # Electron window (default)"
echo "    merview diagram.mermaid --browser  # open in browser"
echo "    merview                            # standalone app"
echo "    /merview in Claude Code            # slash command (all repos)"
