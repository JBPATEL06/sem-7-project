import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiClient } from '@/shared/api';

export interface LayoutComponent {
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
  children?: LayoutComponent[];
  props?: Record<string, any>;
}

export interface LayoutBoard {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  background: string;
  components: LayoutComponent[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  stepsCount?: number;
  changesSummary?: string;
  metadata?: {
    mode?: string;
    theme?: string;
    dimensions?: { width: number; height: number };
  };
}

export interface ScreenLayoutSpec {
  id: string;
  projectId: string;
  userId: string;
  name: string;
  description: string;
  board: LayoutBoard;
  theme: {
    primaryColor: string;
    backgroundColor: string;
    surfaceColor: string;
    textColor: string;
    accentColor: string;
    borderRadius: number;
  };
  chatHistory?: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface StitchGenerationStep {
  step: number;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  action: string;
}

export interface StitchGenerationResponse {
  success: boolean;
  intent?: 'GENERATE' | 'DISCUSS' | string;
  mode: 'create' | 'modify' | 'discuss';
  screen: ScreenLayoutSpec;
  generationSteps: StitchGenerationStep[];
  changesSummary?: string;
  assistantMessage?: string;
  assistantExplanation?: string;
  reply?: string;
  chatHistory?: ChatMessage[];
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
  const [animatingStep, setAnimatingStep] = useState<StitchGenerationStep | null>(null);
  const [animationProgress, setAnimationProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const fetchScreens = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const url = projectId ? `/api/screens?projectId=${encodeURIComponent(projectId)}` : '/api/screens';
      const res = await ApiClient.get<{ success: boolean; screens: ScreenLayoutSpec[] }>(url);
      setScreens(res.screens || []);
      if (res.screens && res.screens.length > 0) {
        setCurrentScreen(prev => (prev ? (res.screens.find((s: ScreenLayoutSpec) => s.id === prev.id) || res.screens[0]) : res.screens[0]));
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
    try {
      const found = screens.find(s => s.id === id);
      if (found) {
        setCurrentScreen(found);
        return;
      }
      const res = await ApiClient.get<{ success: boolean; screen: ScreenLayoutSpec }>(`/api/screens/${id}`);
      if (res.screen) {
        setCurrentScreen(res.screen);
        setScreens(prev => {
          if (!prev.some(s => s.id === id)) return [...prev, res.screen];
          return prev;
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to select screen');
    }
  }, [screens]);

  const createScreen = useCallback(async (
    nameOrOptions: string | { name: string; templateKey?: string; description?: string },
    templateKey?: string,
    description?: string
  ) => {
    setIsLoading(true);
    try {
      let name = '';
      let tKey = templateKey;
      let desc = description;
      if (typeof nameOrOptions === 'object') {
        name = nameOrOptions.name;
        tKey = nameOrOptions.templateKey;
        desc = nameOrOptions.description;
      } else {
        name = nameOrOptions;
      }
      const payload: any = { name, description: desc, projectId };
      if (tKey) payload.templateKey = tKey;
      const res = await ApiClient.post<{ success: boolean; screen: ScreenLayoutSpec }>('/api/screens', payload);
      if (res.screen) {
        setScreens(prev => [res.screen, ...prev]);
        setCurrentScreen(res.screen);
        return res.screen;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create screen');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const updateScreen = useCallback(async (id: string, updates: Partial<ScreenLayoutSpec>) => {
    try {
      const res = await ApiClient.put<{ success: boolean; screen: ScreenLayoutSpec }>(`/api/screens/${id}`, updates);
      if (res.screen) {
        setScreens(prev => prev.map(s => (s.id === id ? res.screen : s)));
        if (currentScreen?.id === id) {
          setCurrentScreen(res.screen);
        }
        return res.screen;
      }
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
    try {
      const res = await ApiClient.post<{ success: boolean; screen: ScreenLayoutSpec }>('/api/screens/generate', { prompt, projectId });
      if (res.screen) {
        setScreens(prev => [res.screen, ...prev]);
        setCurrentScreen(res.screen);
        return res.screen;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate layout');
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, [projectId]);

  const generateStitchScreen = useCallback(async (options: {
    prompt: string;
    mode?: 'create' | 'modify';
    screenId?: string;
    selectedCompIds?: string[];
    selectedScreenIds?: string[];
    theme?: string;
    category?: string;
    onStep?: (step: StitchGenerationStep, currentProgress: number) => void;
  }): Promise<ScreenLayoutSpec | null> => {
    setIsGenerating(true);
    setError(null);
    const isModify = options.mode === 'modify';
    try {
      const res = await ApiClient.post<StitchGenerationResponse>('/api/screens/generate-stitch', {
        prompt: options.prompt,
        mode: options.mode || 'create',
        screenId: isModify ? (options.screenId || currentScreen?.id) : undefined,
        existingBoard: isModify ? currentScreen?.board : undefined,
        selectedCompIds: options.selectedCompIds || [],
        selectedScreenIds: options.selectedScreenIds || [],
        projectId,
        theme: options.theme || 'dark',
        category: options.category || 'dashboard'
      });

      if (res.success) {
        if (res.intent === 'DISCUSS') {
          // If discuss mode, update chat history only, NEVER replace or blank out board components
          const updatedChat = res.screen?.chatHistory || (res.chatHistory) || [
            ...(currentScreen?.chatHistory || []),
            { id: `msg_u_${Date.now()}`, role: 'user' as const, text: options.prompt, timestamp: new Date().toISOString() },
            { id: `msg_a_${Date.now()}`, role: 'assistant' as const, text: res.assistantExplanation || res.reply || '', timestamp: new Date().toISOString() }
          ];

          if (currentScreen) {
            const updated: ScreenLayoutSpec = {
              ...currentScreen,
              chatHistory: updatedChat
            };
            setCurrentScreen(updated);
            setScreens(prev => prev.map(s => s.id === updated.id ? updated : s));
            return updated;
          } else if (res.screen) {
            setCurrentScreen(res.screen);
            setScreens(prev => [res.screen, ...prev]);
            return res.screen;
          }
          return null;
        }

        if (res.screen) {
          const fullScreen = res.screen;
          const steps = res.generationSteps || [];

          // Run progressive animation sequence
          if (steps.length > 0) {
            const finalComponents = fullScreen.board.components;
            for (let i = 0; i < steps.length; i++) {
              const step = steps[i];
              setAnimatingStep(step);
              const p = Math.round(((i + 1) / steps.length) * 100);
              setAnimationProgress(p);
              if (options.onStep) options.onStep(step, p);
              
              // Incrementally reveal components
              const partialComps = finalComponents.slice(0, i + 1);
              setCurrentScreen({
                ...fullScreen,
                board: {
                  ...fullScreen.board,
                  components: partialComps
                }
              });
              await new Promise(resolve => setTimeout(resolve, 140));
            }
          }

          // Finalize state
          setScreens(prev => {
            const exists = prev.some(s => s.id === fullScreen.id);
            if (exists) return prev.map(s => s.id === fullScreen.id ? fullScreen : s);
            return [fullScreen, ...prev];
          });
          setCurrentScreen(fullScreen);
          setAnimatingStep(null);
          setAnimationProgress(100);
          return fullScreen;
        }
      }
      return null;
    } catch (err: any) {
      setError(err.message || 'Failed to generate Stitch screen');
      return null;
    } finally {
      setIsGenerating(false);
      setAnimatingStep(null);
    }
  }, [currentScreen, projectId]);

  const exportFigFile = useCallback(async (screenId: string, screenName: string) => {
    try {
      const response = await fetch(`/api/screens/${screenId}/export?format=fig`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('ai_manager_token') || ''}`
        }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${screenName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.fig`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Failed to export .fig file');
      throw err;
    }
  }, []);

  const exportSpecJson = useCallback(async (screenId: string, screenName: string) => {
    try {
      const res = await ApiClient.get<any>(`/api/screens/${screenId}/export?format=json`);
      const blob = new Blob([JSON.stringify(res, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${screenName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Failed to export layout JSON');
      throw err;
    }
  }, []);

  const exportPenpotJson = exportSpecJson;

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
  const addComponent = useCallback((newComp: LayoutComponent, parentId?: string) => {
    setCurrentScreen(prevScreen => {
      if (!prevScreen) return null;
      const addRecursive = (list: LayoutComponent[]): LayoutComponent[] => {
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

  const updateComponent = useCallback((compId: string, updates: Partial<LayoutComponent>, persistImmediately: boolean = false) => {
    setCurrentScreen(prevScreen => {
      if (!prevScreen) return null;
      const updateRecursive = (list: LayoutComponent[]): LayoutComponent[] => {
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
      const deleteRecursive = (list: LayoutComponent[]): LayoutComponent[] => {
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
      const cloneWithNewIds = (comp: LayoutComponent): LayoutComponent => {
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

      const dupRecursive = (list: LayoutComponent[]): LayoutComponent[] => {
        const res: LayoutComponent[] = [];
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

  const sendChatMessage = useCallback(async (screenId: string, message: string) => {
    try {
      const res = await ApiClient.post<{ success: boolean; reply: string; chatHistory: ChatMessage[] }>(`/api/screens/${screenId}/chat`, { message });
      if (res.success && res.chatHistory) {
        setCurrentScreen(prev => prev && prev.id === screenId ? { ...prev, chatHistory: res.chatHistory } : prev);
        setScreens(prev => prev.map(s => s.id === screenId ? { ...s, chatHistory: res.chatHistory } : s));
        return res.reply;
      }
      return null;
    } catch (err: any) {
      console.error('Failed to send chat message:', err);
      return null;
    }
  }, []);

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
    animatingStep,
    animationProgress,
    error,
    fetchScreens,
    selectScreen,
    createScreen,
    updateScreen,
    deleteScreen,
    generateAiLayout,
    generateStitchScreen,
    sendChatMessage,
    exportFigFile,
    exportSpecJson,
    addComponent,
    updateComponent,
    deleteComponent,
    duplicateComponent
  };
}
