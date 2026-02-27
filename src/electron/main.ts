import { app, BrowserWindow, Menu, dialog, ipcMain, MenuItemConstructorOptions } from 'electron';
import { readFileSync, writeFileSync, mkdtempSync, watch, FSWatcher, existsSync } from 'fs';
import { join, basename, resolve } from 'path';
import { tmpdir } from 'os';
import { generateMermaidHtml, extractMermaidSource } from '../viewer';
import { loadSmv, saveSmv, getSmvPath } from '../annotations/smv';
import { Annotation } from '../annotations/types';

let mainWindow: BrowserWindow | null = null;
let currentFilePath: string | null = null;
let currentTheme: 'dark' | 'light' | 'auto' = 'dark';
let fileWatcher: FSWatcher | null = null;
let tmpHtmlPath: string | null = null;
let currentAnnotations: Annotation[] = [];
let smvWatcher: FSWatcher | null = null;
let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function parseArgs(): { file: string | null; theme: 'dark' | 'light' | 'auto' } {
  const args = process.argv.slice(process.argv.findIndex(a => a.endsWith('main.js')) + 1);
  let file: string | null = null;
  let theme: 'dark' | 'light' | 'auto' = 'dark';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--theme' && args[i + 1]) {
      theme = args[i + 1] as 'dark' | 'light' | 'auto';
      i++;
    } else if (!args[i].startsWith('--')) {
      file = args[i];
    }
  }

  return { file, theme };
}

function getTmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'mermaid-view-'));
}

function writeTmpHtml(html: string): string {
  if (!tmpHtmlPath) {
    tmpHtmlPath = join(getTmpDir(), 'diagram.html');
  }
  writeFileSync(tmpHtmlPath, html);
  return tmpHtmlPath;
}

function loadFile(filePath: string): void {
  const absPath = resolve(filePath);
  currentFilePath = absPath;

  const raw = readFileSync(absPath, 'utf-8');
  const source = extractMermaidSource(raw, absPath);
  const html = generateMermaidHtml(source, {
    theme: currentTheme,
    title: basename(absPath),
  });

  const htmlPath = writeTmpHtml(html);

  if (mainWindow) {
    mainWindow.loadFile(htmlPath);
    mainWindow.setTitle(`${basename(absPath)} — ${absPath}`);
  }

  startWatching(absPath);

  const smv = loadSmv(absPath);
  currentAnnotations = smv ? smv.annotations : [];
  startSmvWatching(absPath);
}

function startWatching(filePath: string): void {
  stopWatching();

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  fileWatcher = watch(filePath, () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      try {
        const raw = readFileSync(filePath, 'utf-8');
        const source = extractMermaidSource(raw, filePath);
        const html = generateMermaidHtml(source, {
          theme: currentTheme,
          title: basename(filePath),
        });
        writeTmpHtml(html);
        if (mainWindow) {
          mainWindow.webContents.send('file-changed');
          mainWindow.loadFile(tmpHtmlPath!);
        }
      } catch {
        // File might be mid-write, ignore
      }
    }, 200);
  });
}

function stopWatching(): void {
  if (fileWatcher) {
    fileWatcher.close();
    fileWatcher = null;
  }
  stopSmvWatching();
}

function startSmvWatching(filePath: string): void {
  stopSmvWatching();
  const smvPath = getSmvPath(filePath);
  if (!existsSync(smvPath)) return;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  smvWatcher = watch(smvPath, () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      try {
        const smv = loadSmv(filePath);
        if (smv) {
          currentAnnotations = smv.annotations;
          if (mainWindow) {
            mainWindow.webContents.send('load-annotations', currentAnnotations);
          }
        }
      } catch { /* ignore mid-write */ }
    }, 200);
  });
}

function stopSmvWatching(): void {
  if (smvWatcher) { smvWatcher.close(); smvWatcher = null; }
}

function loadWelcomePage(): void {
  // Lazy import to keep welcome.ts in its own module
  const { generateWelcomeHtml } = require('./welcome');
  const html = generateWelcomeHtml(currentTheme);
  const htmlPath = writeTmpHtml(html);
  if (mainWindow) {
    mainWindow.loadFile(htmlPath);
    mainWindow.setTitle('Mermaid Viewer');
  }
}

