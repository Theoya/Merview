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
      style-src 'unsafe-inline';
      img-src data: blob:;">
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

    #panzoom-wrapper {
      position: relative;
    }

    .mode-btn.active {
      background: var(--btn-hover);
      outline: 2px solid var(--text-dim);
      outline-offset: -2px;
    }

    #stroke-color {
      width: 28px;
      height: 28px;
      border: 1px solid var(--toolbar-border);
      border-radius: 4px;
      cursor: pointer;
      padding: 0;
      background: none;
    }

    #stroke-width {
      height: 28px;
      border: 1px solid var(--toolbar-border);
      border-radius: 4px;
      background: var(--toolbar-bg);
      color: var(--text);
      cursor: pointer;
      font-size: 12px;
      padding: 0 4px;
    }

    .annotation-selected {
      outline: 2px solid #4a9eff !important;
      outline-offset: 2px;
    }

    .annotation-path {
      cursor: pointer;
    }

    .annotation-image {
      position: absolute;
      cursor: pointer;
      user-select: none;
    }

    .annotation-image img {
      display: block;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }

    .annotation-text {
      position: absolute;
      cursor: pointer;
      min-width: 60px;
      min-height: 30px;
      user-select: none;
    }

    .annotation-text .text-rendered {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.4;
      word-wrap: break-word;
    }

    .annotation-text .text-rendered p { margin: 0 0 0.5em 0; }
    .annotation-text .text-rendered p:last-child { margin-bottom: 0; }
    .annotation-text .text-rendered code {
      background: rgba(128,128,128,0.2);
      padding: 1px 4px;
      border-radius: 3px;
      font-size: 0.9em;
    }

    .annotation-text textarea {
      width: 100%;
      height: 100%;
      min-width: 200px;
      min-height: 80px;
      border: 2px solid #4a9eff;
      border-radius: 4px;
      background: var(--bg);
      color: var(--text);
      font-family: monospace;
      font-size: 14px;
      padding: 8px;
      resize: both;
      outline: none;
    }

    body.mode-draw #container { cursor: crosshair; }
    body.mode-text #container { cursor: text; }
    body.mode-select #container { cursor: grab; }
    body.mode-select #container:active { cursor: grabbing; }
  </style>
</head>
<body>
  <div id="toolbar">
    <button id="btn-zoom-in" title="Zoom in">+</button>
    <button id="btn-zoom-out" title="Zoom out">&minus;</button>
    <div class="separator"></div>
    <button id="btn-reset" title="Reset view">&#x21ba;</button>
    <button id="btn-fit" title="Fit to screen">&#x2922;</button>
    <div class="separator"></div>
    <button id="btn-select" class="mode-btn active" title="Select mode (V)">&#x25B3;</button>
    <button id="btn-draw" class="mode-btn" title="Draw mode (D)">&#x270E;</button>
    <button id="btn-text" class="mode-btn" title="Text mode (T)">T</button>
    <div class="separator"></div>
    <input type="color" id="stroke-color" value="#ff4444" title="Stroke color">
    <select id="stroke-width" title="Stroke width">
      <option value="2">2px</option>
      <option value="3" selected>3px</option>
      <option value="5">5px</option>
      <option value="8">8px</option>
    </select>
    <span id="zoom-level">100%</span>
  </div>
  <div id="container">
    <div id="panzoom-wrapper">
${mermaidDivs}
      <svg id="annotation-layer" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:visible;"></svg>
      <div id="image-layer" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;"></div>
      <div id="text-layer" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;"></div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
  <script src="https://unpkg.com/@panzoom/panzoom@4.6.1/dist/panzoom.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/marked@14/marked.min.js"></script>
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
        window.__pz = pz;

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
  <script>
