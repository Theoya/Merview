export interface ViewerOptions {
  theme?: 'dark' | 'light' | 'auto';
  title?: string;
}

/**
 * Extract mermaid diagram source(s) from a file's contents.
 * For .md files, pulls out ```mermaid code blocks.
 * For anything else, returns the source as a single-element array.
 */
export function extractMermaidSource(source: string, filePath: string): string[] {
  const ext = filePath.toLowerCase().replace(/.*\./, '.');
  if (ext === '.md' || ext === '.markdown') {
    const blocks: string[] = [];
    const regex = /```mermaid\s*\n([\s\S]*?)```/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(source)) !== null) {
      blocks.push(match[1].trim());
    }
    if (blocks.length === 0) {
      throw new Error(`No \`\`\`mermaid code blocks found in ${filePath}`);
    }
    return blocks;
  }
  return [source];
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function generateMermaidHtml(source: string | string[], options: ViewerOptions = {}): string {
  const theme = options.theme ?? 'dark';
  const title = options.title ?? 'Mermaid Diagram';
  const sources = Array.isArray(source) ? source : [source];
  const mermaidDivs = sources.map(s => `      <div class="mermaid">${escapeHtml(s)}</div>`).join('\n');

  const mermaidTheme = theme === 'light' ? 'default' : theme === 'auto' ? 'default' : 'dark';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
      script-src https://cdn.jsdelivr.net https://unpkg.com 'unsafe-inline';
      style-src 'unsafe-inline';">
  <title>${escapeHtml(title)}</title>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --bg: #1e1e2e;
      --toolbar-bg: #181825;
      --toolbar-border: #313244;
      --btn-hover: #313244;
      --text: #cdd6f4;
      --text-dim: #6c7086;
    }

    ${theme === 'light' ? `
    :root {
      --bg: #ffffff;
      --toolbar-bg: #f5f5f5;
      --toolbar-border: #e0e0e0;
      --btn-hover: #e0e0e0;
      --text: #333333;
      --text-dim: #999999;
    }` : theme === 'auto' ? `
    @media (prefers-color-scheme: light) {
      :root {
        --bg: rgba(255, 255, 255, 0.85);
        --toolbar-bg: rgba(245, 245, 245, 0.9);
        --toolbar-border: #e0e0e0;
        --btn-hover: #e0e0e0;
        --text: #333333;
        --text-dim: #999999;
      }
    }` : ''}

    html, body {
      height: 100%;
      overflow: hidden;
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    #toolbar {
      display: flex;
      align-items: center;
      gap: 4px;
      height: 40px;
      padding: 0 12px;
      background: var(--toolbar-bg);
      border-bottom: 1px solid var(--toolbar-border);
      user-select: none;
    }

    #toolbar button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 28px;
      border: none;
      border-radius: 4px;
      background: transparent;
      color: var(--text);
      font-size: 16px;
      cursor: pointer;
      transition: background 0.15s;
    }

    #toolbar button:hover {
      background: var(--btn-hover);
    }

    #toolbar .separator {
      width: 1px;
      height: 20px;
      background: var(--toolbar-border);
      margin: 0 6px;
    }

    #zoom-level {
      margin-left: auto;
      font-size: 12px;
      color: var(--text-dim);
      font-variant-numeric: tabular-nums;
    }

    #container {
      width: 100%;
      height: calc(100% - 40px);
      overflow: hidden;
      cursor: grab;
    }

    #container:active {
      cursor: grabbing;
    }

    #panzoom-wrapper {
      display: inline-block;
      transform-origin: 0 0;
    }

    #panzoom-wrapper .mermaid {
      user-select: none;
      padding: 40px;
    }

    #panzoom-wrapper .mermaid svg {
      display: block;
    }
  </style>
</head>
<body>
  <div id="toolbar">
    <button id="btn-zoom-in" title="Zoom in">+</button>
    <button id="btn-zoom-out" title="Zoom out">&minus;</button>
    <div class="separator"></div>
    <button id="btn-reset" title="Reset view">&#x21ba;</button>
    <button id="btn-fit" title="Fit to screen">&#x2922;</button>
    <span id="zoom-level">100%</span>
  </div>
  <div id="container">
    <div id="panzoom-wrapper">
${mermaidDivs}
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
  <script src="https://unpkg.com/@panzoom/panzoom@4.6.1/dist/panzoom.min.js"></script>
  <script>
    (function() {
      // Initialize mermaid
      mermaid.initialize({
        startOnLoad: false,
        theme: '${mermaidTheme}',
        securityLevel: 'loose',
        flowchart: { useMaxWidth: false },
        sequence: { useMaxWidth: false },
        gantt: { useMaxWidth: false },
        journey: { useMaxWidth: false },
        class: { useMaxWidth: false },
        state: { useMaxWidth: false },
        er: { useMaxWidth: false },
        pie: { useMaxWidth: false },
      });

      var container = document.getElementById('container');
      var wrapper = document.getElementById('panzoom-wrapper');
      var zoomLabel = document.getElementById('zoom-level');
      var pz = null;

      function updateZoomLabel() {
        if (!pz) return;
        var scale = pz.getScale();
        zoomLabel.textContent = Math.round(scale * 100) + '%';
      }

      function fitToScreen() {
        if (!pz) return;
        var svg = wrapper.querySelector('svg');
        if (!svg) return;

        // Reset first to get natural dimensions
        pz.reset({ animate: false });

        // Wait a frame for layout to settle
        requestAnimationFrame(function() {
          var svgRect = svg.getBoundingClientRect();
          var containerRect = container.getBoundingClientRect();

          var scaleX = containerRect.width / svgRect.width;
          var scaleY = containerRect.height / svgRect.height;
          var scale = Math.min(scaleX, scaleY) * 0.9;

          // Clamp to reasonable range
          scale = Math.max(0.1, Math.min(scale, 5));

          pz.zoom(scale, { animate: false });

          // Recalculate after zoom to center
          requestAnimationFrame(function() {
            var svgRect2 = svg.getBoundingClientRect();
            var containerRect2 = container.getBoundingClientRect();
            var panX = (containerRect2.width - svgRect2.width) / 2;
            var panY = (containerRect2.height - svgRect2.height) / 2;
            pz.pan(panX, panY, { animate: false });
            updateZoomLabel();
          });
        });
      }

      // Render mermaid, then init panzoom
      mermaid.run().then(function() {
        pz = Panzoom(wrapper, {
          maxScale: 20,
          minScale: 0.05,
          contain: false,
          canvas: true,
        });

        // Mouse wheel zoom
        container.addEventListener('wheel', function(e) {
          pz.zoomWithWheel(e);
          updateZoomLabel();
        });

        // Update label on pan/zoom
        wrapper.addEventListener('panzoomchange', updateZoomLabel);

        // Toolbar buttons
        document.getElementById('btn-zoom-in').addEventListener('click', function() {
          pz.zoomIn();
          updateZoomLabel();
        });

        document.getElementById('btn-zoom-out').addEventListener('click', function() {
          pz.zoomOut();
          updateZoomLabel();
        });

        document.getElementById('btn-reset').addEventListener('click', function() {
          pz.reset();
          setTimeout(updateZoomLabel, 300);
        });

        document.getElementById('btn-fit').addEventListener('click', function() {
          fitToScreen();
        });

        // Fit to screen on initial load
        fitToScreen();
      });
    })();
  </script>
</body>
</html>`;
}