async function openFileDialog(): Promise<void> {
  const result = await dialog.showOpenDialog(mainWindow!, {
    filters: [
      { name: 'Mermaid Diagrams', extensions: ['mermaid', 'mmd'] },
      { name: 'Markdown Files', extensions: ['md', 'markdown'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    loadFile(result.filePaths[0]);
  }
}

function setTheme(theme: 'dark' | 'light' | 'auto'): void {
  currentTheme = theme;
  if (currentFilePath) {
    loadFile(currentFilePath);
  } else {
    loadWelcomePage();
  }
  buildMenu();
}

function buildMenu(): void {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open...',
          accelerator: 'CmdOrCtrl+O',
          click: () => openFileDialog(),
        },
        { type: 'separator' },
        { role: 'close' },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+=',
          click: () => mainWindow?.webContents.send('zoom-in'),
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => mainWindow?.webContents.send('zoom-out'),
        },
        {
          label: 'Reset Zoom',
          accelerator: 'CmdOrCtrl+0',
          click: () => mainWindow?.webContents.send('zoom-reset'),
        },
        {
          label: 'Fit to Window',
          accelerator: 'CmdOrCtrl+1',
          click: () => mainWindow?.webContents.send('zoom-fit'),
        },
        { type: 'separator' },
        {
          label: 'Theme',
          submenu: [
            {
              label: 'Dark',
              type: 'radio',
              checked: currentTheme === 'dark',
              click: () => setTheme('dark'),
            },
            {
              label: 'Light',
              type: 'radio',
              checked: currentTheme === 'light',
              click: () => setTheme('light'),
            },
            {
              label: 'Auto',
              type: 'radio',
              checked: currentTheme === 'auto',
              click: () => setTheme('auto'),
            },
          ],
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
      ],
    },
    {
      label: 'Annotate',
      submenu: [
        { label: 'Select Mode', accelerator: 'V', click: () => mainWindow?.webContents.send('set-mode', 'select') },
        { label: 'Draw Mode', accelerator: 'D', click: () => mainWindow?.webContents.send('set-mode', 'draw') },
        { label: 'Text Mode', accelerator: 'T', click: () => mainWindow?.webContents.send('set-mode', 'text') },
        { type: 'separator' },
        { label: 'Delete Selected', accelerator: 'Delete', click: () => mainWindow?.webContents.send('delete-selected') },
        { label: 'Clear All Annotations', click: () => mainWindow?.webContents.send('clear-annotations') },
      ],
    },
  ];

  // macOS app menu
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    });
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Mermaid Viewer',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    stopWatching();
  });

  buildMenu();

  const { file, theme } = parseArgs();
  currentTheme = theme;

  if (file) {
    loadFile(file);
  } else {
    loadWelcomePage();
  }
}

// IPC handlers
ipcMain.handle('open-file-dialog', async () => {
  await openFileDialog();
});

ipcMain.on('file-dropped', (_event, filePath: string) => {
  loadFile(filePath);
});

ipcMain.handle('get-annotations', () => currentAnnotations);

ipcMain.handle('save-annotations', (_event, annotations: Annotation[]) => {
  currentAnnotations = annotations;
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(() => {
    if (currentFilePath) {
      stopSmvWatching();
      saveSmv(currentFilePath, annotations);
      startSmvWatching(currentFilePath);
    }
  }, 500);
});

ipcMain.on('renderer-ready', () => {
  if (mainWindow) {
    mainWindow.webContents.send('load-annotations', currentAnnotations);
  }
});

ipcMain.handle('read-image-as-datauri', async (_event, filePath: string) => {
  const ext = filePath.toLowerCase().replace(/.*\./, '');
  const mimeMap: Record<string, string> = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp',
  };
  const mime = mimeMap[ext] || 'application/octet-stream';
  const data = readFileSync(filePath);
  return `data:${mime};base64,${data.toString('base64')}`;
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  stopWatching();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
