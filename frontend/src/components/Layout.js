import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from "../contexts/AuthContext";
import {
  LayoutDashboard,
  Package,
  DollarSign,
  Users,
  Building2,
  FileText,
  LogOut,
  Menu,
  X,
  TrendingUp,
  Settings,
  Shield
} from 'lucide-react';
import { Button } from './ui/button';

export const Layout = ({ children }) => {
  const { user, company, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isSuperAdmin = user?.role === 'super_admin';
  
  // Get company name - use company from context or fallback to Tas'eer
  const companyName = company?.name || 'تسعيّر';
  const companyColor = company?.primary_color || '#0F172A';

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'لوحة التحكم', roles: ['admin', 'employee', 'super_admin'] },
    { path: '/parts', icon: Package, label: 'إدارة القطع', roles: ['admin', 'employee', 'super_admin'] },
    { path: '/pricing', icon: DollarSign, label: 'التسعير', roles: ['admin', 'employee', 'super_admin'] },
    { path: '/suppliers', icon: TrendingUp, label: 'الموردين', roles: ['admin', 'employee', 'super_admin'] },
    { path: '/multi-inquiries', icon: FileText, label: 'استفسارات العملاء', roles: ['admin', 'employee', 'super_admin'] },
    { path: '/inventory', icon: Package, label: 'إدارة المخزون', roles: ['admin', 'super_admin'] },
    { path: '/reports', icon: TrendingUp, label: 'التقارير', roles: ['admin', 'employee', 'super_admin'] },
    { path: '/users', icon: Users, label: 'المستخدمين', roles: ['admin', 'super_admin'] },
    { path: '/branches', icon: Building2, label: 'الفروع', roles: ['admin', 'super_admin'] },
    { path: '/settings', icon: Settings, label: 'الإعدادات', roles: ['admin', 'super_admin'] },
    { path: '/admin', icon: Building2, label: 'إدارة النظام', roles: ['super_admin'] },
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(user?.role));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 right-0 h-full bg-primary text-primary-foreground w-64 transform transition-transform duration-200 ease-in-out z-50 ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-6 border-b border-white/10">
            <h1 className="text-2xl font-bold">{companyName}</h1>
            <p className="text-sm text-gray-300 mt-1">نظام إدارة التسعير</p>
            {isSuperAdmin && (
              <span className="inline-block mt-2 px-2 py-1 bg-accent text-white text-xs rounded">
                Super Admin
              </span>
            )}
          </div>

          {/* User Info */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white font-bold">
                {user?.full_name?.charAt(0)}
              </div>
              <div>
                <p className="font-medium text-sm">{user?.full_name}</p>
                <p className="text-xs text-gray-300">
                  {isAdmin ? 'مدير النظام' : 'موظف'}
                </p>
                {user?.branch_name && (
                  <p className="text-xs text-gray-400">{user.branch_name}</p>
                )}
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <ul className="space-y-2">
              {filteredMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      data-testid={`nav-${item.path.slice(1)}`}
                      className={`flex items-center gap-3 px-4 py-3 rounded-md transition-smooth hover-lift ${
                        isActive
                          ? 'bg-accent text-white'
                          : 'text-gray-300 hover:bg-white/10 hover:text-white'
                      }`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-white/10">
            <Button
              data-testid="logout-button"
              onClick={handleLogout}
              variant="ghost"
              className="w-full flex items-center justify-start gap-3 text-gray-300 hover:text-white hover:bg-white/10"
            >
              <LogOut className="w-5 h-5" />
              <span>تسجيل الخروج</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="md:mr-64">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b sticky top-0 z-30 px-4 py-3">
          <div className="flex items-center justify-between">
            <Button
              data-testid="mobile-menu-button"
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X /> : <Menu />}
            </Button>
            <h1 className="text-lg font-bold text-primary">{companyName}</h1>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};