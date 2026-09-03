import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Case } from '../types';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { CreateCaseModal } from '../components/CreateCaseModal';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Search,
  Filter,
  Plus,
  Download,
  RefreshCw,
  Building,
  Calendar,
  ChevronRight,
} from 'lucide-react';

export const CasesList: React.FC = () => {
  const { user } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  const fetchCases = async () => {
    setIsLoading(true);
    try {
      const data = await api.cases.list({
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
      });
      setCases(data);
    } catch (err) {
      console.error('Failed to load cases:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [statusFilter, priorityFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCases();
  };

  const handleExportCSV = () => {
    if (cases.length === 0) return;
    const headers = ['Case ID', 'FIR Number', 'Title', 'Classification', 'Police Station', 'Priority', 'Status', 'Registered Date'];
    const rows = cases.map((c) => [
      c.caseNumber,
      c.firNumber,
      `"${c.title.replace(/"/g, '""')}"`,
      c.crimeCategory,
      `"${c.policeStation}"`,
      c.priority,
      c.status,
      new Date(c.registeredDate).toLocaleDateString(),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DIEMP_Cases_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isCourtUser = user?.role === 'COURT_USER';

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Cases
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Official criminal investigation cases, FIR records, and case files.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          {!isCourtUser && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Register New Case</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center space-x-1 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-medium transition shadow-2xs"
            title="Export cases to CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={fetchCases}
            className="p-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded transition shadow-2xs"
            title="Refresh List"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded p-3 shadow-2xs flex flex-col md:flex-row md:items-center gap-2.5 text-xs">
        <form onSubmit={handleSearch} className="flex-1 flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search by Case ID, FIR Number, title, officer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-medium transition"
          >
            Search
          </button>
        </form>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-700 focus:bg-white focus:outline-none"
            >
              <option value="">All</option>
              <option value="REGISTERED">Registered</option>
              <option value="UNDER_INVESTIGATION">Under Investigation</option>
              <option value="FORENSIC_ANALYSIS">Forensic Analysis</option>
              <option value="LEGAL_REVIEW">Legal Review</option>
              <option value="COURT_SUBMITTED">Court Submitted</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          <div className="flex items-center space-x-1">
            <span className="text-slate-500 font-medium">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-700 focus:bg-white focus:outline-none"
            >
              <option value="">All</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Cases Table */}
      <div className="bg-white border border-slate-200 rounded shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Loading investigation cases...
          </div>
        ) : cases.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 space-y-2">
            <Briefcase className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="font-semibold text-slate-700">No cases found</div>
            <div>Adjust your filters or register a new investigation case.</div>
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
                  <th className="py-2.5 px-3.5">Police Station</th>
                  <th className="py-2.5 px-3.5">Assigned Officer</th>
                  <th className="py-2.5 px-3.5">Priority</th>
                  <th className="py-2.5 px-3.5">Status</th>
                  <th className="py-2.5 px-3.5">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cases.map((c) => (
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

                    <td className="py-2.5 px-3.5 text-slate-600">
                      {c.policeStation}
                    </td>

                    <td className="py-2.5 px-3.5 text-slate-700">
                      {c.leadInvestigator?.name || c.createdBy?.name || 'Unassigned'}
                    </td>

                    <td className="py-2.5 px-3.5">
                      <StatusBadge status={c.priority} />
                    </td>

                    <td className="py-2.5 px-3.5">
                      <StatusBadge status={c.status} />
                    </td>

                    <td className="py-2.5 px-3.5 text-slate-500 text-xs">
                      {new Date(c.updatedAt || c.registeredDate).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateCaseModal
          onClose={() => setShowCreateModal(false)}
          onCaseCreated={() => fetchCases()}
        />
      )}
    </div>
  );
};
