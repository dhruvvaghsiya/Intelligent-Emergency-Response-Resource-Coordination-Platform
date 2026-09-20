import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { StaleBanner } from './components/layout/StaleBanner';
import { ToastProvider } from './components/ui/Toast';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useStore } from './lib/store';

// Pages
import { HeroPage } from './pages/HeroPage';
import { LoginPage } from './pages/LoginPage';
import { OpsPage } from './pages/OpsPage';
import { ResourcesPage } from './pages/ResourcesPage';
import { AlertsPage } from './pages/AlertsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AIHealthPage } from './pages/AIHealthPage';
import { ReplayPage } from './pages/ReplayPage';
import { ReportPage } from './pages/ReportPage';
import { FieldPage } from './pages/FieldPage';
import { ProfilePage } from './pages/ProfilePage';

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
  const isOps = location.pathname.startsWith('/ops');
  const isLogin = location.pathname === '/login';
  const isHero = location.pathname === '/';

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 overflow-hidden relative">
      {/* Top Navigation Bar */}
      {!isLogin && <Navbar />}

      {/* Main Content Area */}
      <main className={`flex-1 min-h-0 overflow-hidden relative flex flex-col ${isOps || isLogin || isHero ? 'h-full' : 'pt-16'}`}>
        {/* Routes */}
        <Routes>
          <Route path="/" element={<HeroPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/report" element={<ReportPage />} />
          {/* Public read access — no login needed to see live incidents, the map, fleet/hospital
              status, or alerts. Every mutation on these pages is still gated by hasPermission()
              (frontend/src/lib/permissions.js) and enforced again server-side. */}
          <Route path="/ops" element={<OpsPage />} />
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
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
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          {/* Default redirect — the public hero page is home; unknown paths land there. */}
          <Route path="*" element={<Navigate to="/" replace />} />
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
