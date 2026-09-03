import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  ShieldCheck,
  Search,
  History,
  Users,
  Building2,
  FolderOpen,
  Scale,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center space-x-2.5 px-3 py-2 rounded text-xs font-medium transition ${
      isActive
        ? 'bg-blue-50 text-blue-800 font-semibold border-l-2 border-blue-700'
        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
    }`;

  return (
    <aside className="w-60 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 hidden md:flex min-h-[calc(100vh-3.5rem)] text-slate-800">
      <div className="p-3 space-y-5">
        {/* Navigation Group 1: General */}
        <div className="space-y-1">
          <NavLink to="/dashboard" className={linkClass}>
            <LayoutDashboard className="w-4 h-4 text-slate-500" />
            <span>Dashboard</span>
          </NavLink>
        </div>

        {/* Navigation Group 2: Cases */}
        <div className="space-y-1">
          <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Cases
          </div>
          <NavLink to="/cases" className={linkClass}>
            <Briefcase className="w-4 h-4 text-slate-500" />
            <span>All Cases</span>
          </NavLink>
        </div>

        {/* Navigation Group 3: Documents */}
        <div className="space-y-1">
          <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Documents
          </div>
          <NavLink to="/documents" className={linkClass}>
            <FileText className="w-4 h-4 text-slate-500" />
            <span>Document Repository</span>
          </NavLink>
        </div>

        {/* Navigation Group 4: Evidence */}
        <div className="space-y-1">
          <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Evidence
          </div>
          <NavLink to="/evidence" className={linkClass}>
            <ShieldCheck className="w-4 h-4 text-slate-500" />
            <span>Evidence Register</span>
          </NavLink>
        </div>

        {/* Navigation Group 5: Discovery Search */}
        <div className="space-y-1">
          <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Search
          </div>
          <NavLink to="/search" className={linkClass}>
            <Search className="w-4 h-4 text-slate-500" />
            <span>Smart Search</span>
          </NavLink>
        </div>

        {/* Navigation Group 6: Governance */}
        <div className="space-y-1">
          <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Audit & Compliance
          </div>
          <NavLink to="/audit-logs" className={linkClass}>
            <History className="w-4 h-4 text-slate-500" />
            <span>{isAdmin ? 'System Audit Log' : 'Activity Log'}</span>
          </NavLink>
        </div>

        {/* Navigation Group 7: Administration */}
        {isAdmin && (
          <div className="space-y-1">
            <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Administration
            </div>
            <NavLink to="/admin/users" className={linkClass}>
              <Users className="w-4 h-4 text-slate-500" />
              <span>Users & Clearances</span>
            </NavLink>
            <NavLink to="/admin/departments" className={linkClass}>
              <Building2 className="w-4 h-4 text-slate-500" />
              <span>Departmental Units</span>
            </NavLink>
          </div>
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/70 text-[11px] text-slate-500">
        <div className="font-semibold text-slate-700">Digital Investigation Platform</div>
        <div className="text-[10px]">Secure Document & Evidence System</div>
      </div>
    </aside>
  );
};
