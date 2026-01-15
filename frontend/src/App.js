import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PartsPage } from './pages/PartsPage';
import { PricingPage } from './pages/PricingPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { InquiriesPage } from './pages/InquiriesPage';
import { MultiInquiriesPage } from './pages/MultiInquiriesPage';
import { InventoryManagementPage } from './pages/InventoryManagementPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/UsersPage';
import { BranchesPage } from './pages/BranchesPage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { Toaster } from './components/ui/sonner';
import './App.css';

const PrivateRoute = ({ children, adminOnly = false, superAdminOnly = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== 'admin' && user.role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  if (superAdminOnly && user.role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Layout>
                  <DashboardPage />
                </Layout>
              </PrivateRoute>
            }
          />
          
          <Route
            path="/parts"
            element={
              <PrivateRoute>
                <Layout>
                  <PartsPage />
                </Layout>
              </PrivateRoute>
            }
          />
          
          <Route
            path="/pricing"
            element={
              <PrivateRoute>
                <Layout>
                  <PricingPage />
                </Layout>
              </PrivateRoute>
            }
          />
          
          <Route
            path="/suppliers"
            element={
              <PrivateRoute>
                <Layout>
                  <SuppliersPage />
                </Layout>
              </PrivateRoute>
            }
          />
          
          <Route
            path="/inquiries"
            element={
              <PrivateRoute>
                <Layout>
                  <InquiriesPage />
                </Layout>
              </PrivateRoute>
            }
          />
          
          <Route
            path="/multi-inquiries"
            element={
              <PrivateRoute>
                <Layout>
                  <MultiInquiriesPage />
                </Layout>
              </PrivateRoute>
            }
          />
          
          <Route
            path="/inventory"
            element={
              <PrivateRoute adminOnly>
                <Layout>
                  <InventoryManagementPage />
                </Layout>
              </PrivateRoute>
            }
          />
          
          <Route
            path="/reports"
            element={
              <PrivateRoute>
                <Layout>
                  <ReportsPage />
                </Layout>
              </PrivateRoute>
            }
          />
          
          <Route
            path="/users"
            element={
              <PrivateRoute adminOnly>
                <Layout>
                  <UsersPage />
                </Layout>
              </PrivateRoute>
            }
          />
          
          <Route
            path="/branches"
            element={
              <PrivateRoute adminOnly>
                <Layout>
                  <BranchesPage />
                </Layout>
              </PrivateRoute>
            }
          />
          
          <Route
            path="/settings"
            element={
              <PrivateRoute adminOnly>
                <Layout>
                  <SettingsPage />
                </Layout>
              </PrivateRoute>
            }
          />
          
          <Route
            path="/admin"
            element={
              <PrivateRoute>
                <Layout>
                  <AdminDashboardPage />
                </Layout>
              </PrivateRoute>
            }
          />
          
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" dir="rtl" />
    </AuthProvider>
  );
}

export default App;
