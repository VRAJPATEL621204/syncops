import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  Users,
  AlertTriangle,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Building2,
  Bell,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

const DashboardLayout = ({ children, fullHeight = false }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const sidebarRef = useRef(null);
  const profileRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin, isManager } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNavItems = () => {
    const baseItems = [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
      { label: 'Incidents', icon: AlertTriangle, href: '/incidents' },
      { label: 'Chat', icon: MessageSquare, href: '/chat' },
      { label: 'Teams', icon: Users, href: '/teams' },
    ];


    if (isAdmin()) {
      baseItems.push(
        { label: 'Organization', icon: Building2, href: '/organization' }
      );
    }

    // Settings available to all roles
    baseItems.push({ label: 'Settings', icon: Settings, href: '/settings' });

    return baseItems;
  };

  const navItems = getNavItems();

  const isActive = (href) => location.pathname === href;

  return (
    <div className="min-h-screen bg-[hsl(222,47%,5%)] flex">
      {/* Sidebar - Desktop (Expandable on hover) */}
      <aside 
        ref={sidebarRef}
        onMouseEnter={() => setIsSidebarExpanded(true)}
        onMouseLeave={() => setIsSidebarExpanded(false)}
        className={`hidden lg:flex flex-col bg-[hsl(222,47%,6%)] border-r border-[hsl(217,33%,12%)] fixed h-full z-40 transition-all duration-300 ease-in-out ${
          isSidebarExpanded ? 'w-[210px]' : 'w-[72px]'
        }`}
      >
        {/* Logo */}
        <div className="h-[72px] flex items-center justify-center border-b border-[hsl(217,33%,12%)]">
          <Link to="/dashboard" className="flex items-center justify-center">
            <img
              src="/logo.png"
              alt="SyncOps"
              className="rounded-xl object-contain"
              style={{
                width: '52px',
                height: '52px',
                transform: isSidebarExpanded ? 'scale(1.54)' : 'scale(1)',
                transition: 'transform 300ms ease-in-out',
              }}
            />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-5 space-y-1 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => (
            <div key={item.label} className={`px-3 ${
              isSidebarExpanded ? '' : 'flex justify-center'
            }`}>
              <Link
                to={item.href}
                title={item.label}
                className={`flex items-center h-11 rounded-xl transition-all duration-200 ${
                  isSidebarExpanded ? 'gap-3 px-4 w-full' : 'justify-center w-11'
                } ${
                  isActive(item.href)
                    ? 'bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 text-cyan-400 border border-cyan-500/30'
                    : 'text-[hsl(215,20%,55%)] hover:text-[hsl(210,40%,98%)] hover:bg-[hsl(217,33%,15%)]/50'
                }`}
              >
                <item.icon className="w-5 h-5 shrink-0" strokeWidth={1.5} />
                <span className={`text-[15px] font-medium whitespace-nowrap transition-all duration-300 ${
                  isSidebarExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'
                }`}>
                  {item.label}
                </span>
              </Link>
            </div>
          ))}
        </nav>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[hsl(222,47%,6%)] border-r border-[hsl(217,33%,12%)] transform transition-transform duration-300 ease-in-out lg:hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-[hsl(217,33%,12%)]">
          <Link to="/dashboard" className="flex items-center gap-3">
            <img src="/logo.png" alt="SyncOps" className="w-8 h-8 rounded-lg object-contain" />
            <span className="text-lg font-semibold text-[hsl(210,40%,98%)] tracking-tight">SyncOps</span>
          </Link>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 rounded-lg hover:bg-[hsl(217,33%,12%)] transition-colors"
          >
            <X className="w-5 h-5 text-[hsl(215,20%,55%)]" />
          </button>
        </div>

        <nav className="p-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              onClick={() => setIsSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive(item.href)
                  ? 'bg-gradient-to-r from-cyan-500/15 to-transparent text-cyan-400 border-l-2 border-cyan-500'
                  : 'text-[hsl(215,20%,55%)] hover:text-[hsl(210,40%,98%)] hover:bg-[hsl(217,33%,12%)]/50'
              }`}
            >
              <item.icon className="w-[18px] h-[18px]" strokeWidth={1.5} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-[hsl(217,33%,12%)]">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-red-400/90 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-[18px] h-[18px]" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300 ease-in-out ${
        isSidebarExpanded ? 'lg:ml-[210px]' : 'lg:ml-[72px]'
      }`}>
        {/* Top Header - Desktop */}
        <header className="hidden lg:flex h-16 items-center justify-between px-6 border-b border-[hsl(217,33%,12%)] bg-[hsl(222,47%,5%)]/80 backdrop-blur-xl sticky top-0 z-30">
          {/* Brand */}
          <span className="text-xl font-bold text-[hsl(210,40%,98%)] tracking-tight">SyncOps</span>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <button 
              className="relative p-2 rounded-lg text-[hsl(215,20%,55%)] hover:text-[hsl(210,40%,98%)] hover:bg-[hsl(217,33%,12%)]/50 transition-colors"
            >
              <Bell className="w-[18px] h-[18px]" />
            </button>

            {/* User Menu Trigger */}
            <div className="relative" ref={profileRef}>
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-[hsl(217,33%,12%)]/50 transition-colors"
              >
                <div className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 flex items-center justify-center border border-cyan-500/30">
                  {user?.profileImage ? (
                    <img src={user.profileImage} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-cyan-400 text-xs font-semibold">
                      {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  )}
                </div>
                <ChevronDown className={`w-4 h-4 text-[hsl(215,20%,55%)] transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              {isProfileOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-[hsl(222,47%,7%)] rounded-xl border border-[hsl(217,33%,15%)] shadow-2xl shadow-black/50 overflow-hidden z-50 animate-fade-in">
                  <div className="px-4 py-3 border-b border-[hsl(217,33%,12%)]">
                    <p className="text-sm font-medium text-[hsl(210,40%,98%)]">{user?.fullName}</p>
                    <p className="text-xs text-[hsl(215,20%,55%)] capitalize">{user?.role}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      to="/settings"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-[hsl(215,20%,55%)] hover:bg-[hsl(217,33%,12%)] hover:text-[hsl(210,40%,98%)] transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400/90 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="lg:hidden h-14 bg-[hsl(222,47%,6%)] border-b border-[hsl(217,33%,12%)] flex items-center justify-between px-4 sticky top-0 z-30">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-[hsl(217,33%,12%)] transition-colors"
          >
            <Menu className="w-5 h-5 text-[hsl(215,20%,55%)]" />
          </button>
          <Link to="/dashboard" className="flex items-center gap-2">
            <img src="/logo.png" alt="SyncOps" className="w-7 h-7 rounded-lg object-contain" />
            <span className="text-base font-semibold text-[hsl(210,40%,98%)]">SyncOps</span>
          </Link>
          <div className="w-9" />
        </header>

        <main className={`flex-1 min-h-0 ${fullHeight ? 'overflow-hidden' : 'p-4 lg:p-6 overflow-y-auto'}`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
