import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import api from '../lib/api';
import { startRegistration } from '@simplewebauthn/browser';
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
  Building2,
  UserCircle,
  Shirt,
  Bell,
  Check,
  Fingerprint
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/enquiries', label: 'Enquiries', icon: FileText },
  { path: '/stages', label: 'Stage Master', icon: Layers, adminOnly: true },
  { path: '/departments', label: 'Departments', icon: Building2, adminOnly: true },
  { path: '/customers', label: 'Customers', icon: UserCircle, adminOnly: true },
  { path: '/fabric-types', label: 'Fabric Types', icon: Shirt, adminOnly: true },
  { path: '/users', label: 'Users', icon: Users, adminOnly: true },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.count);
    } catch {}
  }, []);

  useEffect(() => { fetchUnread(); const iv = setInterval(fetchUnread, 30000); return () => clearInterval(iv); }, [fetchUnread]);

  const openNotifs = async () => {
    setShowNotifs(!showNotifs);
    if (!showNotifs) {
      try { const res = await api.get('/notifications'); setNotifications(res.data); } catch {}
    }
  };

  const markRead = async (id) => {
    await api.put(`/notifications/${id}/read`);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await api.put('/notifications/read-all');
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const [biometricStatus, setBiometricStatus] = useState(null);
  const [biometricLoading, setBiometricLoading] = useState(false);

  useEffect(() => {
    if (window.PublicKeyCredential) {
      api.get('/auth/biometric/status').then(res => setBiometricStatus(res.data)).catch(() => {});
    }
  }, []);

  const setupBiometric = async () => {
    setBiometricLoading(true);
    try {
      const optRes = await api.post('/auth/biometric/register-options');
      const options = optRes.data;
      const regResp = await startRegistration({ optionsJSON: options });
      await api.post('/auth/biometric/register-complete', regResp);
      setBiometricStatus({ registered: true, count: (biometricStatus?.count || 0) + 1 });
      localStorage.setItem('fabrictrack_biometric_email', user?.email);
      alert('Biometric registered! You can now use fingerprint/Face ID to login.');
    } catch (err) {
      alert(err.response?.data?.detail || err.message || 'Failed to register biometric');
    } finally {
      setBiometricLoading(false);
    }
  };

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
          {window.PublicKeyCredential && (
            <Button
              variant={biometricStatus?.registered ? "ghost" : "outline"}
              size="sm"
              onClick={setupBiometric}
              disabled={biometricLoading}
              data-testid="biometric-setup-button"
              className={`w-full mt-1.5 ${biometricStatus?.registered ? 'text-green-600 hover:text-green-700' : 'border-zinc-200 text-zinc-600'}`}
            >
              <Fingerprint className="w-3 h-3 mr-2" />
              {biometricLoading ? 'Setting up...' : biometricStatus?.registered ? 'Biometric Active' : 'Setup Fingerprint'}
            </Button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-zinc-200 px-4 sm:px-6 py-3 flex items-center gap-3" data-testid="top-header">
          <button
            className="md:hidden"
            onClick={() => setSidebarOpen(true)}
            data-testid="mobile-menu-button"
          >
            <Menu className="w-5 h-5 text-zinc-600" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3 text-sm text-zinc-500">
            <div className="relative">
              <button onClick={openNotifs} className="relative p-1.5 rounded-sm hover:bg-zinc-100 transition-colors" data-testid="notification-bell">
                <Bell className="w-5 h-5 text-zinc-600" />
                {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center" data-testid="notif-badge">{unreadCount}</span>}
              </button>
              {showNotifs && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />
                  <div className="absolute right-0 sm:right-0 top-10 w-[calc(100vw-2rem)] sm:w-80 max-w-80 bg-white border border-zinc-200 rounded-sm shadow-xl z-50 max-h-96 overflow-hidden" data-testid="notif-dropdown">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 bg-zinc-50">
                      <span className="text-xs font-semibold text-zinc-700">Notifications</span>
                      {unreadCount > 0 && <button onClick={markAllRead} className="text-[10px] text-blue-600 hover:underline" data-testid="mark-all-read">Mark all read</button>}
                    </div>
                    <div className="overflow-y-auto max-h-72">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center text-zinc-400 text-xs">No notifications</div>
                      ) : notifications.map(n => (
                        <div key={n.id} className={`px-3 py-2.5 border-b border-zinc-100 cursor-pointer hover:bg-zinc-50 ${n.is_read ? 'opacity-60' : ''}`} onClick={() => { if (!n.is_read) markRead(n.id); if (n.enquiry_id) { navigate(`/enquiries/${n.enquiry_id}`); setShowNotifs(false); } }} data-testid={`notif-item-${n.id}`}>
                          <p className="text-xs font-semibold text-zinc-900">{n.title}</p>
                          <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2">{n.message}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-zinc-400">{new Date(n.created_at).toLocaleString()}</span>
                            {!n.is_read && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
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
