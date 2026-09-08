import { useState, useEffect, useCallback } from 'react';

export interface DashboardStats {
  activeProjects: number;
  indexedProjects: number;
  totalDbSize: string;
  totalDbSizeBytes: number;
  sqliteFilesCount: number;
  connectedRepos: {
    total: number;
    github: number;
    local: number;
  };
  lastSync: string;
  systemHealth: {
    indexerEngine: string;
    groqApi: string;
    sqlJsRuntime: string;
    encryptionLayer: string;
  };
}

export interface ActivityItem {
  id: string;
  projectId: string;
  projectName: string;
  action: string;
  detail: string;
  timestamp: string;
  status: 'success' | 'warning' | 'info';
}

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statsRes, actRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/dashboard/activity')
      ]);

      if (!statsRes.ok) throw new Error(`Stats fetch failed (${statsRes.status})`);
      if (!actRes.ok) throw new Error(`Activity fetch failed (${actRes.status})`);

      const statsData: DashboardStats = await statsRes.json();
      const actData = await actRes.json();

      setStats(statsData);
      setActivities(actData.activities || []);
    } catch (err: any) {
      console.error('[useDashboard] Error:', err);
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    stats,
    activities,
    isLoading,
    error,
    refetch: fetchDashboardData
  };
}
