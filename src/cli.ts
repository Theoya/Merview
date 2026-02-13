import { Command } from 'commander';
import { readFileSync, writeFileSync, mkdtempSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';
import { platform } from 'os';
import { exec, spawn } from 'child_process';
import { generateMermaidHtml, extractMermaidSource } from './viewer';

function openInBrowser(filepath: string): void {
  const plat = platform();
  let cmd: string;
  if (plat === 'darwin') {
    cmd = `open "${filepath}"`;
  } else if (plat === 'win32') {
    cmd = `start "" "${filepath}"`;
  } else {
    // Linux — check for WSL
    try {
      const release = readFileSync('/proc/version', 'utf-8');
      if (release.toLowerCase().includes('microsoft')) {
        // WSL: use cmd.exe to open in Windows browser
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
    // Fallback: look for electron in node_modules
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

program.parse();
