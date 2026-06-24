import { useState, useEffect } from 'react';
import { DataProvider, useData } from './context/DataContext';
import { supabase } from './services/supabaseClient';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { PublicationsManager } from './pages/PublicationsManager';
import { SpecialistsDirectory } from './pages/SpecialistsDirectory';
import { ConsolidatedHistory } from './pages/ConsolidatedHistory';

function MainApp() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const { activeTab, setActiveTab } = useData();

  useEffect(() => {
    // 1. Check if mock session exists
    const mockSession = localStorage.getItem('ocupamor_session_mock');
    if (mockSession === 'true') {
      setIsAuthenticated(true);
      return;
    }

    // 2. Check real Supabase session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkSession();

    // 3. Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem('ocupamor_session_mock');
    localStorage.removeItem('ocupamor_readonly');
    await supabase.auth.signOut();
    setIsAuthenticated(false);
  };

  // While checking auth status
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-brand-moradoDesarrollo border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Cargando aplicación...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  // Render active tab view
  const renderTabContent = () => {
    switch (activeTab) {
      case 'especialistas':
        return <SpecialistsDirectory />;
      case 'historial':
        return <ConsolidatedHistory />;
      case 'planificador':
      default:
        return <PublicationsManager />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout}>
      {renderTabContent()}
    </Layout>
  );
}

function App() {
  return (
    <DataProvider>
      <MainApp />
    </DataProvider>
  );
}

export default App;
