import { useState, useEffect, useCallback } from 'react';
import { ApiClient } from '@/shared/api';

export interface Diagram {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  type: 'architecture' | 'er_diagram' | 'activity_flow' | 'scratchpad';
  elements: any[];
  appState?: {
    viewBackgroundColor?: string;
    currentItemFontFamily?: number;
    theme?: 'light' | 'dark';
    gridSize?: number | null;
  };
  files?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export function useDiagrams(projectId: string = 'acme-api') {
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [activeDiagram, setActiveDiagram] = useState<Diagram | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all diagrams for active project
  const fetchDiagrams = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await ApiClient.get<{ diagrams: Diagram[]; total: number }>(
        `/api/diagrams?projectId=${encodeURIComponent(projectId)}`
      );
      setDiagrams(data.diagrams || []);

      // If activeDiagram is set, refresh its data, otherwise pick the first one
      if (data.diagrams && data.diagrams.length > 0) {
        setActiveDiagram((prev) => {
          if (!prev) return data.diagrams[0];
          const found = data.diagrams.find((d) => d.id === prev.id);
          return found || data.diagrams[0];
        });
      } else {
        setActiveDiagram(null);
      }
    } catch (err: any) {
      console.error('[useDiagrams] Error fetching diagrams:', err.message);
      setError(err.message || 'Failed to load diagrams');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchDiagrams();
  }, [fetchDiagrams]);

  // Create new diagram
  const createDiagram = useCallback(
    async (name: string, type: Diagram['type'] = 'architecture', initialElements: any[] = [], initialXml?: string) => {
      try {
        setIsSaving(true);
        setError(null);
        const payload: any = {
          projectId,
          name,
          type,
          elements: initialElements,
          appState: { viewBackgroundColor: '#1e1e24', theme: 'dark' }
        };
        if (initialXml) {
          payload.files = { xml: initialXml };
        }
        const res = await ApiClient.post<{ message: string; diagram: Diagram }>('/api/diagrams', payload);

        if (res.diagram) {
          setDiagrams((prev) => [res.diagram, ...prev]);
          setActiveDiagram(res.diagram);
          return res.diagram;
        }
        throw new Error('Failed to create diagram');
      } catch (err: any) {
        setError(err.message || 'Create diagram failed');
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [projectId]
  );

  // Save / Update diagram elements
  const saveDiagram = useCallback(
    async (id: string, elements: any[], appState?: any, files?: any, name?: string) => {
      try {
        setIsSaving(true);
        const updates: any = { elements };
        if (appState) updates.appState = appState;
        if (files) updates.files = files;
        if (name) updates.name = name;

        const res = await ApiClient.put<{ message: string; diagram: Diagram }>(`/api/diagrams/${id}`, updates);

        if (res.diagram) {
          setDiagrams((prev) => prev.map((d) => (d.id === id ? res.diagram : d)));
          setActiveDiagram(res.diagram);
          return res.diagram;
        }
      } catch (err: any) {
        console.error('[useDiagrams] Save error:', err.message);
        setError(err.message || 'Save diagram failed');
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  // Delete diagram
  const deleteDiagram = useCallback(async (id: string) => {
    try {
      setIsSaving(true);
      await ApiClient.delete(`/api/diagrams/${id}`);
      setDiagrams((prev) => {
        const remaining = prev.filter((d) => d.id !== id);
        setActiveDiagram(remaining.length > 0 ? remaining[0] : null);
        return remaining;
      });
    } catch (err: any) {
      console.error('[useDiagrams] Delete error:', err.message);
      setError(err.message || 'Delete diagram failed');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Import Excalidraw JSON
  const importDiagramJson = useCallback(
    async (jsonData: any, defaultName: string = 'Imported Diagram') => {
      const elements = jsonData.elements || [];
      const appState = jsonData.appState || { viewBackgroundColor: '#1e1e24', theme: 'dark' };
      const files = jsonData.files || {};
      const name = jsonData.name || defaultName;

      return await createDiagram(name, 'architecture', elements);
    },
    [createDiagram]
  );

  // Generate AI diagram
  const generateAiDiagram = useCallback(
    async (prompt: string, type: Diagram['type'] = 'architecture', name?: string) => {
      try {
        setIsSaving(true);
        setError(null);
        const res = await ApiClient.post<{ success: boolean; message: string; diagram: Diagram }>('/api/diagrams/generate-ai', {
          projectId,
          prompt,
          type,
          name
        });

        if (res.diagram) {
          setDiagrams((prev) => [res.diagram, ...prev]);
          setActiveDiagram(res.diagram);
          return res.diagram;
        }
        throw new Error(res.message || 'Failed to generate AI diagram');
      } catch (err: any) {
        console.error('[useDiagrams] AI Generation error:', err.message);
        setError(err.message || 'AI diagram generation failed');
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [projectId]
  );

  return {
    diagrams,
    activeDiagram,
    setActiveDiagram,
    isLoading,
    isSaving,
    error,
    createDiagram,
    generateAiDiagram,
    saveDiagram,
    deleteDiagram,
    importDiagramJson,
    refetch: fetchDiagrams
  };
}
