import React, { useState, useEffect } from 'react';
import { Layout, NavRoute } from './components/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { DbManagerPage } from './pages/DbManagerPage';
import { ValidatorPage } from './pages/ValidatorPage';
import { QaPage } from './pages/QaPage';
import { FlowAuditPage } from './pages/FlowAuditPage';
import { GitViewPage } from './pages/GitViewPage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminPage } from './pages/AdminPage';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');

  // Determine initial route from pathname or hash if provided
  const getInitialRoute = (): NavRoute => {
    const path = window.location.pathname.replace('/', '') || window.location.hash.replace('#/', '').replace('#', '');
    if (
      [
        'onboarding',
        'dashboard',
        'projects',
        'db-manager',
        'validator',
        'qa',
        'flow-audit',
        'git-view',
        'settings',
        'admin'
      ].includes(path)
    ) {
      return path as NavRoute;
    }
    return 'dashboard';
  };

  const [currentRoute, setCurrentRoute] = useState<NavRoute>(getInitialRoute);
  const [selectedProject, setSelectedProject] = useState('acme-api');

  const handleNavigate = (route: NavRoute) => {
    // Role guard for admin route
    if (route === 'admin' && !isAdmin) {
      setCurrentRoute('dashboard');
      window.history.pushState(null, '', '/dashboard');
      return;
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

  // Show loading spinner during initial session verification
  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center gap-3">
        <div className="size-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono text-muted-foreground">Verifying local session...</span>
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
        return (
          <ProjectsPage
            onSelectProject={(id) => setSelectedProject(id)}
            selectedProjectId={selectedProject}
          />
        );
      case 'db-manager':
        return <DbManagerPage projectId={selectedProject} />;
      case 'validator':
        return <ValidatorPage />;
      case 'qa':
        return <QaPage projectId={selectedProject} />;
      case 'flow-audit':
        return <FlowAuditPage />;
      case 'git-view':
        return <GitViewPage />;
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
