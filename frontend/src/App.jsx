import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { StaleBanner } from './components/layout/StaleBanner';
import { ToastProvider } from './components/ui/Toast';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useStore } from './lib/store';

// Pages
import { LoginPage } from './pages/LoginPage';
import { OpsPage } from './pages/OpsPage';
import { ResourcesPage } from './pages/ResourcesPage';
import { AlertsPage } from './pages/AlertsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AIHealthPage } from './pages/AIHealthPage';
import { ReplayPage } from './pages/ReplayPage';
import { ReportPage } from './pages/ReportPage';
import { FieldPage } from './pages/FieldPage';

import { MOCK_INCIDENTS, MOCK_UNITS, MOCK_ALERTS, MOCK_HOSPITALS } from './mocks/fixtures';

// Re-enabled Auth Guard
function ProtectedRoute({ children }) {
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AppShell() {
  const location = useLocation();
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const isOps = location.pathname.startsWith('/ops');
  const isLogin = location.pathname === '/login';

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 overflow-hidden relative">
      {/* Top Navigation Bar */}
      {!isLogin && <Navbar />}

      {/* Main Content Area */}
      <main className={`flex-1 min-h-0 overflow-hidden relative flex flex-col ${isOps || isLogin ? 'h-full' : 'pt-16'}`}>
        {/* Routes */}
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route
            path="/ops"
            element={
              <ProtectedRoute>
                <OpsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resources"
            element={
              <ProtectedRoute>
                <ResourcesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/alerts"
            element={
              <ProtectedRoute>
                <AlertsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <AnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-health"
            element={
              <ProtectedRoute>
                <AIHealthPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/replay"
            element={
              <ProtectedRoute>
                <ReplayPage />
              </ProtectedRoute>
            }
          />
          <Route path="/field" element={<FieldPage />} />
          {/* Default redirect */}
          <Route path="*" element={<Navigate to={isAuthenticated ? "/ops" : "/login"} replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const restoreSession = useStore(s => s.restoreSession);
  useKeyboardShortcuts();

  useEffect(() => {
    // Restore session if user was previously logged in
    restoreSession();

    // Ensure mock data is immediately present for instant preview
    const state = useStore.getState();
    if (!state.incidents || state.incidents.length === 0) {
      useStore.setState({
        incidents: MOCK_INCIDENTS,
        units: MOCK_UNITS,
        alerts: MOCK_ALERTS,
        hospitals: MOCK_HOSPITALS,
        connectionStatus: 'connected',
        selectedIncidentId: null,
      });
    }
  }, [restoreSession]);

  return (
    <BrowserRouter>
      <ToastProvider>
        <AppShell />
      </ToastProvider>
    </BrowserRouter>
  );
}
