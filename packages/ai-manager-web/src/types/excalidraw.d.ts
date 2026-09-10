declare module '@excalidraw/excalidraw' {
  import * as React from 'react';

  export interface ExcalidrawProps {
    excalidrawAPI?: (api: any) => void;
    initialData?: any;
    theme?: 'light' | 'dark';
    UIOptions?: any;
    onChange?: (elements: readonly any[], appState: any, files: any) => void;
    children?: React.ReactNode;
  }

  export const Excalidraw: React.FC<ExcalidrawProps>;
  export function exportToBlob(opts: any): Promise<Blob>;
  export function exportToSvg(opts: any): Promise<SVGSVGElement>;
  export function serializeAsJSON(elements: any[], appState: any, files: any, type: string): string;
  export function loadFromBlob(blob: Blob, defaultAppState: any, elements: any): Promise<any>;
}