(function() {
  // === State ===
  var currentMode = 'select';
  var annotations = [];
  var selectedId = null;
  var nextZIndex = 1;
  var saveTimer = null;

  // === DOM refs ===
  var wrapper = document.getElementById('panzoom-wrapper');
  var container = document.getElementById('container');
  var svgLayer = document.getElementById('annotation-layer');
  var imageLayer = document.getElementById('image-layer');
  var textLayer = document.getElementById('text-layer');
  var strokeColorInput = document.getElementById('stroke-color');
  var strokeWidthSelect = document.getElementById('stroke-width');

  // === Expose panzoom ref ===
  // The existing IIFE sets pz locally; we need to access it.
  // We'll patch it: search for the pz variable via the wrapper's __pz property.
  // The existing script needs a small bridge. We'll poll briefly.
  var pz = null;
  function getPz() {
    if (pz) return pz;
    pz = window.__pz || null;
    return pz;
  }

  // === Coordinate Transform ===
  function screenToDiagram(clientX, clientY) {
    var rect = wrapper.getBoundingClientRect();
    var p = getPz();
    var scale = p ? p.getScale() : 1;
    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale
    };
  }

  // === ID Generator ===
  function genId() {
    return 'ann_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
  }

  // === Mode Switching ===
  function setMode(mode) {
    currentMode = mode;
    document.body.className = 'mode-' + mode;

    document.querySelectorAll('.mode-btn').forEach(function(b) { b.classList.remove('active'); });
    var btnMap = { select: 'btn-select', draw: 'btn-draw', text: 'btn-text' };
    var btn = document.getElementById(btnMap[mode]);
    if (btn) btn.classList.add('active');

    var p = getPz();
    if (p) {
      if (mode === 'select') {
        p.setOptions({ disablePan: false });
        svgLayer.style.pointerEvents = 'none';
        imageLayer.style.pointerEvents = 'none';
        textLayer.style.pointerEvents = 'none';
        // Enable pointer events on individual annotations
        svgLayer.querySelectorAll('.annotation-path').forEach(function(el) { el.style.pointerEvents = 'stroke'; });
        imageLayer.querySelectorAll('.annotation-image').forEach(function(el) { el.style.pointerEvents = 'auto'; });
        textLayer.querySelectorAll('.annotation-text').forEach(function(el) { el.style.pointerEvents = 'auto'; });
      } else {
        p.setOptions({ disablePan: true });
        if (mode === 'draw') {
          svgLayer.style.pointerEvents = 'all';
          imageLayer.style.pointerEvents = 'none';
          textLayer.style.pointerEvents = 'none';
        } else if (mode === 'text') {
          svgLayer.style.pointerEvents = 'none';
          imageLayer.style.pointerEvents = 'none';
          textLayer.style.pointerEvents = 'all';
        }
      }
    }
    deselectAll();
  }

  // === Selection ===
  function selectAnnotation(id) {
    deselectAll();
    selectedId = id;
    var el = document.querySelector('[data-ann-id="' + id + '"]');
    if (el) el.classList.add('annotation-selected');
  }

  function deselectAll() {
    selectedId = null;
    document.querySelectorAll('.annotation-selected').forEach(function(el) {
      el.classList.remove('annotation-selected');
    });
  }

  // === Persistence ===
  function notifyChange() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function() {
      if (window.mermaidViewer && window.mermaidViewer.saveAnnotations) {
        window.mermaidViewer.saveAnnotations(annotations);
      }
    }, 500);
  }

  function findAnnotation(id) {
    for (var i = 0; i < annotations.length; i++) {
      if (annotations[i].id === id) return annotations[i];
    }
    return null;
  }

  function removeAnnotation(id) {
    annotations = annotations.filter(function(a) { return a.id !== id; });
    var el = document.querySelector('[data-ann-id="' + id + '"]');
    if (el) el.remove();
    if (selectedId === id) selectedId = null;
    notifyChange();
  }

  // === Ramer-Douglas-Peucker simplification ===
  function rdpSimplify(points, epsilon) {
    if (points.length <= 2) return points;
    var dmax = 0, index = 0;
    var end = points.length - 1;
    for (var i = 1; i < end; i++) {
      var d = perpendicularDist(points[i], points[0], points[end]);
      if (d > dmax) { dmax = d; index = i; }
    }
    if (dmax > epsilon) {
      var left = rdpSimplify(points.slice(0, index + 1), epsilon);
      var right = rdpSimplify(points.slice(index), epsilon);
      return left.slice(0, -1).concat(right);
    }
    return [points[0], points[end]];
  }

  function perpendicularDist(point, lineStart, lineEnd) {
    var dx = lineEnd[0] - lineStart[0];
    var dy = lineEnd[1] - lineStart[1];
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return Math.sqrt(Math.pow(point[0] - lineStart[0], 2) + Math.pow(point[1] - lineStart[1], 2));
    return Math.abs(dy * point[0] - dx * point[1] + lineEnd[0] * lineStart[1] - lineEnd[1] * lineStart[0]) / len;
  }

  function pointsToPathData(points) {
    if (points.length === 0) return '';
    var d = 'M ' + points[0][0].toFixed(1) + ' ' + points[0][1].toFixed(1);
    for (var i = 1; i < points.length; i++) {
      d += ' L ' + points[i][0].toFixed(1) + ' ' + points[i][1].toFixed(1);
    }
    return d;
  }

  // === Freehand Drawing ===
  var isDrawing = false;
  var drawPoints = [];
  var activePath = null;

  svgLayer.addEventListener('mousedown', function(e) {
    if (currentMode !== 'draw') return;
    e.stopPropagation();
    isDrawing = true;
    drawPoints = [];
    var pt = screenToDiagram(e.clientX, e.clientY);
    drawPoints.push([pt.x, pt.y]);

    activePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    activePath.setAttribute('fill', 'none');
    activePath.setAttribute('stroke', strokeColorInput.value);
    activePath.setAttribute('stroke-width', strokeWidthSelect.value);
    activePath.setAttribute('stroke-linecap', 'round');
    activePath.setAttribute('stroke-linejoin', 'round');
    activePath.setAttribute('d', 'M ' + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1));
    svgLayer.appendChild(activePath);
  });

  document.addEventListener('mousemove', function(e) {
    if (!isDrawing || !activePath) return;
    var pt = screenToDiagram(e.clientX, e.clientY);
    drawPoints.push([pt.x, pt.y]);
    activePath.setAttribute('d', pointsToPathData(drawPoints));
  });

  document.addEventListener('mouseup', function(e) {
    if (!isDrawing || !activePath) return;
    isDrawing = false;

    // Simplify path
    var simplified = rdpSimplify(drawPoints, 1.5);
    var pathData = pointsToPathData(simplified);

    if (simplified.length < 2) {
      activePath.remove();
      activePath = null;
      drawPoints = [];
      return;
    }

    var ann = {
      id: genId(),
      type: 'freehand',
      x: 0, y: 0,
      zIndex: nextZIndex++,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pathData: pathData,
      strokeColor: strokeColorInput.value,
      strokeWidth: parseInt(strokeWidthSelect.value),
      opacity: 1
    };

    activePath.setAttribute('d', pathData);
    activePath.setAttribute('data-ann-id', ann.id);
    activePath.classList.add('annotation-path');
    activePath.style.pointerEvents = currentMode === 'select' ? 'stroke' : 'none';

    // Click to select in select mode
    activePath.addEventListener('mousedown', function(ev) {
      if (currentMode !== 'select') return;
      ev.stopPropagation();
      selectAnnotation(ann.id);
      startDragPath(ev, ann);
    });

    annotations.push(ann);
    notifyChange();
    activePath = null;
    drawPoints = [];
  });

  // === Drag paths (select mode) ===
  function startDragPath(e, ann) {
    var startX = e.clientX, startY = e.clientY;
    var el = document.querySelector('[data-ann-id="' + ann.id + '"]');
    var origD = ann.pathData;

    function onMove(ev) {
      ev.stopPropagation();
      var p = getPz();
      var scale = p ? p.getScale() : 1;
      var dx = (ev.clientX - startX) / scale;
      var dy = (ev.clientY - startY) / scale;
      // Translate all path coordinates
      var translated = origD.replace(/(-?\\d+\\.?\\d*)\\s+(-?\\d+\\.?\\d*)/g, function(m, x, y) {
        return (parseFloat(x) + dx).toFixed(1) + ' ' + (parseFloat(y) + dy).toFixed(1);
      });
      el.setAttribute('d', translated);
    }

    function onUp(ev) {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      var p = getPz();
      var scale = p ? p.getScale() : 1;
      var dx = (ev.clientX - startX) / scale;
      var dy = (ev.clientY - startY) / scale;
      // Update annotation pathData permanently
      ann.pathData = ann.pathData.replace(/(-?\\d+\\.?\\d*)\\s+(-?\\d+\\.?\\d*)/g, function(m, x, y) {
        return (parseFloat(x) + dx).toFixed(1) + ' ' + (parseFloat(y) + dy).toFixed(1);
      });
      ann.updatedAt = new Date().toISOString();
      notifyChange();
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // === Image Placement ===
  window.addEventListener('annotation-image-drop', function(e) {
    var detail = e.detail;
    var dropPt = screenToDiagram(window.innerWidth / 2, window.innerHeight / 2);

    var img = new Image();
    img.onload = function() {
      var w = Math.min(img.naturalWidth, 400);
      var h = (img.naturalHeight / img.naturalWidth) * w;

      var ann = {
        id: genId(),
        type: 'image',
        x: dropPt.x,
        y: dropPt.y,
        zIndex: nextZIndex++,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        dataUri: detail.dataUri,
        width: w,
        height: h
      };

      annotations.push(ann);
      renderImageAnnotation(ann);
      notifyChange();
    };
    img.src = detail.dataUri;
  });

  function renderImageAnnotation(ann) {
    var div = document.createElement('div');
    div.className = 'annotation-image';
    div.setAttribute('data-ann-id', ann.id);
    div.style.left = ann.x + 'px';
    div.style.top = ann.y + 'px';
    div.style.width = ann.width + 'px';
    div.style.height = ann.height + 'px';
    div.style.zIndex = ann.zIndex;
    div.style.pointerEvents = currentMode === 'select' ? 'auto' : 'none';

    var img = document.createElement('img');
    img.src = ann.dataUri;
    div.appendChild(img);

    div.addEventListener('mousedown', function(ev) {
      if (currentMode !== 'select') return;
      ev.stopPropagation();
      selectAnnotation(ann.id);
      startDragDiv(ev, ann, div);
    });

    imageLayer.appendChild(div);
  }

  // === Text Blocks ===
  container.addEventListener('click', function(e) {
    if (currentMode !== 'text') return;
    // Don't create text if clicking on existing text annotation
    if (e.target.closest('.annotation-text')) return;

    var pt = screenToDiagram(e.clientX, e.clientY);

    var ann = {
      id: genId(),
      type: 'text',
      x: pt.x,
      y: pt.y,
      zIndex: nextZIndex++,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      markdown: '',
      width: 200,
      height: 80,
      fontSize: 14,
      color: strokeColorInput.value
    };

    annotations.push(ann);
    renderTextAnnotation(ann, true);
    notifyChange();
  });

  function renderTextAnnotation(ann, editImmediately) {
    var div = document.createElement('div');
    div.className = 'annotation-text';
    div.setAttribute('data-ann-id', ann.id);
    div.style.left = ann.x + 'px';
    div.style.top = ann.y + 'px';
    div.style.zIndex = ann.zIndex;
    div.style.pointerEvents = currentMode === 'select' ? 'auto' : (currentMode === 'text' ? 'auto' : 'none');

    div.addEventListener('mousedown', function(ev) {
      if (currentMode !== 'select') return;
      ev.stopPropagation();
      selectAnnotation(ann.id);
      startDragDiv(ev, ann, div);
    });

    div.addEventListener('dblclick', function(ev) {
      ev.stopPropagation();
      enterEditMode(ann, div);
    });

    textLayer.appendChild(div);

    if (editImmediately) {
      enterEditMode(ann, div);
    } else {
      renderMarkdownContent(ann, div);
    }
  }

  function enterEditMode(ann, div) {
    div.innerHTML = '';
    var ta = document.createElement('textarea');
    ta.value = ann.markdown;
    ta.style.fontSize = ann.fontSize + 'px';
    ta.style.color = ann.color;
    div.appendChild(ta);
    ta.focus();

    ta.addEventListener('blur', function() {
      ann.markdown = ta.value;
      ann.updatedAt = new Date().toISOString();
      // Get the actual textarea size
      ann.width = ta.offsetWidth;
      ann.height = ta.offsetHeight;
      renderMarkdownContent(ann, div);
      notifyChange();
    });

    ta.addEventListener('mousedown', function(ev) {
      ev.stopPropagation();
    });

    ta.addEventListener('keydown', function(ev) {
      ev.stopPropagation();
    });
  }

  function renderMarkdownContent(ann, div) {
    div.innerHTML = '';
    if (!ann.markdown.trim()) {
      div.innerHTML = '<div class="text-rendered" style="color: var(--text-dim); font-style: italic; padding: 4px;">Double-click to edit</div>';
      return;
    }
    var rendered = document.createElement('div');
    rendered.className = 'text-rendered';
    rendered.style.fontSize = ann.fontSize + 'px';
    rendered.style.color = ann.color;
    rendered.style.maxWidth = ann.width + 'px';
    if (typeof marked !== 'undefined') {
      rendered.innerHTML = marked.parse(ann.markdown);
    } else {
      rendered.textContent = ann.markdown;
    }
    div.appendChild(rendered);
  }

  // === Drag divs (images & text in select mode) ===
  function startDragDiv(e, ann, div) {
    var startX = e.clientX, startY = e.clientY;
    var origLeft = ann.x, origTop = ann.y;
    var moved = false;

    function onMove(ev) {
      ev.stopPropagation();
      ev.preventDefault();
      moved = true;
      var p = getPz();
      var scale = p ? p.getScale() : 1;
      var dx = (ev.clientX - startX) / scale;
      var dy = (ev.clientY - startY) / scale;
      div.style.left = (origLeft + dx) + 'px';
      div.style.top = (origTop + dy) + 'px';
    }

    function onUp(ev) {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (moved) {
        var p = getPz();
        var scale = p ? p.getScale() : 1;
        var dx = (ev.clientX - startX) / scale;
        var dy = (ev.clientY - startY) / scale;
        ann.x = origLeft + dx;
        ann.y = origTop + dy;
        ann.updatedAt = new Date().toISOString();
        notifyChange();
      }
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // === Delete ===
  function deleteSelected() {
    if (selectedId) removeAnnotation(selectedId);
  }

  function clearAll() {
    annotations = [];
    selectedId = null;
    svgLayer.innerHTML = '';
    imageLayer.innerHTML = '';
    textLayer.innerHTML = '';
    notifyChange();
  }

  // === Keyboard Shortcuts ===
  document.addEventListener('keydown', function(e) {
    // Don't capture shortcuts when editing text
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;

    switch(e.key) {
      case 'v': case 'V': setMode('select'); break;
      case 'd': case 'D': setMode('draw'); break;
      case 't': case 'T': setMode('text'); break;
      case 'Delete': case 'Backspace': deleteSelected(); break;
      case 'Escape': deselectAll(); break;
    }
  });

  // === Toolbar Buttons ===
  document.getElementById('btn-select').addEventListener('click', function() { setMode('select'); });
  document.getElementById('btn-draw').addEventListener('click', function() { setMode('draw'); });
  document.getElementById('btn-text').addEventListener('click', function() { setMode('text'); });

  // === Load Annotations from Main Process ===
  function loadAnnotationsFromData(data) {
    // Clear existing
    svgLayer.innerHTML = '';
    imageLayer.innerHTML = '';
    textLayer.innerHTML = '';
    annotations = data || [];
    selectedId = null;

    // Find max zIndex
    annotations.forEach(function(ann) {
      if (ann.zIndex >= nextZIndex) nextZIndex = ann.zIndex + 1;
    });

    // Render all
    annotations.forEach(function(ann) {
      if (ann.type === 'freehand') {
        var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', ann.pathData);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', ann.strokeColor);
        path.setAttribute('stroke-width', ann.strokeWidth);
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        path.setAttribute('opacity', ann.opacity);
        path.setAttribute('data-ann-id', ann.id);
        path.classList.add('annotation-path');
        path.style.pointerEvents = currentMode === 'select' ? 'stroke' : 'none';

        path.addEventListener('mousedown', function(ev) {
          if (currentMode !== 'select') return;
          ev.stopPropagation();
          selectAnnotation(ann.id);
          startDragPath(ev, ann);
        });

        svgLayer.appendChild(path);
      } else if (ann.type === 'image') {
        renderImageAnnotation(ann);
      } else if (ann.type === 'text') {
        renderTextAnnotation(ann, false);
      }
    });
  }

  // === IPC Listeners ===
  if (window.mermaidViewer) {
    window.mermaidViewer.onLoadAnnotations(function(data) {
      loadAnnotationsFromData(data);
    });

    window.mermaidViewer.onSetMode(function(mode) {
      setMode(mode);
    });

    window.mermaidViewer.onDeleteSelected(function() {
      deleteSelected();
    });

    window.mermaidViewer.onClearAnnotations(function() {
      clearAll();
    });

    // Notify main process we're ready
    window.mermaidViewer.notifyReady();
  }

  // Set initial mode
  setMode('select');
})();
  </script>
</body>
</html>`;
}
