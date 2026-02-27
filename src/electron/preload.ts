import { contextBridge, ipcRenderer } from 'electron';

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];

function isImageFile(filePath: string): boolean {
  const ext = filePath.toLowerCase().replace(/.*(\.[^.]+)$/, '$1');
  return IMAGE_EXTENSIONS.includes(ext);
}

contextBridge.exposeInMainWorld('mermaidViewer', {
  openFile: () => ipcRenderer.invoke('open-file-dialog'),

  // Annotation APIs
  getAnnotations: () => ipcRenderer.invoke('get-annotations'),
  saveAnnotations: (annotations: any[]) => ipcRenderer.invoke('save-annotations', annotations),
  readImageAsDataUri: (filePath: string) => ipcRenderer.invoke('read-image-as-datauri', filePath),
  notifyReady: () => ipcRenderer.send('renderer-ready'),

  // Annotation event listeners
  onLoadAnnotations: (callback: (annotations: any[]) => void) => {
    ipcRenderer.on('load-annotations', (_event, annotations) => callback(annotations));
  },
  onSetMode: (callback: (mode: string) => void) => {
    ipcRenderer.on('set-mode', (_event, mode) => callback(mode));
  },
  onDeleteSelected: (callback: () => void) => {
    ipcRenderer.on('delete-selected', () => callback());
  },
  onClearAnnotations: (callback: () => void) => {
    ipcRenderer.on('clear-annotations', () => callback());
  },

  // Existing handlers
  onFileDropped: (callback: (filePath: string) => void) => {
    document.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const filePath = (files[0] as any).path;
        if (filePath) {
          if (isImageFile(filePath)) {
            // Image files go to annotation engine via custom event
            ipcRenderer.invoke('read-image-as-datauri', filePath).then((dataUri: string) => {
              window.dispatchEvent(new CustomEvent('annotation-image-drop', {
                detail: { dataUri, filePath }
              }));
            });
          } else {
            // Diagram files go to main process
            ipcRenderer.send('file-dropped', filePath);
            callback(filePath);
          }
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
