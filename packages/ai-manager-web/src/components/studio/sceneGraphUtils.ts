import {
  SceneGraph,
  SceneNode,
  NodeType,
  Fill,
  Stroke,
  Color
} from '@open-pencil/scene-graph';

export function parseHexColorToSceneColor(hex?: any): Color {
  if (!hex) return { r: 0.1, g: 0.1, b: 0.1, a: 1 };
  
  // Handle Color object format directly
  if (typeof hex === 'object') {
    if (hex.r !== undefined && hex.g !== undefined && hex.b !== undefined) {
      const r = typeof hex.r === 'number' ? (hex.r > 1 ? hex.r / 255 : hex.r) : 0.1;
      const g = typeof hex.g === 'number' ? (hex.g > 1 ? hex.g / 255 : hex.g) : 0.1;
      const b = typeof hex.b === 'number' ? (hex.b > 1 ? hex.b / 255 : hex.b) : 0.1;
      const a = hex.a !== undefined ? (typeof hex.a === 'number' ? (hex.a > 1 ? hex.a / 100 : hex.a) : 1) : 1;
      return { r, g, b, a };
    }
    if (hex.fillColor || hex.strokeColor || hex.color) {
      return parseHexColorToSceneColor(hex.fillColor || hex.strokeColor || hex.color);
    }
    return { r: 0.1, g: 0.1, b: 0.1, a: 1 };
  }

  if (typeof hex !== 'string') {
    return { r: 0.1, g: 0.1, b: 0.1, a: 1 };
  }

  // Handle rgb/rgba string format e.g. "rgb(255, 255, 255)"
  if (hex.startsWith('rgb')) {
    const match = hex.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (match) {
      return {
        r: parseInt(match[1], 10) / 255,
        g: parseInt(match[2], 10) / 255,
        b: parseInt(match[3], 10) / 255,
        a: match[4] !== undefined ? parseFloat(match[4]) : 1
      };
    }
  }

  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const num = parseInt(h.slice(0, 6), 16) || 0;
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  let a = 1;
  if (h.length >= 8) {
    a = (parseInt(h.slice(6, 8), 16) || 255) / 255;
  }
  return { r, g, b, a };
}

export function getNodeAbsoluteBounds(graph: SceneGraph, nodeId: string): { x: number; y: number; width: number; height: number } | null {
  const node = graph.getNode(nodeId);
  if (!node) return null;
  let absX = node.x || 0;
  let absY = node.y || 0;
  let curr = node.parentId ? graph.getNode(node.parentId) : null;
  while (curr && (curr.type as string) !== 'DOCUMENT' && (curr.type as string) !== 'CANVAS' && (curr as any).type !== 'PAGE') {
    absX += curr.x || 0;
    absY += curr.y || 0;
    curr = curr.parentId ? graph.getNode(curr.parentId) : null;
  }
  return { x: absX, y: absY, width: node.width || 100, height: node.height || 100 };
}

