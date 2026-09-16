import { describe, it, expect } from 'vitest';
import { createDemoSceneGraph, createSceneGraphFromComponents } from '../src/components/studio/sceneGraphUtils';

describe('Studio Components & SceneGraph Initializer', () => {
  it('creates demo scene graph without errors', () => {
    const graph = createDemoSceneGraph();
    expect(graph).toBeDefined();
    const pages = graph.getPages();
    expect(pages.length).toBeGreaterThan(0);
    const rootNodes = pages[0].childIds;
    expect(rootNodes.length).toBeGreaterThan(0);
  });

  it('converts components to scene graph', () => {
    const graph = createSceneGraphFromComponents([
      {
        id: 'comp_1',
        name: 'Header',
        type: 'frame',
        x: 0,
        y: 0,
        width: 1440,
        height: 80,
        fills: [{ fillOpacity: 1, fillColor: '#1e1e1e' }]
      }
    ], 1440, 900, 'Test Screen');
    expect(graph).toBeDefined();
    expect(graph.getNode('comp_1')).toBeDefined();
  });

  it('safely handles non-string and complex color formats without crashing', () => {
    const graph = createSceneGraphFromComponents([
      {
        id: 'comp_color_obj',
        name: 'Card with Color Object',
        type: 'rect',
        x: 10,
        y: 10,
        width: 200,
        height: 100,
        fills: [{ color: { r: 0.8, g: 0.2, b: 0.5, a: 1 } }],
        strokes: [{ color: { r: 0.9, g: 0.9, b: 0.9, a: 1 }, weight: 2 }]
      },
      {
        id: 'comp_color_null',
        name: 'Card with Null Colors',
        type: 'rect',
        x: 220,
        y: 10,
        width: 200,
        height: 100,
        fills: [{ fillColor: null }],
        strokes: [{ strokeColor: undefined }]
      }
    ], 1440, 900, 'Color Edge Cases Test');

    expect(graph).toBeDefined();
    expect(graph.getNode('comp_color_obj')).toBeDefined();
    expect(graph.getNode('comp_color_null')).toBeDefined();
  });
});
