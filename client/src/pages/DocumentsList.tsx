import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Document } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { DocumentPreviewModal } from '../components/DocumentPreviewModal';
import { IntegrityVerificationModal } from '../components/IntegrityVerificationModal';
import { SummaryDrawer } from '../components/SummaryDrawer';
import { Link } from 'react-router-dom';
import {
  FileText,
  Search,
  Filter,
  Download,
  Eye,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  ChevronRight,
} from 'lucide-react';

export const DocumentsList: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Modals
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [selectedVerForIntegrity, setSelectedVerForIntegrity] = useState<Document | null>(null);
  const [selectedVerForSummary, setSelectedVerForSummary] = useState<Document | null>(null);

  const fetchDocs = async () => {
    setIsLoading(true);
    try {
      const res = await api.search.query({
        q: search.trim() || undefined,
        documentType: typeFilter || undefined,
      });
      setDocuments(res.documents);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [typeFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDocs();
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleDownload = async (docId: string, verNum: number, filename: string) => {
    try {
      const blob = await api.documents.download(docId, verNum);
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = filename;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || 'Failed to download document');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Document Repository
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Centralized register of verified case documents, reports, and digital exhibits.
          </p>
        </div>

        <button
          onClick={fetchDocs}
          className="p-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded transition shadow-2xs self-start sm:self-auto"
          title="Refresh List"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded p-3 shadow-2xs flex flex-col md:flex-row md:items-center gap-2.5 text-xs">
        <form onSubmit={handleSearch} className="flex-1 flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search by title, document number, or contents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded font-medium transition"
          >
            Search
          </button>
        </form>

        <div className="flex items-center space-x-1">
          <span className="text-slate-500 font-medium">Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-700 focus:bg-white focus:outline-none"
          >
            <option value="">All Document Types</option>
            <option value="FIR">FIR</option>
            <option value="POLICE_REPORT">Police Report</option>
            <option value="INVESTIGATION_REPORT">Investigation Report</option>
            <option value="EVIDENCE">Evidence Record</option>
            <option value="FORENSIC_REPORT">Forensic Report</option>
            <option value="WITNESS_STATEMENT">Witness Statement</option>
            <option value="LEGAL_DOCUMENT">Legal Document</option>
            <option value="COURT_DOCUMENT">Court Document</option>
          </select>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white border border-slate-200 rounded shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Loading document repository...
          </div>
        ) : documents.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 space-y-1">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="font-semibold text-slate-700">No documents match the search criteria</div>
            <div>Try adjusting your filters or search keywords.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3.5">Document Title & Number</th>
                  <th className="py-2.5 px-3.5">Associated Case</th>
                  <th className="py-2.5 px-3.5">Classification</th>
                  <th className="py-2.5 px-3.5">Version</th>
                  <th className="py-2.5 px-3.5">Uploaded By</th>
                  <th className="py-2.5 px-3.5">Uploaded On</th>
                  <th className="py-2.5 px-3.5">SHA-256 Hash</th>
                  <th className="py-2.5 px-3.5">Integrity</th>
                  <th className="py-2.5 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((doc) => {
                  const latest = doc.versions && doc.versions.length > 0 ? doc.versions[0] : null;

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-3.5 max-w-xs">
                        <button
                          onClick={() => setPreviewDoc(doc)}
                          className="font-semibold text-slate-900 hover:text-blue-700 text-left block break-words"
                        >
                          {doc.title}
                        </button>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {doc.documentNumber}
                        </div>
                      </td>

                      <td className="py-2.5 px-3.5 font-medium text-blue-700">
                        {doc.case ? (
                          <Link to={`/cases/${doc.case.id}`} className="hover:underline">
                            {doc.case.caseNumber}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="py-2.5 px-3.5 text-slate-700">
                        <div className="font-medium text-slate-900">{doc.documentType.replace(/_/g, ' ')}</div>
                        {doc.subCategory && (
                          <div className="text-[10px] text-slate-500">{doc.subCategory}</div>
                        )}
                      </td>

                      <td className="py-2.5 px-3.5 font-semibold text-blue-700">
                        v{doc.currentVersionNumber}
                      </td>

                      <td className="py-2.5 px-3.5 text-slate-700">
                        {doc.createdBy?.name || 'Authorized Officer'}
                      </td>

                      <td className="py-2.5 px-3.5 text-slate-500 text-xs">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-2.5 px-3.5 font-mono text-[11px] text-slate-600">
                        {latest?.sha256Hash ? (
                          <button
                            onClick={() => handleCopyHash(latest.sha256Hash)}
                            className="hover:text-blue-700 flex items-center space-x-1"
                            title="Click to copy full hash"
                          >
                            <span>{latest.sha256Hash.substring(0, 10)}...</span>
                            {copiedHash === latest.sha256Hash ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-400 opacity-60" />
                            )}
                          </button>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="py-2.5 px-3.5">
                        <div className="flex flex-col space-y-1 items-start">
                          <StatusBadge status={doc.status} />
                          {doc.processingStatus && doc.processingStatus !== 'READY' && (
                            <StatusBadge status={doc.processingStatus} />
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => setPreviewDoc(doc)}
                            className="p-1 hover:bg-slate-100 text-slate-600 rounded"
                            title="View Document"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setSelectedVerForIntegrity(doc)}
                            className="p-1 hover:bg-emerald-50 text-emerald-700 rounded"
                            title="Verify Integrity"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setSelectedVerForSummary(doc)}
                            className="p-1 hover:bg-blue-50 text-blue-700 rounded"
                            title="Document Advisory Briefing"
                          >
                            <Sparkles className="w-4 h-4" />
                          </button>

                          {latest && (
                            <button
                              onClick={() => handleDownload(doc.id, doc.currentVersionNumber, latest.originalFileName)}
                              className="p-1 hover:bg-slate-100 text-slate-600 rounded"
                              title="Download File"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {previewDoc && (
        <DocumentPreviewModal
          document={previewDoc}
          onClose={() => setPreviewDoc(null)}
          onRefresh={() => fetchDocs()}
        />
      )}

      {selectedVerForIntegrity && (
        <IntegrityVerificationModal
          document={selectedVerForIntegrity}
          onClose={() => setSelectedVerForIntegrity(null)}
        />
      )}

      {selectedVerForSummary && (
        <SummaryDrawer
          document={selectedVerForSummary}
          onClose={() => setSelectedVerForSummary(null)}
        />
      )}
    </div>
  );
};