export function createDemoSceneGraph(): SceneGraph {
  const graph = new SceneGraph();
  const page = graph.getPages()[0];
  const pageId = page.id;

  // 1. Components Artboard (Exact OpenPencil Demo)
  const compArtboardId = 'artboard_components';
  graph.createNodeWithId(compArtboardId, 'FRAME', pageId, {
    name: 'Components',
    x: 180,
    y: 160,
    width: 680,
    height: 440,
    fills: [{ type: 'SOLID', color: { r: 0.22, g: 0.22, b: 0.24, a: 1 }, opacity: 1, visible: true }],
    strokes: [{ color: { r: 0.3, g: 0.3, b: 0.32, a: 0.8 }, weight: 1, opacity: 0.8, visible: true, align: 'INSIDE' }],
    cornerRadius: 8,
    clipsContent: true
  });

  // Buttons section
  const btnFrameId = 'btn_group';
  graph.createNodeWithId(btnFrameId, 'FRAME', compArtboardId, {
    name: 'Button Container',
    x: 32,
    y: 32,
    width: 280,
    height: 120,
    fills: [{ type: 'SOLID', color: { r: 0.18, g: 0.18, b: 0.2, a: 0.5 }, opacity: 0.5, visible: true }],
    strokes: [{ color: { r: 0.5, g: 0.3, b: 0.9, a: 0.8 }, weight: 1.5, opacity: 0.8, visible: true, align: 'INSIDE' }],
    cornerRadius: 6
  });

  graph.createNodeWithId('btn_primary', 'RECTANGLE', btnFrameId, {
    name: 'Primary Button',
    x: 24,
    y: 44,
    width: 100,
    height: 36,
    fills: [{ type: 'SOLID', color: { r: 0.15, g: 0.39, b: 0.92, a: 1 }, opacity: 1, visible: true }],
    cornerRadius: 6
  });
  graph.createNodeWithId('btn_primary_txt', 'TEXT', btnFrameId, {
    name: 'Button Text',
    x: 36,
    y: 54,
    width: 80,
    height: 18,
    text: 'Get Started',
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: 600,
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }]
  });

  graph.createNodeWithId('btn_cancel', 'RECTANGLE', btnFrameId, {
    name: 'Cancel Button',
    x: 140,
    y: 44,
    width: 80,
    height: 36,
    fills: [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95, a: 1 }, opacity: 1, visible: true }],
    strokes: [{ color: { r: 0.8, g: 0.8, b: 0.8, a: 1 }, weight: 1, opacity: 1, visible: true, align: 'INSIDE' }],
    cornerRadius: 6
  });
  graph.createNodeWithId('btn_cancel_txt', 'TEXT', btnFrameId, {
    name: 'Cancel Text',
    x: 160,
    y: 54,
    width: 60,
    height: 18,
    text: 'Cancel',
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: 500,
    fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2, a: 1 }, opacity: 1, visible: true }]
  });

  // Pill / Tag
  graph.createNodeWithId('tag_design', 'RECTANGLE', compArtboardId, {
    name: 'Tag: Design',
    x: 360,
    y: 60,
    width: 60,
    height: 24,
    fills: [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.98, a: 1 }, opacity: 1, visible: true }],
    cornerRadius: 12
  });
  graph.createNodeWithId('tag_design_txt', 'TEXT', compArtboardId, {
    name: 'Design Tag Label',
    x: 372,
    y: 65,
    width: 40,
    height: 14,
    text: 'Design',
    fontSize: 10,
    fontFamily: 'Inter',
    fontWeight: 600,
    fills: [{ type: 'SOLID', color: { r: 0.4, g: 0.2, b: 0.8, a: 1 }, opacity: 1, visible: true }]
  });

  // Card component
  const cardId = 'comp_card';
  graph.createNodeWithId(cardId, 'FRAME', compArtboardId, {
    name: 'Analytics Card',
    x: 32,
    y: 180,
    width: 220,
    height: 140,
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }],
    cornerRadius: 8
  });
  graph.createNodeWithId('card_txt_title', 'TEXT', cardId, {
    name: 'Card Title',
    x: 16,
    y: 16,
    width: 180,
    height: 18,
    text: 'Analytics Overview',
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: 700,
    fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.15, a: 1 }, opacity: 1, visible: true }]
  });
  graph.createNodeWithId('card_txt_desc', 'TEXT', cardId, {
    name: 'Card Description',
    x: 16,
    y: 38,
    width: 180,
    height: 32,
    text: 'Track your key metrics and performance indicators in real time.',
    fontSize: 10,
    fontFamily: 'Inter',
    fontWeight: 400,
    fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.6, a: 1 }, opacity: 1, visible: true }]
  });
  graph.createNodeWithId('card_bar_bg', 'RECTANGLE', cardId, {
    name: 'Progress Bar BG',
    x: 16,
    y: 84,
    width: 160,
    height: 6,
    fills: [{ type: 'SOLID', color: { r: 0.9, g: 0.92, b: 0.96, a: 1 }, opacity: 1, visible: true }],
    cornerRadius: 3
  });
  graph.createNodeWithId('card_bar_fg', 'RECTANGLE', cardId, {
    name: 'Progress Bar FG',
    x: 16,
    y: 84,
    width: 110,
    height: 6,
    fills: [{ type: 'SOLID', color: { r: 0.23, g: 0.51, b: 0.96, a: 1 }, opacity: 1, visible: true }],
    cornerRadius: 3
  });

  // Input Box
  graph.createNodeWithId('input_box', 'RECTANGLE', compArtboardId, {
    name: 'Input Box',
    x: 280,
    y: 180,
    width: 180,
    height: 36,
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }],
    cornerRadius: 6
  });
  graph.createNodeWithId('input_txt', 'TEXT', compArtboardId, {
    name: 'Input Placeholder',
    x: 294,
    y: 191,
    width: 100,
    height: 16,
    text: 'Search...',
    fontSize: 11,
    fontFamily: 'Inter',
    fontWeight: 400,
    fills: [{ type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.7, a: 1 }, opacity: 1, visible: true }]
  });

  // Color Palette Dots
  const dotColors = [
    { r: 0.23, g: 0.51, b: 0.96, a: 1 },
    { r: 0.45, g: 0.35, b: 0.95, a: 1 },
    { r: 0.65, g: 0.25, b: 0.95, a: 1 },
    { r: 0.15, g: 0.8, b: 0.5, a: 1 },
    { r: 0.2, g: 0.75, b: 0.8, a: 1 },
    { r: 0.95, g: 0.55, b: 0.15, a: 1 },
    { r: 0.92, g: 0.28, b: 0.28, a: 1 }
  ];
  dotColors.forEach((col, idx) => {
    graph.createNodeWithId(`dot_color_${idx}`, 'ELLIPSE', compArtboardId, {
      name: `Color Dot ${idx + 1}`,
      x: 36 + idx * 38,
      y: 360,
      width: 26,
      height: 26,
      fills: [{ type: 'SOLID', color: col, opacity: 1, visible: true }]
    });
  });

  // 2. App Preview Artboard (Exact OpenPencil Demo)
  const previewArtboardId = 'artboard_app_preview';
  graph.createNodeWithId(previewArtboardId, 'FRAME', pageId, {
    name: 'App Preview',
    x: 900,
    y: 160,
    width: 560,
    height: 440,
    fills: [{ type: 'SOLID', color: { r: 0.22, g: 0.22, b: 0.24, a: 1 }, opacity: 1, visible: true }],
    strokes: [{ color: { r: 0.3, g: 0.3, b: 0.32, a: 0.8 }, weight: 1, opacity: 0.8, visible: true, align: 'INSIDE' }],
    cornerRadius: 8,
    clipsContent: true
  });

  // White inner Dashboard screen
  const innerDashId = 'dash_screen';
  graph.createNodeWithId(innerDashId, 'FRAME', previewArtboardId, {
    name: 'Dashboard UI',
    x: 28,
    y: 28,
    width: 504,
    height: 384,
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }],
    cornerRadius: 8
  });

  // Header & sidebar inside preview
  graph.createNodeWithId('dash_dot_user', 'ELLIPSE', innerDashId, {
    name: 'User Dot',
    x: 16,
    y: 20,
    width: 14,
    height: 14,
    fills: [{ type: 'SOLID', color: { r: 0.15, g: 0.45, b: 0.95, a: 1 }, opacity: 1, visible: true }]
  });
  graph.createNodeWithId('dash_title', 'TEXT', innerDashId, {
    name: 'Dashboard Header',
    x: 50,
    y: 20,
    width: 140,
    height: 16,
    text: 'Dashboard',
    fontSize: 13,
    fontFamily: 'Inter',
    fontWeight: 700,
    fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.15, a: 1 }, opacity: 1, visible: true }]
  });

  // KPI Mini Cards
  graph.createNodeWithId('dash_kpi1_lbl', 'TEXT', innerDashId, {
    name: 'Revenue Label',
    x: 50,
    y: 70,
    width: 80,
    height: 12,
    text: 'Revenue',
    fontSize: 9,
    fontFamily: 'Inter',
    fontWeight: 500,
    fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.6, a: 1 }, opacity: 1, visible: true }]
  });
  graph.createNodeWithId('dash_kpi1_val', 'TEXT', innerDashId, {
    name: 'Revenue Value',
    x: 50,
    y: 86,
    width: 100,
    height: 20,
    text: '$12,480',
    fontSize: 16,
    fontFamily: 'Inter',
    fontWeight: 700,
    fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.15, a: 1 }, opacity: 1, visible: true }]
  });

  graph.createNodeWithId('dash_kpi2_lbl', 'TEXT', innerDashId, {
    name: 'Users Label',
    x: 160,
    y: 70,
    width: 80,
    height: 12,
    text: 'Users',
    fontSize: 9,
    fontFamily: 'Inter',
    fontWeight: 500,
    fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.6, a: 1 }, opacity: 1, visible: true }]
  });
  graph.createNodeWithId('dash_kpi2_val', 'TEXT', innerDashId, {
    name: 'Users Value',
    x: 160,
    y: 86,
    width: 100,
    height: 20,
    text: '3,842',
    fontSize: 16,
    fontFamily: 'Inter',
    fontWeight: 700,
    fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.15, a: 1 }, opacity: 1, visible: true }]
  });

  // Bar chart inside dashboard preview
  const barHeights = [40, 65, 55, 80, 70, 95, 85, 90];
  barHeights.forEach((bh, idx) => {
    graph.createNodeWithId(`dash_bar_${idx}`, 'RECTANGLE', innerDashId, {
      name: `Bar ${idx + 1}`,
      x: 50 + idx * 30,
      y: 240 - bh,
      width: 18,
      height: bh,
      fills: [{ type: 'SOLID', color: { r: 0.28, g: 0.48, b: 0.95, a: 1 }, opacity: 1, visible: true }],
      cornerRadius: 3
    });
  });

  // 3. Gradient Cards (Linear Gradient, Ocean Breeze, Warm Sunset)
  const grad1 = 'card_grad_1';
  graph.createNodeWithId(grad1, 'FRAME', pageId, {
    name: 'Linear Gradient',
    x: 180,
    y: 630,
    width: 140,
    height: 90,
    fills: [{ type: 'SOLID', color: { r: 0.85, g: 0.25, b: 0.65, a: 1 }, opacity: 1, visible: true }],
    cornerRadius: 8
  });
  graph.createNodeWithId('grad1_txt', 'TEXT', grad1, {
    name: 'Gradient 1 Label',
    x: 14,
    y: 60,
    width: 110,
    height: 16,
    text: 'Linear Gradient',
    fontSize: 11,
    fontFamily: 'Inter',
    fontWeight: 600,
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }]
  });

  const grad2 = 'card_grad_2';
  graph.createNodeWithId(grad2, 'FRAME', pageId, {
    name: 'Ocean Breeze',
    x: 340,
    y: 630,
    width: 140,
    height: 90,
    fills: [{ type: 'SOLID', color: { r: 0.15, g: 0.65, b: 0.8, a: 1 }, opacity: 1, visible: true }],
    cornerRadius: 8
  });
  graph.createNodeWithId('grad2_txt', 'TEXT', grad2, {
    name: 'Gradient 2 Label',
    x: 14,
    y: 60,
    width: 110,
    height: 16,
    text: 'Ocean Breeze',
    fontSize: 11,
    fontFamily: 'Inter',
    fontWeight: 600,
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }]
  });

  const grad3 = 'card_grad_3';
  graph.createNodeWithId(grad3, 'FRAME', pageId, {
    name: 'Warm Sunset',
    x: 500,
    y: 630,
    width: 140,
    height: 90,
    fills: [{ type: 'SOLID', color: { r: 0.95, g: 0.45, b: 0.2, a: 1 }, opacity: 1, visible: true }],
    cornerRadius: 8
  });
  graph.createNodeWithId('grad3_txt', 'TEXT', grad3, {
    name: 'Gradient 3 Label',
    x: 14,
    y: 60,
    width: 110,
    height: 16,
    text: 'Warm Sunset',
    fontSize: 11,
    fontFamily: 'Inter',
    fontWeight: 600,
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }]
  });

  // 4. Heading Typography Card
  const typoCard = 'card_typo';
  graph.createNodeWithId(typoCard, 'FRAME', pageId, {
    name: 'Typography',
    x: 660,
    y: 630,
    width: 200,
    height: 110,
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }],
    cornerRadius: 8
  });
  graph.createNodeWithId('typo_h1', 'TEXT', typoCard, {
    name: 'Heading',
    x: 16,
    y: 14,
    width: 160,
    height: 20,
    text: 'Heading',
    fontSize: 15,
    fontFamily: 'Inter',
    fontWeight: 700,
    fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.15, a: 1 }, opacity: 1, visible: true }]
  });
  graph.createNodeWithId('typo_sub', 'TEXT', typoCard, {
    name: 'Subheading',
    x: 16,
    y: 36,
    width: 160,
    height: 16,
    text: 'Subheading',
    fontSize: 11,
    fontFamily: 'Inter',
    fontWeight: 600,
    fills: [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.5, a: 1 }, opacity: 1, visible: true }]
  });
  graph.createNodeWithId('typo_body', 'TEXT', typoCard, {
    name: 'Body text',
    x: 16,
    y: 56,
    width: 170,
    height: 36,
    text: 'Body text — The quick brown fox jumps. Ligatures off — office offline.',
    fontSize: 9,
    fontFamily: 'Inter',
    fontWeight: 400,
    fills: [{ type: 'SOLID', color: { r: 0.45, g: 0.45, b: 0.55, a: 1 }, opacity: 1, visible: true }]
  });

  return graph;
}

