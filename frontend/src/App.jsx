import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
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

// Auth guard — redirects to /login if not authenticated
function ProtectedRoute({ children }) {
  const isAuthenticated = useStore(s => s.isAuthenticated);
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const isLogin = location.pathname === '/login';
  const isField = location.pathname.startsWith('/field');
  const isOps = location.pathname.startsWith('/ops');
  const isAuthenticated = useStore(s => s.isAuthenticated);
  const restoreSession = useStore(s => s.restoreSession);

  useEffect(() => {
    restoreSession?.();
  }, [restoreSession]);

  // Once auth resolves, redirect from /login → /ops
  useEffect(() => {
    if (isAuthenticated && isLogin) {
      navigate('/ops', { replace: true });
    }
  }, [isAuthenticated, isLogin, navigate]);

  const showNavbar = !isLogin && !isField;

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 overflow-hidden relative">
      {showNavbar && <Navbar />}
      <main className={`flex-1 min-h-0 overflow-hidden relative flex flex-col ${isOps || isLogin || isField ? 'h-full' : 'pt-16'}`}>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/field" element={<FieldPage />} />

          {/* Protected */}
          <Route path="/ops" element={<ProtectedRoute><OpsPage /></ProtectedRoute>} />
          <Route path="/resources" element={<ProtectedRoute><ResourcesPage /></ProtectedRoute>} />
          <Route path="/alerts" element={<ProtectedRoute><AlertsPage /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
          <Route path="/ai-health" element={<ProtectedRoute><AIHealthPage /></ProtectedRoute>} />
          <Route path="/replay" element={<ProtectedRoute><ReplayPage /></ProtectedRoute>} />

          {/* Default: redirect to login or ops depending on auth */}
          <Route path="*" element={<Navigate to={isAuthenticated ? '/ops' : '/login'} replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  useKeyboardShortcuts();

  return (
    <BrowserRouter>
      <ToastProvider>
        <AppShell />
      </ToastProvider>
    </BrowserRouter>
  );
}
