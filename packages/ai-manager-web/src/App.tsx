import React, { useState, useEffect } from 'react';
import { Layout, NavRoute } from './components/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { DbManagerPage } from './pages/DbManagerPage';
import { QaPage } from './pages/QaPage';
import { FlowAuditPage } from './pages/FlowAuditPage';
import { GitViewPage } from './pages/GitViewPage';
import { DiagramsPage } from './pages/DiagramsPage';
import { ScreensPage } from './pages/ScreensPage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminPage } from './pages/AdminPage';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');

  // Determine initial route from pathname or hash if provided
  const getInitialRoute = (): NavRoute => {
    const rawPath = window.location.pathname.replace(/^\/+|\/+$/g, '') || window.location.hash.replace('#/', '').replace('#', '');
    if (rawPath === 'git') return 'git-view';
    if (
      [
        'onboarding',
        'dashboard',
        'projects',
        'db-manager',
        'qa',
        'flow-audit',
        'git-view',
        'diagrams',
        'screens',
        'settings',
        'admin'
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
    // Role guard for admin route
    if (route === 'admin' && !isAdmin) {
      setCurrentRoute('dashboard');
      window.history.pushState(null, '', '/dashboard');
      return;
    }
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

  // Show loading spinner during initial session verification
  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-[#1e1e1e] flex flex-col items-center justify-center gap-3">
        <div className="size-8 border-3 border-[#3b82f6] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono text-slate-400">Verifying local session...</span>
      </div>
    );
  }

  // Unauthenticated Route Guard
  if (!isAuthenticated) {
    if (authView === 'register') {
      return (
        <RegisterPage
          onNavigateToLogin={() => setAuthView('login')}
          onSuccess={() => handleNavigate('dashboard')}
        />
      );
    }
    return (
      <LoginPage
        onNavigateToRegister={() => setAuthView('register')}
        onSuccess={() => handleNavigate('dashboard')}
      />
    );
  }

  // Screen 1: Onboarding route does not render the sidebar/topbar layout
  if (currentRoute === 'onboarding') {
    return (
      <OnboardingPage onContinue={() => handleNavigate('dashboard')} />
    );
  }

  const renderContent = () => {
    switch (currentRoute) {
      case 'dashboard':
        return <DashboardPage onNavigate={handleNavigate} />;
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
      case 'flow-audit':
        return <FlowAuditPage />;
      case 'git-view':
        return <GitViewPage projectId={selectedProject} />;
      case 'diagrams':
        return <DiagramsPage projectId={selectedProject} />;
      case 'settings':
        return <SettingsPage />;
      case 'admin':
        return isAdmin ? <AdminPage /> : <DashboardPage onNavigate={handleNavigate} />;
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
