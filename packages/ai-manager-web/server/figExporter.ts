import { initCodec, createNodeChangesMessage, encodeMessage, getSchemaBytes } from '@open-pencil/kiwi/fig/codec';
import { writeFigArchive } from '@open-pencil/fig';
import { deflateSync } from 'fflate';
import { ScreenLayoutSpec, LayoutComponent } from './screenRoutes.js';
import * as fs from 'fs';
import * as path from 'path';

// 1x1 PNG blank thumbnail placeholder
const DEFAULT_THUMBNAIL_PNG = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137,
  0, 0, 0, 10, 73, 68, 65, 84, 120, 156, 99, 0, 1, 0, 0, 5, 0, 1, 13, 10, 45, 180, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66,
  96, 130
]);

/**
 * Converts Hex / CSS color (#rrggbb or #rrggbbaa) to Figma 0-1 RGBA floats
 */
export function hexToFigmaColor(hex: string): { r: number; g: number; b: number; a: number } {
  if (!hex || typeof hex !== 'string') {
    return { r: 0.1, g: 0.1, b: 0.15, a: 1 };
  }
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  if (clean.length === 6) {
    clean += 'ff';
  }
  if (clean.length !== 8) {
    return { r: 0.1, g: 0.1, b: 0.15, a: 1 };
  }
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const a = parseInt(clean.slice(6, 8), 16) / 255;
  return {
    r: Math.min(1, Math.max(0, isNaN(r) ? 0 : r)),
    g: Math.min(1, Math.max(0, isNaN(g) ? 0 : g)),
    b: Math.min(1, Math.max(0, isNaN(b) ? 0 : b)),
    a: Math.min(1, Math.max(0, isNaN(a) ? 1 : a))
  };
}

/**
 * Converts a ScreenLayoutSpec AST into a native binary .fig file buffer using OpenPencil
 */
