import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/shared/context';

export interface AdminUserItem {
  id: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
}

export interface AdminProjectItem {
  projectId: string;
  name: string;
  status: string;
  lastModified: string;
}

export interface AdminOverviewData {
  metrics: {
    totalUsers: number;
    adminCount: number;
    userCount: number;
    totalProjects: number;
    indexedProjects: number;
    totalDbSize: string;
    sqliteFilesCount: number;
  };
  systemHealth: {
    sqlJsEngine: string;
    mongoStore: string;
    encryptionLayer: string;
    jwtAuth: string;
  };
  projects: AdminProjectItem[];
}

export function useAdmin() {
  const { token, isAdmin } = useAuth();
  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAdminData = useCallback(async () => {
    if (!token || !isAdmin) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [overviewRes, usersRes] = await Promise.all([
        fetch('/api/admin/overview', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/admin/users', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (!overviewRes.ok) throw new Error(`Overview fetch failed (${overviewRes.status})`);
      if (!usersRes.ok) throw new Error(`Users fetch failed (${usersRes.status})`);

      const overviewData = await overviewRes.json();
      const usersData = await usersRes.json();

      setOverview(overviewData);
      setUsers(usersData.users || []);
    } catch (err: any) {
      console.error('[useAdmin] Error:', err);
      setError(err.message || 'Failed to load admin panel data');
    } finally {
      setIsLoading(false);
    }
  }, [token, isAdmin]);

  const changeUserRole = async (userId: string, newRole: 'user' | 'admin') => {
    if (!token) return { success: false, error: 'Not authenticated' };
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update role');
      await fetchAdminData();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setActionLoading(null);
    }
  };

  const removeUser = async (userId: string) => {
    if (!token) return { success: false, error: 'Not authenticated' };
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');
      await fetchAdminData();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  return {
    overview,
    users,
    isLoading,
    actionLoading,
    error,
    changeUserRole,
    removeUser,
    refetch: fetchAdminData
  };
}
