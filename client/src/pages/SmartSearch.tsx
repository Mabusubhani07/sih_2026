import React, { useState } from 'react';
import { api } from '../services/api';
import { Case, Document } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Link } from 'react-router-dom';
import {
  Search,
  Briefcase,
  FileText,
  ShieldCheck,
  ChevronRight,
  Filter,
} from 'lucide-react';

export const SmartSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<{ cases: Case[]; documents: Document[] } | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const data = await api.search.query({ q: query.trim() });
      setResults(data);
    } catch (err) {
      console.error('Failed to execute search:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleQuickQuery = (q: string) => {
    setQuery(q);
    api.search.query({ q }).then(setResults).catch(console.error);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="pb-3 border-b border-slate-200">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Smart Search
        </h1>
        <p className="text-xs text-slate-600 mt-0.5">
          Enterprise investigation discovery search across cases, FIRs, documents, and evidence.
        </p>
      </div>

      {/* Search Bar Card */}
      <div className="bg-white border border-slate-200 rounded p-4 shadow-2xs space-y-3">
        <form onSubmit={handleSearch} className="flex gap-2 text-xs">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by keywords, Case ID, FIR Number, suspect tokens, or document names..."
              className="w-full bg-slate-50 border border-slate-300 rounded pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded font-semibold text-xs shadow-xs transition disabled:opacity-50"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Suggested Queries */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-500 font-medium">Quick Queries:</span>
          {[
            'Cyber Fraud',
            'FIR/2026/9940',
            'CASE-2026-00107',
            'Forensic Report',
            'Witness Statement',
          ].map((queryTerm) => (
            <button
              key={queryTerm}
              onClick={() => handleQuickQuery(queryTerm)}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 text-[11px] transition"
            >
              {queryTerm}
            </button>
          ))}
        </div>
      </div>

      {/* Search Results */}
      {results && (
        <div className="space-y-5">
          {/* Matching Cases */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Briefcase className="w-4 h-4 text-blue-700" />
              <h2 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                Matching Cases ({results.cases.length})
              </h2>
            </div>

            {results.cases.length === 0 ? (
              <div className="p-4 bg-white border border-slate-200 rounded text-xs text-slate-500 text-center">
                No matching case files.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {results.cases.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 bg-white border border-slate-200 rounded hover:border-blue-400 transition space-y-1.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-800">{c.caseNumber}</span>
                      <StatusBadge status={c.status} />
                    </div>
                    <Link
                      to={`/cases/${c.id}`}
                      className="font-bold text-slate-900 hover:text-blue-700 block text-sm"
                    >
                      {c.title}
                    </Link>
                    <div className="text-[11px] text-slate-500">
                      FIR: {c.firNumber} • Station: {c.policeStation}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Matching Documents */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-blue-700" />
              <h2 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                Matching Documents ({results.documents.length})
              </h2>
            </div>

            {results.documents.length === 0 ? (
              <div className="p-4 bg-white border border-slate-200 rounded text-xs text-slate-500 text-center">
                No matching documents.
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3.5">Document Title</th>
                      <th className="py-2.5 px-3.5">Type</th>
                      <th className="py-2.5 px-3.5">Case Reference</th>
                      <th className="py-2.5 px-3.5">Version</th>
                      <th className="py-2.5 px-3.5">Integrity</th>
                      <th className="py-2.5 px-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {results.documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-3.5 font-medium text-slate-900">
                          {doc.title}
                          <div className="text-[11px] text-slate-500 mt-0.5">{doc.documentNumber}</div>
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-700">{doc.documentType.replace(/_/g, ' ')}</td>
                        <td className="py-2.5 px-3.5 font-medium text-blue-700">
                          {doc.case ? (
                            <Link to={`/cases/${doc.case.id}`} className="hover:underline">
                              {doc.case.caseNumber}
                            </Link>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-2.5 px-3.5 font-semibold text-blue-700">v{doc.currentVersionNumber}</td>
                        <td className="py-2.5 px-3.5">
                          <span className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px] font-medium">
                            Verified
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-right">
                          <Link
                            to={doc.case ? `/cases/${doc.case.id}?doc=${doc.id}` : '/documents'}
                            className="text-blue-700 hover:text-blue-900 font-medium hover:underline text-xs"
                          >
                            Open File
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
