import { Command } from 'commander';
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';
import { platform } from 'os';
import { exec, spawn } from 'child_process';
import { generateMermaidHtml, extractMermaidSource } from './viewer';
import { loadSmv, saveSmv } from './annotations/smv';
import { TextAnnotation } from './annotations/types';

function openInBrowser(filepath: string): void {
  const plat = platform();
  let cmd: string;
  if (plat === 'darwin') {
    cmd = `open "${filepath}"`;
  } else if (plat === 'win32') {
    cmd = `start "" "${filepath}"`;
  } else {
    try {
      const release = readFileSync('/proc/version', 'utf-8');
      if (release.toLowerCase().includes('microsoft')) {
        const winPath = filepath.replace(/^\/mnt\/([a-z])/, (_m, drive: string) => `${drive.toUpperCase()}:`).replace(/\//g, '\\');
        cmd = `cmd.exe /c start "" "${winPath}"`;
      } else {
        cmd = `xdg-open "${filepath}"`;
      }
    } catch {
      cmd = `xdg-open "${filepath}"`;
    }
  }
  exec(cmd);
}

function openInElectron(file: string | null, theme: string): void {
  let electronBin: string;
  try {
    electronBin = require('electron') as unknown as string;
  } catch {
    electronBin = join(__dirname, '..', 'node_modules', '.bin', 'electron');
  }

  const mainScript = join(__dirname, 'electron', 'main.js');
  const args = [mainScript];

  if (file) {
    args.push(resolve(file));
  }
  args.push('--theme', theme);

  const child = spawn(electronBin, args, {
    stdio: 'ignore',
    detached: true,
  });
  child.unref();
}

function genId(): string {
  return 'ann_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
}

const program = new Command();

program
  .name('merview')
  .description('Render and view Mermaid diagrams')
  .version('0.1.0')
  .argument('[file]', 'Path to .mermaid, .mmd, or .md file')
  .option('-t, --theme <theme>', 'Theme: dark, light, or auto', 'dark')
  .option('-b, --browser', 'Open in browser instead of Electron app')
  .action((file: string | undefined, opts: { theme: 'dark' | 'light' | 'auto'; browser?: boolean }) => {
    if (opts.browser) {
      if (!file) {
        console.error('Error: --browser requires a file argument');
        process.exit(1);
      }
      const raw = readFileSync(file, 'utf-8');
      const source = extractMermaidSource(raw, file);
      const html = generateMermaidHtml(source, {
        theme: opts.theme,
        title: file,
      });

      const tmpDir = mkdtempSync(join(tmpdir(), 'mermaid-view-'));
      const tmpFile = join(tmpDir, 'diagram.html');
      writeFileSync(tmpFile, html);

      openInBrowser(tmpFile);
      console.log(`Opened in browser: ${tmpFile}`);
    } else {
      openInElectron(file ?? null, opts.theme);
      if (file) {
        console.log(`Opening ${file} in Mermaid Viewer...`);
      } else {
        console.log('Launching Mermaid Viewer...');
      }
    }
  });

// annotate subcommand — lets agents add/list/remove text annotations programmatically
program
  .command('annotate <file>')
  .description('Add, list, or remove text annotations on a diagram (.smv sidecar)')
  .option('--text <markdown>', 'Markdown text to add as a text block')
  .option('--x <number>', 'X position in diagram coordinates', '50')
  .option('--y <number>', 'Y position in diagram coordinates', '50')
  .option('--color <hex>', 'Text color (hex)', '#f5c542')
  .option('--font-size <number>', 'Font size in px', '14')
  .option('--width <number>', 'Width of the text block in px', '240')
  .option('--list', 'List all current text annotations')
  .option('--json', 'Output --list as JSON (machine-readable)')
  .option('--delete <id>', 'Delete annotation by ID')
  .option('--clear', 'Remove all annotations')
  .action((file: string, opts: {
    text?: string;
    x: string;
    y: string;
    color: string;
    fontSize: string;
    width: string;
    list?: boolean;
    json?: boolean;
    delete?: string;
    clear?: boolean;
  }) => {
    const absPath = resolve(file);

    if (!existsSync(absPath)) {
      console.error(`Error: file not found: ${absPath}`);
      process.exit(1);
    }

    const smv = loadSmv(absPath);
    let annotations = smv ? smv.annotations : [];

    if (opts.list) {
      const textAnns = annotations.filter(a => a.type === 'text') as TextAnnotation[];
      if (opts.json) {
        console.log(JSON.stringify(textAnns, null, 2));
      } else if (textAnns.length === 0) {
        console.log('No text annotations.');
      } else {
        textAnns.forEach(t => {
          const preview = t.markdown.slice(0, 60).replace(/\n/g, '\\n') + (t.markdown.length > 60 ? '…' : '');
          console.log(`id: ${t.id}  pos: (${Math.round(t.x)}, ${Math.round(t.y)})  color: ${t.color}  fontSize: ${t.fontSize}  text: ${preview}`);
        });
      }
      return;
    }

    if (opts.clear) {
      saveSmv(absPath, []);
      console.log('All annotations cleared.');
      return;
    }

    if (opts.delete) {
      const before = annotations.length;
      annotations = annotations.filter(a => a.id !== opts.delete);
      if (annotations.length === before) {
        console.error(`Error: no annotation with id '${opts.delete}'`);
        process.exit(1);
      }
      saveSmv(absPath, annotations);
      console.log(`Deleted annotation ${opts.delete}`);
      return;
    }

    if (opts.text !== undefined) {
      const now = new Date().toISOString();
      const nextZIndex = annotations.reduce((max, a) => Math.max(max, a.zIndex), 0) + 1;
      const ann: TextAnnotation = {
        id: genId(),
        type: 'text',
        x: parseFloat(opts.x),
        y: parseFloat(opts.y),
        zIndex: nextZIndex,
        createdAt: now,
        updatedAt: now,
        markdown: opts.text,
        width: parseFloat(opts.width),
        height: 80,
        fontSize: parseFloat(opts.fontSize),
        color: opts.color,
      };
      annotations.push(ann);
      saveSmv(absPath, annotations);
      console.log(`Added text annotation ${ann.id} at (${ann.x}, ${ann.y})`);
      return;
    }

    // No action flag — print help
    program.commands.find(c => c.name() === 'annotate')?.help();
  });

program.parse();
