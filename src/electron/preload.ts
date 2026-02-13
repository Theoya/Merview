import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('mermaidViewer', {
  openFile: () => ipcRenderer.invoke('open-file-dialog'),
  onFileDropped: (callback: (filePath: string) => void) => {
    document.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const filePath = (files[0] as any).path;
        if (filePath) {
          ipcRenderer.send('file-dropped', filePath);
          callback(filePath);
        }
      }
    });
    document.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  },
  onFileChanged: (callback: () => void) => {
    ipcRenderer.on('file-changed', () => callback());
  },
});
