import { SceneGraph, exportFigFile, initCodec } from '@open-pencil/core';
import { ScreenLayoutSpec, LayoutComponent } from './screenRoutes.js';
import * as fs from 'fs';
import * as path from 'path';

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
 * Converts a ScreenLayoutSpec AST into a native binary .fig file buffer using OpenPencil SceneGraph
 */
export async function exportScreenToFigBuffer(spec: ScreenLayoutSpec): Promise<Uint8Array> {
  await initCodec();

  const graph = new SceneGraph();
  const page = graph.getPages()[0];

  const bgHex = spec.board.background || spec.theme?.backgroundColor || '#090d16';
  const bgFigma = hexToFigmaColor(bgHex);

  const artboard = graph.createNode('FRAME', page.id, {
    name: spec.name || 'Screen Artboard',
    x: spec.board.x || 0,
    y: spec.board.y || 0,
    width: spec.board.width || 1440,
    height: spec.board.height || 900,
    fills: [{
      type: 'SOLID',
      color: bgFigma,
      opacity: 1,
      visible: true
    }],
    clipsContent: true
  });

  function processComponent(comp: LayoutComponent, parentId: string) {
    const isText = comp.type === 'text';

    // Convert fills
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
    } else if (comp.color && !isText) {
      fills = [{
        type: 'SOLID',
        color: hexToFigmaColor(comp.color),
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
    }

    // Convert strokes
    let strokes: any[] = [];
    if (Array.isArray(comp.strokes) && comp.strokes.length > 0) {
      strokes = comp.strokes.map((s: any) => ({
        type: 'SOLID',
        color: hexToFigmaColor(typeof s === 'string' ? s : (s.strokeColor || s.color || '#334155')),
        opacity: 1,
        visible: true
      }));
    }

    const strokeWeight = comp.strokes && comp.strokes[0]?.strokeWidth ? comp.strokes[0].strokeWidth : (strokes.length > 0 ? 1 : 0);

    if (isText) {
      const textVal = comp.text || comp.name || 'Text';
      const textColor = comp.color || spec.theme?.textColor || '#ffffff';
      const isBold = comp.fontWeight === 'bold' || comp.fontWeight === '700' || (comp.fontWeight as any) === 700;
      const isSemi = comp.fontWeight === '600' || (comp.fontWeight as any) === 600 || comp.fontWeight === '500';
      const fWeight = isBold ? 700 : (isSemi ? 600 : 400);

      const isAlignRight = (comp as any).textAlign === 'right' || (comp as any).align === 'right';
      const isAlignCenter = (comp as any).textAlign === 'center' || (comp as any).align === 'center';

      graph.createNode('TEXT', parentId, {
        name: comp.name || textVal,
        text: textVal,
        x: comp.x || 0,
        y: comp.y || 0,
        width: comp.width || 200,
        height: comp.height || 24,
        fontSize: comp.fontSize || 14,
        fontFamily: 'Inter',
        fontWeight: fWeight,
        fills: [{
          type: 'SOLID',
          color: hexToFigmaColor(textColor),
          opacity: 1,
          visible: true
        }],
        textAlignHorizontal: isAlignCenter ? 'CENTER' : (isAlignRight ? 'RIGHT' : 'LEFT')
      });
      return;
    }

    const isFrame = comp.type === 'frame' || comp.layout === 'flex' || (comp.children && comp.children.length > 0);
    const nodeType = isFrame ? 'FRAME' : 'RECTANGLE';

    const createdNode = graph.createNode(nodeType, parentId, {
      name: comp.name || comp.type,
      x: comp.x || 0,
      y: comp.y || 0,
      width: comp.width || 120,
      height: comp.height || 40,
      cornerRadius: comp.borderRadius || 0,
      fills,
      strokes,
      clipsContent: isFrame
    });

    // If component is a button or badge with embedded text, also generate child text node
    if (comp.text && comp.text !== comp.name) {
      graph.createNode('TEXT', createdNode.id, {
        name: comp.text,
        text: comp.text,
        x: 10,
        y: Math.max(4, Math.floor(((comp.height || 36) - (comp.fontSize || 13)) / 2) - 2),
        width: Math.max(40, (comp.width || 100) - 20),
        height: comp.fontSize || 14,
        fontSize: comp.fontSize || 13,
        fontFamily: 'Inter',
        fontWeight: comp.type === 'button' || comp.type === 'badge' ? 600 : 400,
        fills: [{
          type: 'SOLID',
          color: hexToFigmaColor(comp.color || '#ffffff'),
          opacity: 1,
          visible: true
        }],
        textAlignHorizontal: comp.type === 'button' || comp.type === 'badge' ? 'CENTER' : 'LEFT'
      });
    }

    if (comp.children && Array.isArray(comp.children)) {
      for (const child of comp.children) {
        processComponent(child, createdNode.id);
      }
    }
  }

  for (const comp of (spec.board.components || [])) {
    processComponent(comp, artboard.id);
  }

  const exported = await exportFigFile(graph);
  return exported;
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
