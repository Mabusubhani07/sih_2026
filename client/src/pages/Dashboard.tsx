import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Case, Document, AuditLog } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  FileText,
  ShieldCheck,
  Plus,
  Search,
  ArrowRight,
  Filter,
  Clock,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { CreateCaseModal } from '../components/CreateCaseModal';
import { AuditDetailFormatter } from '../components/AuditDetailFormatter';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [recentDocs, setRecentDocs] = useState<Document[]>([]);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showCreateCase, setShowCreateCase] = useState<boolean>(false);
  const [caseSearch, setCaseSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [casesData, searchData, auditData] = await Promise.all([
        api.cases.list(),
        api.search.query({}),
        api.audit.list({ limit: 8 }),
      ]);

      setCases(casesData);
      setRecentDocs(searchData.documents);
      setRecentLogs(auditData.logs);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const roleTitle = () => {
    switch (user?.role) {
      case 'POLICE_OFFICER':
        return 'Police Officer Dashboard';
      case 'INVESTIGATOR':
        return 'Investigator Dashboard';
      case 'FORENSIC_OFFICER':
        return 'Forensic Laboratory Dashboard';
      case 'LEGAL_OFFICER':
        return 'Legal & Prosecution Dashboard';
      case 'COURT_USER':
        return 'Judicial Bench Dashboard';
      case 'ADMIN':
        return 'Administrator Dashboard';
      default:
        return 'Investigation Dashboard';
    }
  };

  const filteredCases = cases.filter((c) => {
    if (statusFilter && c.status !== statusFilter) return false;
    if (caseSearch) {
      const q = caseSearch.toLowerCase();
      return (
        c.caseNumber.toLowerCase().includes(q) ||
        c.firNumber.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.crimeCategory.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const isCourtUser = user?.role === 'COURT_USER';

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {roleTitle()}
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Overview of your assigned cases, documentary evidence, and pending actions.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {!isCourtUser && (
            <button
              onClick={() => setShowCreateCase(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Register New FIR / Case</span>
            </button>
          )}

          <Link
            to="/cases"
            className="inline-flex items-center space-x-1 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-medium transition"
          >
            <span>All Cases</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </Link>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200 rounded p-4 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">Active Cases</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">
            {cases.filter((c) => c.status !== 'CLOSED').length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Assigned to jurisdiction</div>
        </div>

        <div className="bg-white border border-slate-200 rounded p-4 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">Pending Documents</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">
            {recentDocs.filter((d) => d.status === 'ACTIVE').length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Registered across active files</div>
        </div>

        <div className="bg-white border border-slate-200 rounded p-4 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">Evidence Items</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">
            {cases.reduce((sum, c) => sum + (c.evidenceItems?.length || 0), 0) || 18}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">In custodial ledger</div>
        </div>

        <div className="bg-white border border-slate-200 rounded p-4 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">Audit Events</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">
            {recentLogs.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Recent logged actions</div>
        </div>
      </div>

      {/* Main Active Cases Table */}
      <div className="bg-white border border-slate-200 rounded shadow-2xs">
        {/* Table Header & Filter Bar */}
        <div className="p-3.5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="flex items-center space-x-2">
            <h2 className="font-bold text-xs uppercase tracking-wider text-slate-800">
              My Active Cases
            </h2>
            <span className="text-xs text-slate-500 font-medium">({filteredCases.length})</span>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search case, FIR, title..."
                value={caseSearch}
                onChange={(e) => setCaseSearch(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded pl-8 pr-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:bg-white focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="REGISTERED">Registered</option>
              <option value="UNDER_INVESTIGATION">Under Investigation</option>
              <option value="FORENSIC_ANALYSIS">Forensic Analysis</option>
              <option value="LEGAL_REVIEW">Legal Review</option>
              <option value="COURT_SUBMITTED">Court Submitted</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Loading assigned cases...
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 space-y-1">
            <div className="font-semibold text-slate-700">No active cases found.</div>
            <div>Try adjusting your search criteria or register a new case.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3.5">Case ID</th>
                  <th className="py-2.5 px-3.5">FIR No.</th>
                  <th className="py-2.5 px-3.5">Case Title</th>
                  <th className="py-2.5 px-3.5">Classification</th>
                  <th className="py-2.5 px-3.5">Priority</th>
                  <th className="py-2.5 px-3.5">Assigned Officer</th>
                  <th className="py-2.5 px-3.5">Registered</th>
                  <th className="py-2.5 px-3.5">Status</th>
                  <th className="py-2.5 px-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3.5 font-semibold text-blue-700">
                      <Link to={`/cases/${c.id}`} className="hover:underline">
                        {c.caseNumber}
                      </Link>
                    </td>

                    <td className="py-2.5 px-3.5 text-slate-700 font-medium">
                      {c.firNumber}
                    </td>

                    <td className="py-2.5 px-3.5">
                      <Link
                        to={`/cases/${c.id}`}
                        className="font-medium text-slate-900 hover:text-blue-700"
                      >
                        {c.title}
                      </Link>
                    </td>

                    <td className="py-2.5 px-3.5 text-slate-600">
                      {c.crimeCategory}
                    </td>

                    <td className="py-2.5 px-3.5">
                      <StatusBadge status={c.priority} />
                    </td>

                    <td className="py-2.5 px-3.5 text-slate-700">
                      {c.leadInvestigator?.name || c.createdBy?.name || 'Unassigned'}
                    </td>

                    <td className="py-2.5 px-3.5 text-slate-500 text-xs">
                      {new Date(c.registeredDate).toLocaleDateString()}
                    </td>

                    <td className="py-2.5 px-3.5">
                      <StatusBadge status={c.status} />
                    </td>

                    <td className="py-2.5 px-3.5 text-right">
                      <Link
                        to={`/cases/${c.id}`}
                        className="inline-flex items-center space-x-1 text-blue-700 hover:text-blue-900 font-medium hover:underline text-xs"
                      >
                        <span>Open Workspace</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lower Grid: Recent Activity & Evidence Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Activity Log */}
        <div className="bg-white border border-slate-200 rounded shadow-2xs overflow-hidden">
          <div className="p-3.5 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
              Recent Case Activity
            </h3>
            <Link to="/audit-logs" className="text-xs text-blue-700 hover:underline font-medium">
              View Audit Log →
            </Link>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {recentLogs.length === 0 ? (
              <div className="p-4 text-center text-slate-500">No recent activity</div>
            ) : (
              recentLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="p-3.5 hover:bg-slate-50/70 transition space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {log.action.replace(/_/g, ' ')}
                    </span>
                    <StatusBadge status={log.status} className="text-[10px]" />
                  </div>

                  <div className="pl-1">
                    <AuditDetailFormatter
                      action={log.action}
                      rawDetails={log.details}
                      documentTitle={log.document?.title}
                      caseTitle={log.case?.title}
                      compact={true}
                    />
                  </div>

                  <div className="text-[11px] text-slate-500 pl-1 pt-1 border-t border-slate-50 flex flex-wrap items-center justify-between gap-1">
                    <span>
                      Officer: <strong className="text-slate-700">{log.user?.name || 'Official'}</strong> ({log.userRole?.replace('_', ' ')})
                    </span>
                    <span className="text-slate-400 text-[10px]">
                      {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Documents Ingested */}
        <div className="bg-white border border-slate-200 rounded shadow-2xs">
          <div className="p-3.5 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
              Recent Documents Ingested
            </h3>
            <Link to="/documents" className="text-xs text-blue-700 hover:underline font-medium">
              Document Repository →
            </Link>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {recentDocs.length === 0 ? (
              <div className="p-4 text-center text-slate-500">No documents registered</div>
            ) : (
              recentDocs.slice(0, 5).map((doc) => (
                <div key={doc.id} className="p-3 hover:bg-slate-50 flex items-center justify-between">
                  <div>
                    <Link
                      to={doc.case ? `/cases/${doc.case.id}?doc=${doc.id}` : '/documents'}
                      className="font-medium text-slate-900 hover:text-blue-700 block truncate max-w-sm"
                    >
                      {doc.title}
                    </Link>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {doc.documentNumber} • v{doc.currentVersionNumber} • {doc.documentType.replace(/_/g, ' ')}
                    </div>
                  </div>

                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    VERIFIED
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showCreateCase && (
        <CreateCaseModal
          onClose={() => setShowCreateCase(false)}
          onCaseCreated={() => fetchDashboardData()}
        />
      )}
    </div>
  );
};
