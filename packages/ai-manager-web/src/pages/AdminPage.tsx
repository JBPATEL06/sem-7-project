import React from 'react';
import { ShieldAlert, Users, FolderKanban, Activity, Trash2, Shield, User, RefreshCw, Server, HardDrive, Database, ShieldCheck } from 'lucide-react';
import { useAdmin } from '../hooks/useAdmin';
import { useAuth } from '../context/AuthContext';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export function AdminPage() {
  const { user: currentUser } = useAuth();
  const { overview, users, isLoading, actionLoading, error, changeUserRole, removeUser, refetch } = useAdmin();

  if (isLoading && !overview) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-neutral-400">
        <RefreshCw className="mr-3 h-6 w-6 animate-spin text-indigo-500" />
        Loading Admin Data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-red-200 shadow-lg backdrop-blur-xl">
          <h2 className="mb-2 flex items-center text-lg font-semibold text-red-400">
            <ShieldAlert className="mr-2 h-5 w-5" />
            Admin Access Error
          </h2>
          <p>{error}</p>
          <button 
            onClick={refetch}
            className="mt-4 rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium hover:bg-red-500/30 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col space-y-6 overflow-y-auto bg-neutral-950 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-100">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-neutral-400">System overview and user management.</p>
        </div>
        <button 
          onClick={refetch}
          className="flex items-center rounded-lg bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-700 transition-colors"
        >
          <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {overview && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-neutral-800/50 bg-neutral-900/50 p-5 shadow-lg backdrop-blur-xl transition-all hover:bg-neutral-900/80">
              <div className="flex items-center text-neutral-400">
                <Users className="mr-2 h-5 w-5 text-indigo-400" />
                <h3 className="text-sm font-medium">Total Users</h3>
              </div>
              <div className="mt-3 flex items-baseline">
                <p className="text-3xl font-semibold text-neutral-100">{overview.metrics.totalUsers}</p>
                <p className="ml-2 text-xs text-neutral-500">({overview.metrics.adminCount} admins)</p>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-800/50 bg-neutral-900/50 p-5 shadow-lg backdrop-blur-xl transition-all hover:bg-neutral-900/80">
              <div className="flex items-center text-neutral-400">
                <FolderKanban className="mr-2 h-5 w-5 text-emerald-400" />
                <h3 className="text-sm font-medium">Projects</h3>
              </div>
              <div className="mt-3 flex items-baseline">
                <p className="text-3xl font-semibold text-neutral-100">{overview.metrics.totalProjects}</p>
                <p className="ml-2 text-xs text-neutral-500">({overview.metrics.indexedProjects} indexed)</p>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-800/50 bg-neutral-900/50 p-5 shadow-lg backdrop-blur-xl transition-all hover:bg-neutral-900/80">
              <div className="flex items-center text-neutral-400">
                <HardDrive className="mr-2 h-5 w-5 text-amber-400" />
                <h3 className="text-sm font-medium">Storage</h3>
              </div>
              <div className="mt-3 flex items-baseline">
                <p className="text-3xl font-semibold text-neutral-100">{overview.metrics.totalDbSize}</p>
                <p className="ml-2 text-xs text-neutral-500">{overview.metrics.sqliteFilesCount} DB files</p>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-800/50 bg-neutral-900/50 p-5 shadow-lg backdrop-blur-xl transition-all hover:bg-neutral-900/80">
              <div className="flex items-center text-neutral-400">
                <Activity className="mr-2 h-5 w-5 text-rose-400" />
                <h3 className="text-sm font-medium">System Health</h3>
              </div>
              <div className="mt-3 flex flex-col space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500">JWT Auth</span>
                  <span className="text-emerald-400">{overview.systemHealth.jwtAuth}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500">Mongo Store</span>
                  <span className={overview.systemHealth.mongoStore === 'Connected' ? "text-emerald-400" : "text-amber-400"}>
                    {overview.systemHealth.mongoStore}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500">SQL.js</span>
                  <span className="text-emerald-400">{overview.systemHealth.sqlJsEngine}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 overflow-hidden shadow-2xl backdrop-blur-xl">
        <div className="border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-neutral-200 flex items-center">
            <Users className="mr-2 h-5 w-5 text-indigo-400" />
            User Management
          </h2>
          <span className="text-xs bg-neutral-800 px-2 py-1 rounded-full text-neutral-400">
            {users.length} registered
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-400">
            <thead className="bg-neutral-900/50 text-xs font-medium uppercase text-neutral-500">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Joined</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800 border-t border-neutral-800">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-neutral-800/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20">
                        {user.role === 'admin' ? <ShieldCheck className="h-4 w-4" /> : <User className="h-4 w-4" />}
                      </div>
                      <div className="ml-3">
                        <div className="font-medium text-neutral-200">
                          {user.email}
                          {currentUser?.id === user.id && (
                            <span className="ml-2 text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">You</span>
                          )}
                        </div>
                        <div className="text-xs text-neutral-500">ID: {user.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                        user.role === 'admin' 
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                          : "bg-neutral-800 text-neutral-300 border border-neutral-700"
                      )}>
                        {user.role.toUpperCase()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      {user.id !== currentUser?.id && (
                        <>
                          <button
                            onClick={() => changeUserRole(user.id, user.role === 'admin' ? 'user' : 'admin')}
                            disabled={actionLoading === user.id}
                            className="rounded p-1.5 text-neutral-500 hover:bg-neutral-800 hover:text-indigo-400 transition-colors disabled:opacity-50"
                            title={`Make ${user.role === 'admin' ? 'User' : 'Admin'}`}
                          >
                            <Shield className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete ${user.email}?`)) {
                                removeUser(user.id);
                              }
                            }}
                            disabled={actionLoading === user.id}
                            className="rounded p-1.5 text-neutral-500 hover:bg-red-500/20 hover:text-red-400 transition-colors disabled:opacity-50"
                            title="Delete User"
                          >
                            {actionLoading === user.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin text-red-400" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-neutral-500">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
