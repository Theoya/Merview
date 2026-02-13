export function generateWelcomeHtml(theme: 'dark' | 'light' | 'auto' = 'dark'): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mermaid Viewer</title>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --bg: #1e1e2e;
      --surface: #181825;
      --border: #313244;
      --text: #cdd6f4;
      --text-dim: #6c7086;
      --accent: #89b4fa;
      --accent-hover: #74c7ec;
      --drop-bg: rgba(137, 180, 250, 0.05);
      --drop-border: rgba(137, 180, 250, 0.3);
    }

    ${theme === 'light' ? `
    :root {
      --bg: #ffffff;
      --surface: #f5f5f5;
      --border: #e0e0e0;
      --text: #333333;
      --text-dim: #999999;
      --accent: #2563eb;
      --accent-hover: #1d4ed8;
      --drop-bg: rgba(37, 99, 235, 0.05);
      --drop-border: rgba(37, 99, 235, 0.3);
    }` : theme === 'auto' ? `
    @media (prefers-color-scheme: light) {
      :root {
        --bg: rgba(255, 255, 255, 0.85);
        --surface: rgba(245, 245, 245, 0.9);
        --border: #e0e0e0;
        --text: #333333;
        --text-dim: #999999;
        --accent: #2563eb;
        --accent-hover: #1d4ed8;
        --drop-bg: rgba(37, 99, 235, 0.05);
        --drop-border: rgba(37, 99, 235, 0.3);
      }
    }` : ''}

    html, body {
      height: 100%;
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .welcome {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 24px;
      padding: 40px;
    }

    .logo {
      font-size: 48px;
      opacity: 0.8;
    }

    h1 {
      font-size: 28px;
      font-weight: 600;
      letter-spacing: -0.5px;
    }

    .subtitle {
      color: var(--text-dim);
      font-size: 15px;
      margin-top: -12px;
    }

    .drop-zone {
      width: 100%;
      max-width: 400px;
      padding: 48px 32px;
      border: 2px dashed var(--border);
      border-radius: 12px;
      text-align: center;
      transition: all 0.2s;
      cursor: pointer;
    }

    .drop-zone:hover, .drop-zone.dragover {
      border-color: var(--accent);
      background: var(--drop-bg);
    }

    .drop-zone p {
      color: var(--text-dim);
      font-size: 14px;
      margin-top: 8px;
    }

    .open-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 24px;
      border: none;
      border-radius: 8px;
      background: var(--accent);
      color: #fff;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s;
    }

    .open-btn:hover {
      background: var(--accent-hover);
    }

    .hint {
      color: var(--text-dim);
      font-size: 12px;
    }

    kbd {
      display: inline-block;
      padding: 2px 6px;
      border: 1px solid var(--border);
      border-radius: 4px;
      background: var(--surface);
      font-family: inherit;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="welcome">
    <div class="logo">\u{1f9dc}</div>
    <h1>Mermaid Viewer</h1>
    <p class="subtitle">Preview Mermaid diagrams with pan and zoom</p>

    <div class="drop-zone" id="drop-zone">
      <button class="open-btn" id="open-btn">Open File</button>
      <p>or drop a .mermaid / .mmd file here</p>
    </div>

    <p class="hint"><kbd>Ctrl+O</kbd> to open a file</p>
  </div>

  <script>
    (function() {
      var dropZone = document.getElementById('drop-zone');
      var openBtn = document.getElementById('open-btn');

      openBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (window.mermaidViewer) {
          window.mermaidViewer.openFile();
        }
      });

      dropZone.addEventListener('click', function() {
        if (window.mermaidViewer) {
          window.mermaidViewer.openFile();
        }
      });

      // Set up drag-and-drop via preload bridge
      if (window.mermaidViewer) {
        window.mermaidViewer.onFileDropped(function() {
          // File loaded by main process
        });
      }

      dropZone.addEventListener('dragenter', function() {
        dropZone.classList.add('dragover');
      });
      dropZone.addEventListener('dragleave', function() {
        dropZone.classList.remove('dragover');
      });
      dropZone.addEventListener('drop', function() {
        dropZone.classList.remove('dragover');
      });
    })();
  </script>
</body>
</html>`;
}
