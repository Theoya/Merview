import { readFileSync, writeFileSync, existsSync } from 'fs';
import { SmvFile, Annotation } from './types';

export function getSmvPath(diagramPath: string): string {
  return diagramPath.replace(/\.[^.]+$/, '.smv');
}

export function loadSmv(diagramPath: string): SmvFile | null {
  const smvPath = getSmvPath(diagramPath);
  if (!existsSync(smvPath)) return null;
  try {
    const raw = readFileSync(smvPath, 'utf-8');
    const data = JSON.parse(raw) as SmvFile;
    if (data.version === 1 && Array.isArray(data.annotations)) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveSmv(diagramPath: string, annotations: Annotation[]): void {
  const smvPath = getSmvPath(diagramPath);
  const data: SmvFile = { version: 1, annotations };
  writeFileSync(smvPath, JSON.stringify(data, null, 2), 'utf-8');
}
