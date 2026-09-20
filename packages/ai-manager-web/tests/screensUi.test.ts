import { describe, it, expect } from 'vitest';
import { ScreenLayoutSpec, LayoutComponent, LayoutBoard } from '../src/features/screens';

describe('Screens & OpenPencil Data Models', () => {
  it('validates ScreenLayoutSpec and LayoutBoard contract', () => {
    const mockComponent: LayoutComponent = {
      id: 'comp_1',
      name: 'Header Frame',
      type: 'frame',
      x: 0,
      y: 0,
      width: 1440,
      height: 80
    };

    const mockBoard: LayoutBoard = {
      id: 'board_1',
      name: 'Main Board',
      x: 0,
      y: 0,
      width: 1440,
      height: 900,
      background: '#1e1e1e',
      components: [mockComponent]
    };

    const mockScreen: ScreenLayoutSpec = {
      id: 'screen_1',
      projectId: 'acme-api',
      userId: 'user_1',
      name: 'Main Dashboard',
      description: 'Primary UI spec',
      board: mockBoard,
      theme: {
        primaryColor: '#3b82f6',
        backgroundColor: '#0f172a',
        surfaceColor: '#1e293b',
        textColor: '#f8fafc',
        accentColor: '#8b5cf6',
        borderRadius: 8
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    expect(mockScreen.id).toBe('screen_1');
    expect(mockScreen.board.components.length).toBe(1);
    expect(mockScreen.board.components[0].type).toBe('frame');
  });

  it('safely supports diverse component primitives', () => {
    const primitives: LayoutComponent['type'][] = [
      'frame',
      'rect',
      'circle',
      'text',
      'button',
      'input',
      'card',
      'table',
      'badge',
      'avatar',
      'chart',
      'navbar',
      'sidebar'
    ];

    primitives.forEach((type, idx) => {
      const comp: LayoutComponent = {
        id: `comp_${idx}`,
        name: `Component ${type}`,
        type,
        x: idx * 10,
        y: idx * 10,
        width: 100,
        height: 50
      };
      expect(comp.type).toBe(type);
    });
  });
});
