import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import {
  LayoutDashboard,
  FileText,
  Layers,
  Users,
  BarChart3,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Building2
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/enquiries', label: 'Enquiries', icon: FileText },
  { path: '/stages', label: 'Stage Master', icon: Layers, adminOnly: true },
  { path: '/departments', label: 'Departments', icon: Building2, adminOnly: true },
  { path: '/users', label: 'Users', icon: Users, adminOnly: true },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex min-h-screen bg-zinc-100" data-testid="app-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-zinc-200 
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `} data-testid="sidebar">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-zinc-200">
          <img
            src="https://static.prod-images.emergentagent.com/jobs/d6e2cb86-b645-48e5-932a-9b381cfe43d2/images/1be397fb5f6cb07765db6f4dea6c53ff41f9668b669bd581409e7b6125d29a4f.png"
            alt="Logo"
            className="h-8 w-8"
          />
          <span className="text-lg font-bold tracking-tight text-zinc-900">FabricTrack</span>
          <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1" data-testid="sidebar-nav">
          {NAV_ITEMS.map(item => {
            const active = isActive(item.path);
            // Only show admin-only items to admin
            if (item.adminOnly && user?.role !== 'admin') return null;
            return (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-colors duration-200
                  ${active
                    ? 'bg-zinc-100 text-zinc-900 font-semibold'
                    : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
                  }
                `}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
                {active && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-zinc-200 px-4 py-4" data-testid="sidebar-user">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-sm bg-zinc-900 flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900 truncate">{user?.name}</p>
              <p className="text-xs text-zinc-500 truncate">{user?.role} · {user?.department}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            data-testid="logout-button"
            className="w-full border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
          >
            <LogOut className="w-3 h-3 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-zinc-200 px-6 py-3 flex items-center gap-4" data-testid="top-header">
          <button
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
            data-testid="mobile-menu-button"
          >
            <Menu className="w-5 h-5 text-zinc-600" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <span className="hidden sm:inline">{user?.email}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-x-clip">
          {children}
        </main>
      </div>
    </div>
  );
}