export async function exportScreenToFigBuffer(spec: ScreenLayoutSpec): Promise<Uint8Array> {
  await initCodec();
  const schemaDeflated = deflateSync(getSchemaBytes());

  let localIdCounter = 1;

  const docGuid = { sessionID: 0, localID: 0 };
  const pageGuid = { sessionID: 0, localID: 1 };
  const frameGuid = { sessionID: 1, localID: ++localIdCounter };

  const bgHex = spec.board.background || spec.theme?.backgroundColor || '#090d16';
  const bgFigma = hexToFigmaColor(bgHex);

  const nodeChanges: any[] = [
    // 1. Root Document
    {
      guid: docGuid,
      type: 'DOCUMENT',
      name: 'Document',
      phase: 'CREATED',
      visible: true
    },
    // 2. Main Page (Canvas)
    {
      guid: pageGuid,
      parentIndex: { guid: docGuid, position: '!' },
      type: 'CANVAS',
      name: 'Page 1',
      phase: 'CREATED',
      visible: true,
      backgroundPaints: [{ type: 'SOLID', color: { r: 0.11, g: 0.11, b: 0.11, a: 1 }, opacity: 1, visible: true }]
    },
    // 3. Screen Artboard Frame
    {
      guid: frameGuid,
      parentIndex: { guid: pageGuid, position: '!' },
      type: 'FRAME',
      name: spec.name || 'Screen Artboard',
      phase: 'CREATED',
      visible: true,
      size: { x: spec.board.width || 1440, y: spec.board.height || 900 },
      transform: {
        m00: 1,
        m01: 0,
        m02: spec.board.x || 0,
        m10: 0,
        m11: 1,
        m12: spec.board.y || 0
      },
      fillPaints: [{ type: 'SOLID', color: bgFigma, opacity: 1, visible: true }],
      clipsContent: true
    }
  ];

  // Helper to map LayoutComponent to Figma Kiwi NodeChange
  function convertComponentRecursive(comp: LayoutComponent, parentGuid: { sessionID: number; localID: number }, positionChar: string) {
    const compGuid = { sessionID: 1, localID: ++localIdCounter };
    const isText = comp.type === 'text';

    // Fills
    let fills: any[] = [];
    if (Array.isArray(comp.fills) && comp.fills.length > 0) {
      fills = comp.fills.map((f: any) => ({
        type: 'SOLID',
        color: hexToFigmaColor(typeof f === 'string' ? f : (f.fillColor || f.color || '#1e293b')),
        opacity: (f && f.fillOpacity !== undefined) ? f.fillOpacity : 1,
        visible: true
      }));
    } else if (typeof comp.fills === 'string') {
      fills = [{
        type: 'SOLID',
        color: hexToFigmaColor(comp.fills),
        opacity: 1,
        visible: true
      }];
    } else if (!isText) {
      fills = [{
        type: 'SOLID',
        color: hexToFigmaColor(spec.theme?.surfaceColor || '#131b2e'),
        opacity: 1,
        visible: true
      }];
    } else {
      fills = [{
        type: 'SOLID',
        color: hexToFigmaColor(comp.color || spec.theme?.textColor || '#f8fafc'),
        opacity: 1,
        visible: true
      }];
    }

    // Strokes
    const strokes: any[] = Array.isArray(comp.strokes) ? comp.strokes.map((s: any) => ({
      type: 'SOLID',
      color: hexToFigmaColor(typeof s === 'string' ? s : (s.strokeColor || s.color || '#334155')),
      opacity: 1,
      visible: true
    })) : [];

    if (isText) {
      const textContent = comp.text || comp.name || 'Text';
      const isAlignRight = (comp as any).textAlign === 'right' || (comp as any).align === 'right';
      const isAlignCenter = (comp as any).textAlign === 'center' || (comp as any).align === 'center';
      nodeChanges.push({
        guid: compGuid,
        parentIndex: { guid: parentGuid, position: positionChar },
        type: 'TEXT',
        name: comp.name || textContent,
        phase: 'CREATED',
        visible: true,
        size: { x: comp.width || 200, y: comp.height || 30 },
        transform: {
          m00: 1,
          m01: 0,
          m02: comp.x || 0,
          m10: 0,
          m11: 1,
          m12: comp.y || 0
        },
        fillPaints: fills,
        fontSize: comp.fontSize || 14,
        fontName: {
          family: 'Inter',
          style: comp.fontWeight === '700' || comp.fontWeight === 'bold' ? 'Bold' : 'Regular',
          postscript: comp.fontWeight === '700' || comp.fontWeight === 'bold' ? 'Inter-Bold' : 'Inter-Regular'
        },
        textAlignHorizontal: isAlignCenter ? 'CENTER' : isAlignRight ? 'RIGHT' : 'LEFT',
        textData: {
          characters: textContent
        }
      });
    } else {
      const figmaType = comp.layout === 'flex' ? 'FRAME' : (comp.type === 'frame' ? 'FRAME' : 'RECTANGLE');
      nodeChanges.push({
        guid: compGuid,
        parentIndex: { guid: parentGuid, position: positionChar },
        type: figmaType,
        name: comp.name || comp.type,
        phase: 'CREATED',
        visible: true,
        size: { x: comp.width || 120, y: comp.height || 40 },
        transform: {
          m00: 1,
          m01: 0,
          m02: comp.x || 0,
          m10: 0,
          m11: 1,
          m12: comp.y || 0
        },
        cornerRadius: comp.borderRadius || 0,
        fillPaints: fills,
        strokePaints: strokes,
        strokeWeight: comp.strokes && comp.strokes[0]?.strokeWidth ? comp.strokes[0].strokeWidth : (strokes.length > 0 ? 1 : 0),
        clipsContent: figmaType === 'FRAME'
      });
    }

    if (comp.children && Array.isArray(comp.children)) {
      comp.children.forEach((child, idx) => {
        convertComponentRecursive(child, compGuid, String.fromCharCode(33 + (idx % 90)));
      });
    }
  }

  // Iterate top-level components
  const comps = spec.board.components || [];
  comps.forEach((comp, idx) => {
    convertComponentRecursive(comp, frameGuid, String.fromCharCode(33 + (idx % 90)));
  });

  const msg = createNodeChangesMessage(1, 1, nodeChanges);
  const kiwiData = encodeMessage(msg);

  const metaJSON = JSON.stringify({
    clientVersion: '124.0.0',
    fileVersion: 1,
    name: spec.name || 'Screen Specification'
  });

  const figArchiveBytes = writeFigArchive({
    schemaDeflated,
    kiwiData,
    thumbnailPNG: DEFAULT_THUMBNAIL_PNG,
    metaJSON
  });

  return figArchiveBytes;
}

/**
 * Saves a .fig export file to disk in ui/<slug>.fig
 */
export async function syncFigFileToDisk(spec: ScreenLayoutSpec): Promise<string> {
  const figBytes = await exportScreenToFigBuffer(spec);
  const rootDir = process.cwd();
  const targetDir = path.resolve(rootDir, 'ui');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  const slug = spec.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'untitled_screen';
  const filePath = path.join(targetDir, `${slug}.fig`);
  fs.writeFileSync(filePath, Buffer.from(figBytes));
  return `ui/${slug}.fig`;
}
