import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Topbar } from './components/layout/Topbar';
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

// Auth guard
function ProtectedRoute({ children }) {
  const isAuthenticated = useStore(s => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const isAuthenticated = useStore(s => s.isAuthenticated);
  useKeyboardShortcuts();

  return (
    <BrowserRouter>
      <ToastProvider>
        <div className="h-screen w-screen flex flex-col bg-canvas overflow-hidden">
          {/* Topbar — shown when authenticated */}
          {isAuthenticated && <Topbar />}
          {isAuthenticated && <StaleBanner />}

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
            <Route path="*" element={<Navigate to={isAuthenticated ? '/ops' : '/login'} replace />} />
          </Routes>
        </div>
      </ToastProvider>
    </BrowserRouter>
  );
}
