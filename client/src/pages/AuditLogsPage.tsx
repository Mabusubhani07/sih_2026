import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AuditLog } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { AuditDetailFormatter } from '../components/AuditDetailFormatter';
import { History, Search, RefreshCw, X, Shield, Eye, Calendar, Filter } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionFilter, setActionFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await api.audit.list({
        action: actionFilter || undefined,
        limit: 100,
      });
      const filtered = statusFilter ? data.logs.filter((l) => l.status === statusFilter) : data.logs;
      setLogs(filtered);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Audit & Compliance
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Immutable, append-only chronological ledger of all document, case, and system security transactions.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded transition shadow-2xs self-start sm:self-auto"
          title="Refresh Log"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded p-3 shadow-2xs flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center space-x-1.5">
          <span className="text-slate-500 font-medium">Action:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-700 focus:bg-white focus:outline-none"
          >
            <option value="">All Actions</option>
            <option value="LOGIN_SUCCESS">LOGIN SUCCESS</option>
            <option value="DOCUMENT_UPLOADED">DOCUMENT UPLOADED</option>
            <option value="DOCUMENT_VIEWED">DOCUMENT VIEWED</option>
            <option value="DOCUMENT_DOWNLOADED">DOCUMENT DOWNLOADED</option>
            <option value="DOCUMENT_SHARED">DOCUMENT SHARED</option>
            <option value="VERSION_CREATED">VERSION CREATED</option>
            <option value="INTEGRITY_CHECK">INTEGRITY CHECK</option>
            <option value="AI_SUMMARY_GENERATED">AI SUMMARY GENERATED</option>
          </select>
        </div>

        <div className="flex items-center space-x-1.5">
          <span className="text-slate-500 font-medium">Result:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-700 focus:bg-white focus:outline-none"
          >
            <option value="">All Results</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="DENIED">DENIED (403)</option>
            <option value="FAILURE">FAILURE</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-slate-200 rounded shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Loading audit records...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No audit records match the current filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3.5">Timestamp</th>
                  <th className="py-2.5 px-3.5">User</th>
                  <th className="py-2.5 px-3.5">Role</th>
                  <th className="py-2.5 px-3.5">Action</th>
                  <th className="py-2.5 px-3.5">Resource / Document</th>
                  <th className="py-2.5 px-3.5">Case Reference</th>
                  <th className="py-2.5 px-3.5">Result</th>
                  <th className="py-2.5 px-3.5 text-right">Inspection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3.5 font-mono text-[11px] text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>

                    <td className="py-2.5 px-3.5 font-medium text-slate-900">
                      {log.user?.name || 'System / Anonymous'}
                    </td>

                    <td className="py-2.5 px-3.5 text-slate-600 text-[11px]">
                      {log.userRole?.replace('_', ' ')}
                    </td>

                    <td className="py-2.5 px-3.5 font-mono text-[11px] font-semibold text-slate-800">
                      {log.action}
                    </td>

                    <td className="py-2.5 px-3.5 text-slate-700 max-w-xs truncate">
                      {log.document?.title || (() => {
                        if (!log.details) return '—';
                        try {
                          const p = JSON.parse(log.details);
                          return p.title || p.documentNumber || p.fileName || p.caseNumber || log.details.slice(0, 40);
                        } catch {
                          return log.details.slice(0, 40);
                        }
                      })()}
                    </td>

                    <td className="py-2.5 px-3.5 font-medium text-blue-700">
                      {log.case?.caseNumber || '—'}
                    </td>

                    <td className="py-2.5 px-3.5">
                      <StatusBadge status={log.status} className="text-[10px]" />
                    </td>

                    <td className="py-2.5 px-3.5 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium transition"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-md shadow-xl border border-slate-300 w-full max-w-lg overflow-hidden text-xs">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Audit Transaction Record
                </h3>
                <p className="text-[11px] text-slate-500">
                  Event ID: {selectedLog.eventId}
                </p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 font-mono text-[11px]">
              <div className="flex justify-between border-b border-slate-100 pb-1.5 font-sans">
                <span className="text-slate-500">Action:</span>
                <strong className="text-slate-900 font-mono">{selectedLog.action}</strong>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5 font-sans">
                <span className="text-slate-500">Official User:</span>
                <span className="text-slate-800">{selectedLog.user?.name || 'Anonymous'} ({selectedLog.userRole})</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5 font-sans">
                <span className="text-slate-500">Result:</span>
                <StatusBadge status={selectedLog.status} />
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="text-slate-500">Timestamp:</span>
                <span className="text-slate-800">{new Date(selectedLog.timestamp).toISOString()}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="text-slate-500">IP Address:</span>
                <span className="text-slate-800">{selectedLog.ipAddress || '127.0.0.1'}</span>
              </div>

              {selectedLog.details && (
                <div className="pt-2 font-sans">
                  <span className="text-slate-500 block mb-1 font-medium">Recorded Event Parameters:</span>
                  <div className="bg-slate-50 p-3 border border-slate-200 rounded text-slate-800 break-words">
                    <AuditDetailFormatter
                      action={selectedLog.action}
                      rawDetails={selectedLog.details}
                      documentTitle={selectedLog.document?.title}
                      caseTitle={selectedLog.case?.title}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-50 px-5 py-2.5 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded font-medium text-xs"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