export function createSceneGraphFromComponents(
  components: any[],
  boardWidth = 1440,
  boardHeight = 900,
  title = 'AI Screen',
  isDark = true,
  screenSpec?: any
): SceneGraph {
  const graph = new SceneGraph();
  const page = graph.getPages()[0];
  const pageId = page.id;

  // Determine Artboard background color
  const bgHex = screenSpec?.board?.background || screenSpec?.theme?.backgroundColor || (isDark ? '#12131a' : '#ffffff');
  const rootBgColor = parseHexColorToSceneColor(bgHex);

  // Read persisted root frame X & Y
  const rootFrameX = screenSpec?.board?.x !== undefined ? screenSpec.board.x : (screenSpec?.x !== undefined ? screenSpec.x : 100);
  const rootFrameY = screenSpec?.board?.y !== undefined ? screenSpec.board.y : (screenSpec?.y !== undefined ? screenSpec.y : 80);

  // Auto-detect mobile dimensions if components fit in mobile width
  const maxCompX = components.reduce((max, c) => Math.max(max, (c.x || 0) + (c.width || 0)), 0);
  const maxCompY = components.reduce((max, c) => Math.max(max, (c.y || 0) + (c.height || 0)), 0);
  const calculatedWidth = (title.toLowerCase().includes('mobile') || maxCompX <= 450) ? 390 : boardWidth || 1440;
  const calculatedHeight = (title.toLowerCase().includes('mobile') || maxCompX <= 450) ? Math.max(844, maxCompY + 40) : boardHeight || 900;

  const rootFrameId = 'frame_root';
  graph.createNodeWithId(rootFrameId, 'FRAME', pageId, {
    name: title,
    x: rootFrameX,
    y: rootFrameY,
    width: calculatedWidth,
    height: calculatedHeight,
    fills: [{
      type: 'SOLID',
      color: rootBgColor,
      opacity: 1,
      visible: true
    }],
    strokes: [{
      color: isDark ? { r: 0.22, g: 0.24, b: 0.32, a: 0.8 } : { r: 0.8, g: 0.85, b: 0.9, a: 0.8 },
      weight: 1,
      opacity: 0.8,
      visible: true,
      align: 'INSIDE'
    }],
    cornerRadius: calculatedWidth <= 450 ? 32 : 12,
    clipsContent: true
  });

  const mapComp = (c: any, parentId: string) => {
    let nodeType: NodeType = 'FRAME';
    if (c.type === 'text') nodeType = 'TEXT';
    else if (c.type === 'rect' || c.type === 'button' || c.type === 'badge' || c.type === 'input') nodeType = 'RECTANGLE';
    else if (c.type === 'circle' || c.type === 'avatar' || c.type === 'ellipse') nodeType = 'ELLIPSE';
    else nodeType = 'FRAME';

    const fills: Fill[] = [];
    if (c.fills && c.fills.length > 0) {
      c.fills.forEach((f: any) => {
        if (f.fillColor || f.color) {
          fills.push({
            type: 'SOLID',
            color: parseHexColorToSceneColor(f.fillColor || f.color),
            opacity: f.fillOpacity !== undefined ? f.fillOpacity : 1,
            visible: true
          });
        }
      });
    } else if (c.color && nodeType === 'TEXT') {
      fills.push({ type: 'SOLID', color: parseHexColorToSceneColor(c.color), opacity: 1, visible: true });
    } else if (nodeType === 'TEXT') {
      fills.push({ type: 'SOLID', color: isDark ? { r: 0.95, g: 0.98, b: 1, a: 1 } : { r: 0.05, g: 0.08, b: 0.15, a: 1 }, opacity: 1, visible: true });
    } else if (nodeType === 'FRAME' || nodeType === 'RECTANGLE' || nodeType === 'ELLIPSE') {
      const surfaceHex = screenSpec?.theme?.surfaceColor || (isDark ? '#1c1e29' : '#ffffff');
      fills.push({ type: 'SOLID', color: parseHexColorToSceneColor(surfaceHex), opacity: 0.95, visible: true });
    }

    const strokes: Stroke[] = [];
    if (c.strokes && c.strokes.length > 0) {
      c.strokes.forEach((s: any) => {
        if (s.strokeColor || s.color) {
          strokes.push({
            color: parseHexColorToSceneColor(s.strokeColor || s.color),
            weight: s.strokeWidth || s.weight || 1,
            opacity: 1,
            visible: true,
            align: 'INSIDE'
          });
        }
      });
    } else if (nodeType === 'FRAME' || nodeType === 'RECTANGLE') {
      strokes.push({
        color: isDark ? { r: 0.24, g: 0.28, b: 0.38, a: 0.6 } : { r: 0.85, g: 0.88, b: 0.92, a: 0.8 },
        weight: 1,
        opacity: 0.6,
        visible: true,
        align: 'INSIDE'
      });
    }

    const nodeId = c.id || `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    graph.createNodeWithId(nodeId, nodeType, parentId, {
      name: c.name || c.text || c.type,
      x: c.x || 0,
      y: c.y || 0,
      width: c.width || 120,
      height: c.height || 40,
      fills,
      strokes,
      cornerRadius: c.borderRadius || 0,
      text: c.text || (c as any).characters || '',
      fontSize: c.fontSize || 14,
      fontFamily: 'Inter',
      fontWeight: c.fontWeight === 'bold' || c.fontWeight === '700' ? 700 : c.fontWeight === '600' ? 600 : 400
    });

    if (c.children && Array.isArray(c.children)) {
      c.children.forEach((child: any) => mapComp(child, nodeId));
    }
  };

  components.forEach(comp => mapComp(comp, rootFrameId));
  return graph;
}
