import React, { useState, useEffect } from 'react';
import {
  Home,
  LayoutGrid,
  Database,
  ShieldCheck,
  GitCommitHorizontal,
  Settings as SettingsIcon,
  Layers,
  Monitor,
  Bell,
  Moon,
  Sun,
  PanelLeftClose,
  PanelLeftOpen,
  Bot
} from 'lucide-react';
import { useTheme } from '@/shared/context';

export type NavRoute =
  | 'onboarding'
  | 'dashboard'
  | 'chat'
  | 'projects'
  | 'db-manager'
  | 'diagrams'
  | 'screens'
  | 'qa'
  | 'flow-audit'
  | 'git-view'
  | 'settings';

interface LayoutProps {
  currentRoute: NavRoute;
  onNavigate: (route: NavRoute) => void;
  projectName?: string;
  projectPath?: string;
  syncStatus?: string;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  currentRoute,
  onNavigate,
  projectName = 'acme-api',
  projectPath = '~/dev/acme-api',
  syncStatus = 'Synced 2m ago',
  children
}) => {
  const { theme, toggleTheme } = useTheme();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('ai_manager_sidebar_collapsed') === 'true';
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('ai_manager_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Keyboard shortcut Ctrl+B / Cmd+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const baseNavItems: { id: NavRoute; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'chat', label: 'AI Chat', icon: Bot },
    { id: 'projects', label: 'Context Cockpit', icon: LayoutGrid },
    { id: 'db-manager', label: 'DB Manager', icon: Database },
    { id: 'diagrams', label: 'Diagrams Studio', icon: Layers },
    { id: 'screens', label: 'OpenPencil Studio', icon: Monitor },
    { id: 'qa', label: 'QA Diagnostics', icon: ShieldCheck },
    { id: 'git-view', label: 'Git Lineage', icon: GitCommitHorizontal },
    { id: 'settings', label: 'Settings', icon: SettingsIcon }
  ];

  return (
    <div className="bg-background text-foreground w-screen h-screen overflow-hidden flex">
      {/* Fixed Left Sidebar (220px / Collapsible) */}
      <aside
        className={`bg-sidebar border-r border-border flex flex-col h-full z-30 select-none overflow-hidden transition-all duration-200 ${
          isSidebarCollapsed
            ? 'w-0 min-w-0 border-r-0 opacity-0 pointer-events-none'
            : 'w-[220px] min-w-[220px] opacity-100'
        }`}
      >
        {/* App Header Brand */}
        <div className="flex p-4 pb-5 pt-5 items-center justify-between">
          <div
            className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
            onClick={() => onNavigate('dashboard')}
          >
            <div className="rounded-md bg-primary flex justify-center items-center size-8 shadow-sm shrink-0">
              <span className="font-mono font-bold text-primary-foreground text-xs">{`>_`}</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-foreground text-sm tracking-tight truncate">AI Manager</span>
              <span className="text-muted-foreground text-xs truncate">dbci frontend</span>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleSidebar}
            className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors cursor-pointer shrink-0"
            title="Hide Sidebar (Ctrl+B)"
          >
            <PanelLeftClose className="size-4" />
          </button>
        </div>

        {/* Navigation items */}
        <nav className="p-2 flex-1 overflow-y-auto overscroll-contain">
          <ul className="flex flex-col gap-1">
            {baseNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentRoute === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate(item.id)}
                    className={`w-full rounded-lg flex py-2.5 px-3 items-center gap-3 transition-colors text-left cursor-pointer border-l-2 ${
                      isActive
                        ? 'bg-primary/10 border-primary text-primary font-medium'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
                    }`}
                  >
                    <Icon className={`size-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="text-sm">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Workspace status footer */}
        <div className="p-3 border-t border-border/50">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-foreground truncate">Workspace Mode</span>
              <span className="text-[10px] font-mono text-muted-foreground uppercase">Local / Direct Access</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        {/* Fixed Top Bar (64px) */}
        <header className="bg-background border-b border-border flex px-6 justify-between items-center w-full h-16 shrink-0 z-20">
          <div className="flex items-center gap-4">
            {/* Sidebar Toggle Button */}
            <button
              type="button"
              onClick={toggleSidebar}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                isSidebarCollapsed
                  ? 'bg-primary/10 text-primary hover:bg-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
              title={isSidebarCollapsed ? 'Show Sidebar (Ctrl+B)' : 'Hide Sidebar (Ctrl+B)'}
            >
              {isSidebarCollapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
            </button>

            <div className="flex flex-col justify-center">
              <span className="font-bold text-foreground text-sm leading-tight">
                {projectName}
              </span>
              <span className="font-mono text-muted-foreground text-xs leading-tight">
                {projectPath}
              </span>
            </div>
            <div className="rounded-full bg-muted/50 border border-border flex py-1 px-3 items-center gap-2">
              <span className="rounded-full bg-accent size-2 animate-pulse" />
              <span className="text-muted-foreground text-xs">{syncStatus}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 relative">
            <button
              type="button"
              className="transition-colors rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 inline-flex relative justify-center items-center size-9 cursor-pointer"
              title="Notifications"
            >
              <Bell className="size-5" />
              <span className="ring-2 ring-background rounded-full bg-destructive absolute top-1.5 right-1.5 size-2" />
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="transition-colors rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 inline-flex justify-center items-center size-9 cursor-pointer"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? <Moon className="size-5" /> : <Sun className="size-5" />}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className="transition-colors rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 inline-flex justify-center items-center size-9 cursor-pointer"
              title="Settings"
            >
              <SettingsIcon className="size-5" />
            </button>
          </div>
        </header>

        {/* Page Main Content */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
};
