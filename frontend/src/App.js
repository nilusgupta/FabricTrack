import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import '@/App.css';

// Lazy load heavy pages
const EnquiriesPage = React.lazy(() => import('./pages/EnquiriesPage'));
const EnquiryDetailPage = React.lazy(() => import('./pages/EnquiryDetailPage'));
const StageMasterPage = React.lazy(() => import('./pages/StageMasterPage'));
const UsersPage = React.lazy(() => import('./pages/UsersPage'));
const ReportsPage = React.lazy(() => import('./pages/ReportsPage'));
const DepartmentMasterPage = React.lazy(() => import('./pages/DepartmentMasterPage'));
const CustomerMasterPage = React.lazy(() => import('./pages/CustomerMasterPage'));
const FabricTypeMasterPage = React.lazy(() => import('./pages/FabricTypeMasterPage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
          <p className="text-sm text-zinc-500">Loading...</p>
        </div>
      </div>
    );
  }
  if (user === false) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user && user !== false) return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/enquiries" element={<ProtectedRoute><EnquiriesPage /></ProtectedRoute>} />
            <Route path="/enquiries/:id" element={<ProtectedRoute><EnquiryDetailPage /></ProtectedRoute>} />
            <Route path="/stages" element={<ProtectedRoute><StageMasterPage /></ProtectedRoute>} />
            <Route path="/departments" element={<ProtectedRoute><DepartmentMasterPage /></ProtectedRoute>} />
            <Route path="/customers" element={<ProtectedRoute><CustomerMasterPage /></ProtectedRoute>} />
            <Route path="/fabric-types" element={<ProtectedRoute><FabricTypeMasterPage /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}

export default App;
