import * as vscode from 'vscode';
import { generateMermaidHtml } from './viewer';

let currentPanel: vscode.WebviewPanel | undefined;
let currentDocUri: string | undefined;

export function activate(context: vscode.ExtensionContext) {
  const command = vscode.commands.registerCommand('mermaid-viewer.preview', () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('No active editor');
      return;
    }

    const doc = editor.document;
    const ext = doc.fileName.toLowerCase();
    if (!ext.endsWith('.mermaid') && !ext.endsWith('.mmd')) {
      vscode.window.showWarningMessage('Not a Mermaid file (.mermaid or .mmd)');
      return;
    }

    showPreview(doc);
  });

  const onSave = vscode.workspace.onDidSaveTextDocument(doc => {
    if (currentPanel && currentDocUri && doc.uri.toString() === currentDocUri) {
      currentPanel.webview.html = generateMermaidHtml(doc.getText(), {
        theme: 'auto',
        title: doc.fileName,
      });
    }
  });

  context.subscriptions.push(command, onSave);
}

function showPreview(doc: vscode.TextDocument) {
  if (currentPanel) {
    currentPanel.reveal(vscode.ViewColumn.Beside);
  } else {
    currentPanel = vscode.window.createWebviewPanel(
      'mermaidPreview',
      'Mermaid Preview',
      vscode.ViewColumn.Beside,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    currentPanel.onDidDispose(() => {
      currentPanel = undefined;
      currentDocUri = undefined;
    });
  }

  currentDocUri = doc.uri.toString();
  currentPanel.webview.html = generateMermaidHtml(doc.getText(), {
    theme: 'auto',
    title: doc.fileName,
  });
}

export function deactivate() {}
