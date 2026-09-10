import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiClient } from '../api/client';

export interface PenpotComponent {
  id: string;
  name: string;
  type: 'frame' | 'rect' | 'circle' | 'text' | 'button' | 'input' | 'card' | 'table' | 'badge' | 'avatar' | 'chart' | 'navbar' | 'sidebar';
  x: number;
  y: number;
  width: number;
  height: number;
  fills?: Array<{ fillOpacity?: number; fillColor?: string }>;
  strokes?: Array<{ strokeColor?: string; strokeWidth?: number; strokeStyle?: 'solid' | 'dashed' }>;
  borderRadius?: number;
  text?: string;
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
  layout?: 'flex' | 'grid' | 'none';
  flexDir?: 'row' | 'column';
  gap?: number;
  padding?: number;
  children?: PenpotComponent[];
  props?: Record<string, any>;
}

export interface PenpotBoard {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  background: string;
  components: PenpotComponent[];
}

export interface ScreenLayoutSpec {
  id: string;
  projectId: string;
  userId: string;
  name: string;
  description: string;
  board: PenpotBoard;
  theme: {
    primaryColor: string;
    backgroundColor: string;
    surfaceColor: string;
    textColor: string;
    accentColor: string;
    borderRadius: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TemplateInfo {
  key: string;
  name: string;
  description: string;
  theme: any;
  dimensions: { width: number; height: number };
}

export function useScreens(projectId?: string) {
  const [screens, setScreens] = useState<ScreenLayoutSpec[]>([]);
  const [currentScreen, setCurrentScreen] = useState<ScreenLayoutSpec | null>(null);
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchScreens = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const url = projectId ? `/api/screens?projectId=${encodeURIComponent(projectId)}` : '/api/screens';
      const res = await ApiClient.get<{ success: boolean; screens: ScreenLayoutSpec[] }>(url);
      setScreens(res.screens || []);
      if (res.screens && res.screens.length > 0) {
        setCurrentScreen(prev => (prev ? (res.screens.find(s => s.id === prev.id) || res.screens[0]) : res.screens[0]));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load screens');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await ApiClient.get<{ success: boolean; templates: TemplateInfo[] }>('/api/screens/templates');
      setTemplates(res.templates || []);
    } catch (err: any) {
      console.warn('Failed to load screen templates', err);
    }
  }, []);

