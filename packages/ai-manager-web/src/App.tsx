import React, { useState, useEffect } from 'react';
import { Layout, NavRoute } from '@/shared/components';
import { AuthProvider } from '@/shared/context';
import { DashboardPage } from '@/features/dashboard';
import { ProjectsPage, ProjectDetailPage } from '@/features/cockpit';
import { DbManagerPage } from '@/features/db-manager';
import { QaPage } from '@/features/qa';
import { GitViewPage } from '@/features/git';
import { DiagramsPage } from '@/features/diagrams';
import { ScreensPage } from '@/features/screens';
import { SettingsPage } from '@/features/settings';
import { ChatPage } from '@/features/chat';

const AppContent: React.FC = () => {
  // Determine initial route from pathname or hash if provided
  const getInitialRoute = (): NavRoute => {
    const rawPath = window.location.pathname.replace(/^\/+|\/+$/g, '') || window.location.hash.replace('#/', '').replace('#', '');
    if (rawPath === 'git') return 'git-view';
    if (
      [
        'dashboard',
        'chat',
        'projects',
        'db-manager',
        'qa',
        'git-view',
        'diagrams',
        'screens',
        'settings'
      ].includes(rawPath)
    ) {
      return rawPath as NavRoute;
    }
    return 'dashboard';
  };

  const [currentRoute, setCurrentRoute] = useState<NavRoute>(getInitialRoute);
  const [selectedProject, setSelectedProject] = useState('acme-api');
  const [viewingProjectDetailId, setViewingProjectDetailId] = useState<string | null>(null);

  const handleNavigate = (route: NavRoute) => {
    // If navigating to projects directly, clear detail view unless specifically requested
    if (route !== 'projects') {
      setViewingProjectDetailId(null);
    }
    setCurrentRoute(route);
    window.history.pushState(null, '', `/${route}`);
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(getInitialRoute());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Screens Studio: Render full-bleed exact OpenPencil UI directly
  if (currentRoute === 'screens') {
    return (
      <ScreensPage
        selectedProject={{ id: selectedProject, name: selectedProject }}
        onNavigateDashboard={() => handleNavigate('dashboard')}
      />
    );
  }

  const renderContent = () => {
    switch (currentRoute) {
      case 'dashboard':
        return <DashboardPage onNavigate={handleNavigate} />;
      case 'chat':
        return <ChatPage projectId={selectedProject} />;
      case 'projects':
        if (viewingProjectDetailId) {
          return (
            <ProjectDetailPage
              projectId={viewingProjectDetailId}
              onBack={() => setViewingProjectDetailId(null)}
              onNavigate={handleNavigate}
              onProjectDeleted={(id) => {
                if (selectedProject === id) {
                  setSelectedProject('acme-api');
                }
                setViewingProjectDetailId(null);
              }}
            />
          );
        }
        return (
          <ProjectsPage
            onSelectProject={(id) => setSelectedProject(id)}
            onOpenProject={(id) => setViewingProjectDetailId(id)}
            selectedProjectId={selectedProject}
          />
        );
      case 'db-manager':
        return <DbManagerPage projectId={selectedProject} />;
      case 'qa':
        return <QaPage projectId={selectedProject} />;
      case 'git-view':
        return <GitViewPage projectId={selectedProject} />;
      case 'diagrams':
        return <DiagramsPage projectId={selectedProject} />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage onNavigate={handleNavigate} />;
    }
  };

  return (
    <Layout
      currentRoute={currentRoute}
      onNavigate={handleNavigate}
      projectName={selectedProject}
      projectPath={`~/dev/${selectedProject}`}
    >
      {renderContent()}
    </Layout>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
