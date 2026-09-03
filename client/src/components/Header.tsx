import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import {
  Shield,
  Bell,
  LogOut,
  ChevronDown,
  User,
  Settings,
  HelpCircle,
  Check,
  Building,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const OFFICER_PROFILES = [
  { role: 'POLICE_OFFICER', title: 'Police Officer', user: 'Inspector Rajesh Sharma', dept: 'Central Police Station' },
  { role: 'INVESTIGATOR', title: 'Investigator', user: 'Senior Inspector Sarah Vance', dept: 'CID Cyber Crime Division' },
  { role: 'FORENSIC_OFFICER', title: 'Forensic Officer', user: 'Dr. K. Raman', dept: 'Forensic Science Laboratory (FSL)' },
  { role: 'LEGAL_OFFICER', title: 'Legal Officer', user: 'Advocate Meera Sen', dept: 'Directorate of Public Prosecution' },
  { role: 'COURT_USER', title: 'Court Authority', user: 'Registrar P. K. Verma', dept: 'Metropolitan Sessions Court' },
  { role: 'ADMIN', title: 'System Administrator', user: 'Director General A. K. Mehra', dept: 'Internal Security Administration' },
];

export const Header: React.FC = () => {
  const { user, logout, switchProfile } = useAuth();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const location = useLocation();

  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') return 'Dashboard';
    if (path.startsWith('/cases/')) return 'Cases / Case Workspace';
    if (path === '/cases') return 'Cases / All Cases';
    if (path === '/documents') return 'Documents / Document Repository';
    if (path === '/evidence') return 'Evidence / Evidence Register';
    if (path === '/search') return 'Search / Smart Search';
    if (path === '/audit-logs') return 'Audit & Compliance / Audit Log';
    if (path === '/admin/users') return 'Administration / Users & Clearances';
    if (path === '/admin/departments') return 'Administration / Departmental Units';
    return 'Dashboard';
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs">
      <div className="px-4 lg:px-6 h-14 flex items-center justify-between gap-4">
        {/* Left: Brand & Breadcrumb */}
        <div className="flex items-center space-x-4">
          <Link to="/dashboard" className="flex items-center space-x-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded bg-blue-700 text-white font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base tracking-tight text-slate-900">DIEMP</span>
              </div>
            </div>
          </Link>

          {/* Breadcrumbs */}
          <div className="hidden md:flex items-center pl-4 border-l border-slate-200 text-xs text-slate-500 font-medium">
            <span>DIEMP</span>
            <span className="mx-2 text-slate-400">/</span>
            <span className="text-slate-900 font-semibold">{getBreadcrumbs()}</span>
          </div>
        </div>

        {/* Right: Actions, Role Switcher, Profile */}
        <div className="flex items-center space-x-3">
          {/* Officer Clearance Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowRoleDropdown(!showRoleDropdown)}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 transition"
              title="Switch officer clearance profile"
            >
              <span className="text-slate-500">Clearance:</span>
              <span className="font-semibold text-slate-900">{user?.role?.replace('_', ' ')}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {showRoleDropdown && (
              <div className="absolute right-0 mt-1.5 w-72 bg-white border border-slate-200 rounded-md shadow-lg py-1.5 z-50 text-xs">
                <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Select Officer Profile
                </div>
                {OFFICER_PROFILES.map((account) => {
                  const isCurrent = user?.role === account.role;
                  return (
                    <button
                      key={account.role}
                      onClick={() => {
                        switchProfile(account.role);
                        setShowRoleDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition ${
                        isCurrent ? 'bg-blue-50 text-blue-800 font-medium' : 'text-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-semibold">{account.title}</div>
                        <div className="text-[11px] text-slate-500">{account.user}</div>
                      </div>
                      {isCurrent && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-1.5 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100 transition"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-1.5 w-80 bg-white border border-slate-200 rounded-md shadow-lg py-2 z-50">
                <div className="px-3 py-1.5 border-b border-slate-100 font-semibold text-xs text-slate-800 flex justify-between items-center">
                  <span>Notifications</span>
                  <span className="text-[11px] text-slate-500 font-normal">{unreadCount} unread</span>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">No active notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => markAsRead(n.id)}
                        className={`p-3 text-xs hover:bg-slate-50 cursor-pointer ${
                          !n.isRead ? 'bg-blue-50/40' : ''
                        }`}
                      >
                        <div className="font-semibold text-slate-900">{n.title}</div>
                        <div className="text-slate-600 text-[11px] mt-0.5">{n.message}</div>
                        <div className="text-slate-400 text-[10px] mt-1">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="relative border-l border-slate-200 pl-3">
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="flex items-center space-x-2 text-left hover:opacity-80 transition"
            >
              <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                {user?.name ? user.name.charAt(0) : 'U'}
              </div>
              <div className="hidden lg:block text-xs">
                <div className="font-semibold text-slate-900 leading-tight">{user?.name}</div>
                <div className="text-[11px] text-slate-500 leading-tight">{user?.role?.replace('_', ' ')}</div>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showProfileDropdown && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-md shadow-lg py-1 z-50 text-xs">
                <div className="px-3 py-2 border-b border-slate-100">
                  <div className="font-semibold text-slate-900">{user?.name}</div>
                  <div className="text-[11px] text-slate-500">{user?.email}</div>
                  <div className="text-[11px] text-slate-500">Badge: {user?.badgeNumber}</div>
                </div>

                <button
                  onClick={logout}
                  className="w-full text-left px-3 py-2 text-rose-700 hover:bg-rose-50 flex items-center space-x-2 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