  const selectScreen = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await ApiClient.get<{ success: boolean; screen: ScreenLayoutSpec }>(`/api/screens/${id}`);
      setCurrentScreen(res.screen);
    } catch (err: any) {
      setError(err.message || `Failed to fetch screen ${id}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createScreen = useCallback(async (payload: { name: string; description?: string; templateKey?: string; board?: PenpotBoard; theme?: any }) => {
    setError(null);
    try {
      const res = await ApiClient.post<{ success: boolean; screen: ScreenLayoutSpec }>('/api/screens', {
        ...payload,
        projectId: projectId || 'global'
      });
      setScreens(prev => [res.screen, ...prev]);
      setCurrentScreen(res.screen);
      return res.screen;
    } catch (err: any) {
      setError(err.message || 'Failed to create screen');
      throw err;
    }
  }, [projectId]);

  const updateScreen = useCallback(async (id: string, payload: Partial<ScreenLayoutSpec>) => {
    setError(null);
    try {
      const res = await ApiClient.put<{ success: boolean; screen: ScreenLayoutSpec }>(`/api/screens/${id}`, payload);
      setScreens(prev => prev.map(s => (s.id === id ? res.screen : s)));
      if (currentScreen?.id === id) {
        setCurrentScreen(res.screen);
      }
      return res.screen;
    } catch (err: any) {
      setError(err.message || 'Failed to update screen');
      throw err;
    }
  }, [currentScreen]);

  const deleteScreen = useCallback(async (id: string) => {
    setError(null);
    try {
      await ApiClient.delete(`/api/screens/${id}`);
      setScreens(prev => prev.filter(s => s.id !== id));
      if (currentScreen?.id === id) {
        const remaining = screens.filter(s => s.id !== id);
        setCurrentScreen(remaining.length > 0 ? remaining[0] : null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete screen');
      throw err;
    }
  }, [currentScreen, screens]);

  const generateAiLayout = useCallback(async (prompt: string) => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await ApiClient.post<{ success: boolean; screen: ScreenLayoutSpec }>('/api/screens/generate', {
        prompt,
        projectId: projectId || 'global'
      });
      setScreens(prev => [res.screen, ...prev]);
      setCurrentScreen(res.screen);
      return res.screen;
    } catch (err: any) {
      setError(err.message || 'AI layout generation failed');
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, [projectId]);

  const exportPenpotJson = useCallback(async (screenId: string, screenName: string) => {
    try {
      const res = await ApiClient.get<any>(`/api/screens/${screenId}/export?format=penpot`);
      const blob = new Blob([JSON.stringify(res, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${screenName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.penpot.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Failed to export Penpot JSON');
      throw err;
    }
  }, []);

  // Debounce ref for non-blocking 60fps local edits
  const persistTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const persistScreenState = useCallback((screenToPersist: ScreenLayoutSpec, immediate: boolean = false) => {
    if (persistTimeoutRef.current) {
      clearTimeout(persistTimeoutRef.current);
    }
    persistTimeoutRef.current = setTimeout(async () => {
      try {
        await ApiClient.put(`/api/screens/${screenToPersist.id}`, {
          board: screenToPersist.board,
          theme: screenToPersist.theme,
          name: screenToPersist.name,
          description: screenToPersist.description
        });
      } catch (err) {
        console.warn('Background screen persist failed:', err);
      }
    }, immediate ? 0 : 500);
  }, []);

  // Component Tree Helpers (Synchronous instant UI updates + debounced persist)
  const addComponent = useCallback((newComp: PenpotComponent, parentId?: string) => {
    setCurrentScreen(prevScreen => {
      if (!prevScreen) return null;
      const addRecursive = (list: PenpotComponent[]): PenpotComponent[] => {
        if (!parentId) return [...list, newComp];
        return list.map(c => {
          if (c.id === parentId) {
            return { ...c, children: [...(c.children || []), newComp] };
          }
          if (c.children && c.children.length > 0) {
            return { ...c, children: addRecursive(c.children) };
          }
          return c;
        });
      };

      const updatedComponents = addRecursive(prevScreen.board.components);
      const updatedScreen: ScreenLayoutSpec = {
        ...prevScreen,
        board: { ...prevScreen.board, components: updatedComponents }
      };

      setScreens(prev => prev.map(s => (s.id === updatedScreen.id ? updatedScreen : s)));
      persistScreenState(updatedScreen, true);
      return updatedScreen;
    });
  }, [persistScreenState]);

  const updateComponent = useCallback((compId: string, updates: Partial<PenpotComponent>, persistImmediately: boolean = false) => {
    setCurrentScreen(prevScreen => {
      if (!prevScreen) return null;
      const updateRecursive = (list: PenpotComponent[]): PenpotComponent[] => {
        return list.map(c => {
          if (c.id === compId) {
            return { ...c, ...updates };
          }
          if (c.children && c.children.length > 0) {
            return { ...c, children: updateRecursive(c.children) };
          }
          return c;
        });
      };

      const updatedComponents = updateRecursive(prevScreen.board.components);
      const updatedScreen: ScreenLayoutSpec = {
        ...prevScreen,
        board: { ...prevScreen.board, components: updatedComponents }
      };

      setScreens(prev => prev.map(s => (s.id === updatedScreen.id ? updatedScreen : s)));
      persistScreenState(updatedScreen, persistImmediately);
      return updatedScreen;
    });
  }, [persistScreenState]);

  const deleteComponent = useCallback((compId: string) => {
    setCurrentScreen(prevScreen => {
      if (!prevScreen) return null;
      const deleteRecursive = (list: PenpotComponent[]): PenpotComponent[] => {
        return list
          .filter(c => c.id !== compId)
          .map(c => (c.children ? { ...c, children: deleteRecursive(c.children) } : c));
      };

      const updatedComponents = deleteRecursive(prevScreen.board.components);
      const updatedScreen: ScreenLayoutSpec = {
        ...prevScreen,
        board: { ...prevScreen.board, components: updatedComponents }
      };

      setScreens(prev => prev.map(s => (s.id === updatedScreen.id ? updatedScreen : s)));
      persistScreenState(updatedScreen, true);
      return updatedScreen;
    });
  }, [persistScreenState]);

  const duplicateComponent = useCallback((compId: string) => {
    setCurrentScreen(prevScreen => {
      if (!prevScreen) return null;
      const cloneWithNewIds = (comp: PenpotComponent): PenpotComponent => {
        const newId = `comp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        return {
          ...comp,
          id: newId,
          name: `${comp.name} (Copy)`,
          x: (comp.x || 0) + 20,
          y: (comp.y || 0) + 20,
          children: comp.children ? comp.children.map(cloneWithNewIds) : undefined
        };
      };

      const dupRecursive = (list: PenpotComponent[]): PenpotComponent[] => {
        const res: PenpotComponent[] = [];
        for (const c of list) {
          res.push(c);
          if (c.id === compId) {
            res.push(cloneWithNewIds(c));
          } else if (c.children && c.children.length > 0) {
            c.children = dupRecursive(c.children);
          }
        }
        return res;
      };

      const updatedComponents = dupRecursive(prevScreen.board.components);
      const updatedScreen: ScreenLayoutSpec = {
        ...prevScreen,
        board: { ...prevScreen.board, components: updatedComponents }
      };

      setScreens(prev => prev.map(s => (s.id === updatedScreen.id ? updatedScreen : s)));
      persistScreenState(updatedScreen, true);
      return updatedScreen;
    });
  }, [persistScreenState]);

  useEffect(() => {
    fetchScreens();
    fetchTemplates();
  }, [fetchScreens, fetchTemplates]);

  return {
    screens,
    currentScreen,
    setCurrentScreen,
    templates,
    isLoading,
    isGenerating,
    error,
    fetchScreens,
    selectScreen,
    createScreen,
    updateScreen,
    deleteScreen,
    generateAiLayout,
    exportPenpotJson,
    addComponent,
    updateComponent,
    deleteComponent,
    duplicateComponent
  };
}
