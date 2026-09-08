import { useState, useEffect, useCallback } from 'react';

export interface ProjectItem {
  projectId: string;
  projectName: string;
  name?: string;
  description?: string;
  rootDir?: string;
  status?: string;
  statusVariant?: 'success' | 'warning' | 'destructive';
  filesCount?: number;
  files?: string | number;
  dbSize?: string;
  lastModified?: string;
  lastSynced?: string;
  metrics?: string;
  isError?: boolean;
}

export function useProjects() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/projects');
      if (!res.ok) {
        throw new Error(`Failed to fetch projects (HTTP ${res.status})`);
      }
      const data = await res.json();
      const list: ProjectItem[] = (data.projects || []).map((p: any) => ({
        projectId: p.projectId || p.name || 'project',
        projectName: p.projectName || p.name || p.projectId || 'Untitled Project',
        name: p.projectName || p.name || p.projectId || 'Untitled Project',
        description: p.description || '',
        rootDir: p.rootDir || `~/dev/${p.projectId || 'project'}`,
        status: p.status || 'Not indexed',
        statusVariant: p.statusVariant || (p.status === 'Error' ? 'destructive' : p.status === 'Syncing' ? 'warning' : p.status === 'Indexed' ? 'success' : 'secondary'),
        filesCount: p.filesCount || null,
        files: p.files || '—',
        dbSize: p.dbSize || '—',
        lastModified: p.lastModified || new Date().toISOString(),
        lastSynced: p.lastSynced || 'Never synced',
        metrics: p.metrics || 'Not indexed',
        isError: p.isError || p.status === 'Error'
      }));

      setProjects(list);
    } catch (err: any) {
      console.error('[useProjects] Fetch error:', err);
      setError(err.message || 'Failed to connect to backend.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createProject = async (projectData: {
    projectId: string;
    projectName: string;
    description?: string;
    rootDir?: string;
  }): Promise<{ success: boolean; error?: string; project?: ProjectItem }> => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(projectData)
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to create project.' };
      }

      await fetchProjects();
      return { success: true, project: data.project };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error creating project.' };
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    isLoading,
    error,
    refetch: fetchProjects,
    createProject
  };
}
