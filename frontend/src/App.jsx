import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

// Auth guard (temporarily bypassed for direct preview)
function ProtectedRoute({ children }) {
  return children;
}

export default function App() {
  const restoreSession = useStore(s => s.restoreSession);
  useKeyboardShortcuts();

  useEffect(() => {
    // Ensure authentication token exists so backend API queries succeed
    if (!localStorage.getItem('prahari.token')) {
      useStore.getState().login('commander@prahari.in', 'prahari123').catch(() => {});
    }
    if (!localStorage.getItem('resilio.user') && !localStorage.getItem('prahari.user')) {
      const defaultUser = {
        id: 'usr_001',
        email: 'commander@prahari.in',
        name: 'Cdr. Arjun Shah',
        role: 'COMMANDER'
      };
      localStorage.setItem('resilio.user', JSON.stringify(defaultUser));
      localStorage.setItem('prahari.user', JSON.stringify(defaultUser));
      useStore.setState({ user: defaultUser, isAuthenticated: true });
    }

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

    restoreSession();
  }, [restoreSession]);

  return (
    <BrowserRouter>
      <ToastProvider>
        <div className="h-screen w-screen flex flex-col bg-slate-50 overflow-hidden">
          {/* Top Navigation Bar */}
          <Navbar />

          {/* Main Content Area */}
          <main className="flex-1 min-h-0 overflow-hidden relative flex flex-col">
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
              <Route path="*" element={<Navigate to="/ops" replace />} />
            </Routes>
          </main>
        </div>
      </ToastProvider>
    </BrowserRouter>
  );
}
