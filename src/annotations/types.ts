export interface BaseAnnotation {
  id: string;
  type: string;
  x: number;
  y: number;
  zIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface FreehandAnnotation extends BaseAnnotation {
  type: 'freehand';
  pathData: string;
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
}

export interface ImageAnnotation extends BaseAnnotation {
  type: 'image';
  dataUri: string;
  width: number;
  height: number;
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  markdown: string;
  width: number;
  height: number;
  fontSize: number;
  color: string;
}

export type Annotation = FreehandAnnotation | ImageAnnotation | TextAnnotation;

export interface SmvFile {
  version: 1;
  annotations: Annotation[];
}
