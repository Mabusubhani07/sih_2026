import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { Case, Document, Evidence, AuditLog } from '../types';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { CaseTimeline } from '../components/CaseTimeline';
import { DocumentPreviewModal } from '../components/DocumentPreviewModal';
import { UploadDocumentModal } from '../components/UploadDocumentModal';
import { UploadVersionModal } from '../components/UploadVersionModal';
import { IntegrityVerificationModal } from '../components/IntegrityVerificationModal';
import { ShareDocumentModal } from '../components/ShareDocumentModal';
import { ArchiveDocumentModal } from '../components/ArchiveDocumentModal';
import { SummaryDrawer } from '../components/SummaryDrawer';
import {
  Briefcase,
  FileText,
  ShieldCheck,
  History,
  Users,
  Calendar,
  MapPin,
  Building,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Share2,
  Sparkles,
  Archive,
  RefreshCw,
  Clock,
  Lock,
  ChevronRight,
  ExternalLink,
  Shield,
  FilePlus,
  Copy,
  Check,
  Scale,
  UserCheck,
} from 'lucide-react';

export const CaseWorkspace: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [caseData, setCaseData] = useState<(Case & { timeline: AuditLog[] }) | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'evidence' | 'persons' | 'legal' | 'activity'>('documents');
  const [docSearch, setDocSearch] = useState<string>('');
  const [docTypeFilter, setDocTypeFilter] = useState<string>('');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Modals
  const [showUploadDoc, setShowUploadDoc] = useState<boolean>(false);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [selectedVerForNewVersion, setSelectedVerForNewVersion] = useState<Document | null>(null);
  const [selectedVerForIntegrity, setSelectedVerForIntegrity] = useState<Document | null>(null);
  const [selectedVerForShare, setSelectedVerForShare] = useState<Document | null>(null);
  const [selectedVerForArchive, setSelectedVerForArchive] = useState<Document | null>(null);
  const [selectedVerForSummary, setSelectedVerForSummary] = useState<Document | null>(null);

  // Evidence Modal
  const [showAddEvidence, setShowAddEvidence] = useState<boolean>(false);
  const [newEvidenceTitle, setNewEvidenceTitle] = useState<string>('');
  const [newEvidenceDesc, setNewEvidenceDesc] = useState<string>('');
  const [newEvidenceCat, setNewEvidenceCat] = useState<string>('DIGITAL');
  const [newEvidenceLoc, setNewEvidenceLoc] = useState<string>('Evidence Locker Room B, Shelf 4');
  const [isAddingEvidence, setIsAddingEvidence] = useState<boolean>(false);

  const fetchCaseDetails = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await api.cases.getById(id);
      setCaseData(data);

      const docId = searchParams.get('doc');
      if (docId && data.documents) {
        const found = data.documents.find((d) => d.id === docId);
        if (found) {
          setPreviewDoc(found);
          setActiveTab('documents');
        }
      }
    } catch (err) {
      console.error('Failed to load case workspace:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCaseDetails();
  }, [id]);

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleAddEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseData) return;
    setIsAddingEvidence(true);
    try {
      await api.evidence.create({
        caseId: caseData.id,
        title: newEvidenceTitle.trim(),
        description: newEvidenceDesc.trim(),
        category: newEvidenceCat as any,
        custodyLocation: newEvidenceLoc.trim(),
      });
      setShowAddEvidence(false);
      setNewEvidenceTitle('');
      setNewEvidenceDesc('');
      fetchCaseDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to add evidence.');
    } finally {
      setIsAddingEvidence(false);
    }
  };

  const handleVerifyEvidence = async (evidenceId: string) => {
    try {
      const res = await api.evidence.verify(evidenceId);
      alert(
        res.integrityStatus === 'VERIFIED'
          ? 'Evidence integrity verified: Bitstream checksum matches master record.'
          : 'Integrity mismatch detected.'
      );
      fetchCaseDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to verify evidence.');
    }
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
      alert(err.message || 'Failed to download document.');
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-xs text-slate-500 font-sans">
        Loading case workspace...
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="p-8 text-center text-slate-700 space-y-2 bg-white border border-slate-200 rounded">
        <h2 className="text-base font-bold">Investigation Case Not Found</h2>
        <p className="text-xs text-slate-500">
          The requested case does not exist or has been restricted by supervisory clearance.
        </p>
        <Link to="/cases" className="text-xs text-blue-700 font-semibold hover:underline">
          Return to Cases Repository
        </Link>
      </div>
    );
  }

  const isCourtUser = user?.role === 'COURT_USER';
  const filteredDocs = (caseData.documents || []).filter((doc) => {
    if (docTypeFilter && doc.documentType !== docTypeFilter) return false;
    if (docSearch) {
      const q = docSearch.toLowerCase();
      return (
        doc.title.toLowerCase().includes(q) ||
        doc.documentNumber.toLowerCase().includes(q) ||
        doc.documentType.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Case Header Card */}
      <div className="bg-white border border-slate-200 rounded p-5 shadow-2xs space-y-4">
        {/* Top Breadcrumb & Status Indicators */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 text-xs">
          <div className="flex items-center space-x-2 text-slate-500">
            <Link to="/cases" className="hover:text-blue-700">Cases</Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-bold text-blue-800">{caseData.caseNumber}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-700 font-medium">{caseData.firNumber}</span>
          </div>

          <div className="flex items-center space-x-2">
            <StatusBadge status={caseData.status} />
            <StatusBadge status={caseData.priority} />
            {isCourtUser && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                Judicial Read-Only
              </span>
            )}
          </div>
        </div>

        {/* Title & Action Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {caseData.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-1">
              <span>FIR Number: <strong className="text-slate-800 font-semibold">{caseData.firNumber}</strong></span>
              <span>•</span>
              <span>Station: <strong>{caseData.policeStation}</strong></span>
              <span>•</span>
              <span>Jurisdiction: <strong>{caseData.jurisdiction}</strong></span>
              <span>•</span>
              <span>Investigating Officer: <strong>{caseData.leadInvestigator?.name || 'Unassigned'}</strong></span>
              <span>•</span>
              <span>Registered: {new Date(caseData.registeredDate).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {!isCourtUser && (
              <>
                <button
                  onClick={() => setShowUploadDoc(true)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold shadow-xs transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Upload Document</span>
                </button>

                <button
                  onClick={() => setShowAddEvidence(true)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-medium transition"
                >
                  <ShieldCheck className="w-4 h-4 text-slate-500" />
                  <span>Add Evidence</span>
                </button>
              </>
            )}

            <button
              onClick={fetchCaseDetails}
              className="p-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded transition"
              title="Refresh Workspace"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center space-x-1 border-b border-slate-200 pt-2 -mb-2 overflow-x-auto text-xs font-medium text-slate-600">
          {[
            { id: 'overview', label: 'Overview', icon: Briefcase },
            { id: 'documents', label: `Documents (${caseData.documents?.length || 0})`, icon: FileText },
            { id: 'evidence', label: `Evidence (${caseData.evidenceItems?.length || 0})`, icon: ShieldCheck },
            { id: 'persons', label: 'Persons', icon: Users },
            { id: 'legal', label: 'Legal & Court', icon: Scale },
            { id: 'activity', label: 'Case Activity', icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-2.5 px-3 flex items-center space-x-1.5 border-b-2 transition ${
                  isActive
                    ? 'border-blue-700 text-blue-800 font-bold'
                    : 'border-transparent hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-white border border-slate-200 rounded p-4 shadow-2xs space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-1.5">
              Case Diary Details
            </h3>
            <div>
              <span className="text-slate-500 font-medium block">Brief Synopsis / Allegations:</span>
              <p className="mt-1 p-3 bg-slate-50 border border-slate-200 rounded text-slate-800 leading-relaxed font-sans">
                {caseData.description}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-slate-500 block font-medium">Incident Date:</span>
                <span className="text-slate-800">{new Date(caseData.incidentDate).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Place of Incident:</span>
                <span className="text-slate-800">{caseData.incidentLocation}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded p-4 shadow-2xs space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-1.5">
              Jurisdictional Oversight & Assignment
            </h3>
            <div className="space-y-2.5">
              <div>
                <span className="text-slate-500 block font-medium">Supervising Department:</span>
                <span className="font-semibold text-slate-900">{caseData.assignedDepartment?.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Lead Investigating Officer:</span>
                <span className="font-medium text-slate-800">
                  {caseData.leadInvestigator?.name || 'Unassigned'} ({caseData.leadInvestigator?.badgeNumber || '—'})
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">FIR Registering Officer:</span>
                <span className="text-slate-800">
                  {caseData.createdBy?.name} ({caseData.createdBy?.badgeNumber})
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Crime Classification:</span>
                <span className="text-slate-800 font-medium">{caseData.crimeCategory}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className="space-y-3">
          {/* Document Filter Bar */}
          <div className="bg-white border border-slate-200 rounded p-3 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search documents by title, DOC number, type..."
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded pl-8 pr-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-slate-500 font-medium">Document Type:</span>
              <select
                value={docTypeFilter}
                onChange={(e) => setDocTypeFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-700 focus:bg-white focus:outline-none"
              >
                <option value="">All Types</option>
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
            {filteredDocs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                <div className="font-semibold text-slate-700">No documents in this case file</div>
                {!isCourtUser && (
                  <button
                    onClick={() => setShowUploadDoc(true)}
                    className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold"
                  >
                    Upload Document
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3.5">Document Name</th>
                      <th className="py-2.5 px-3.5">Type</th>
                      <th className="py-2.5 px-3.5">Version</th>
                      <th className="py-2.5 px-3.5">Uploaded By</th>
                      <th className="py-2.5 px-3.5">Uploaded On</th>
                      <th className="py-2.5 px-3.5">SHA-256 Hash</th>
                      <th className="py-2.5 px-3.5">Integrity</th>
                      <th className="py-2.5 px-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDocs.map((doc) => {
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
                              {doc.isConfidential && (
                                <span className="ml-2 text-red-700 font-medium bg-red-50 px-1 rounded border border-red-200 text-[10px]">
                                  Restricted
                                </span>
                              )}
                            </div>
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
                            {doc.createdBy?.name || 'Authorized User'}
                          </td>

                          <td className="py-2.5 px-3.5 text-slate-500 text-xs">
                            {new Date(doc.createdAt).toLocaleDateString()}
                          </td>

                          <td className="py-2.5 px-3.5 font-mono text-[11px] text-slate-600">
                            {latest?.sha256Hash ? (
                              <button
                                onClick={() => handleCopyHash(latest.sha256Hash)}
                                className="hover:text-blue-700 flex items-center space-x-1"
                                title="Click to copy full SHA-256 hash"
                              >
                                <span>{latest.sha256Hash.substring(0, 14)}...</span>
                                {copiedHash === latest.sha256Hash ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3 text-slate-400 opacity-60" />
                                )}
                              </button>
                            ) : (
                              'Pending'
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
                                title="Verify Hash Integrity"
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

                              {!isCourtUser && (
                                <>
                                  <button
                                    onClick={() => setSelectedVerForNewVersion(doc)}
                                    className="p-1 hover:bg-purple-50 text-purple-700 rounded"
                                    title="Upload New Version"
                                  >
                                    <FilePlus className="w-4 h-4" />
                                  </button>

                                  <button
                                    onClick={() => setSelectedVerForShare(doc)}
                                    className="p-1 hover:bg-amber-50 text-amber-700 rounded"
                                    title="Share Document"
                                  >
                                    <Share2 className="w-4 h-4" />
                                  </button>

                                  <button
                                    onClick={() => setSelectedVerForArchive(doc)}
                                    className="p-1 hover:bg-rose-50 text-rose-700 rounded"
                                    title="Archive / Invalidate"
                                  >
                                    <Archive className="w-4 h-4" />
                                  </button>
                                </>
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
        </div>
      )}

      {/* TAB 3: EVIDENCE */}
      {activeTab === 'evidence' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
              Evidence Items Register
            </h3>

            {!isCourtUser && (
              <button
                onClick={() => setShowAddEvidence(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Register Evidence Item</span>
              </button>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded shadow-2xs overflow-hidden">
            {(!caseData.evidenceItems || caseData.evidenceItems.length === 0) ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No physical or digital evidence registered for this case.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3.5">Evidence ID</th>
                    <th className="py-2.5 px-3.5">Description</th>
                    <th className="py-2.5 px-3.5">Category</th>
                    <th className="py-2.5 px-3.5">Custodian / Location</th>
                    <th className="py-2.5 px-3.5">Collected By</th>
                    <th className="py-2.5 px-3.5">Integrity</th>
                    <th className="py-2.5 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {caseData.evidenceItems.map((ev) => (
                    <tr key={ev.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-3.5 font-bold text-blue-700">
                        {ev.evidenceNumber}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <div className="font-semibold text-slate-900">{ev.title}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">{ev.description}</div>
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-700 font-medium">
                        {ev.category}
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-800">
                        {ev.custodyLocation}
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-600 text-[11px]">
                        <div>{ev.collectedBy}</div>
                        <div className="text-slate-400">{new Date(ev.collectedDate).toLocaleDateString()}</div>
                      </td>
                      <td className="py-2.5 px-3.5">
                        <StatusBadge status={ev.integrityStatus} />
                      </td>
                      <td className="py-2.5 px-3.5 text-right">
                        <button
                          onClick={() => handleVerifyEvidence(ev.id)}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-[11px] font-medium transition"
                        >
                          Verify Integrity
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: PERSONS */}
      {activeTab === 'persons' && (
        <div className="bg-white border border-slate-200 rounded p-5 shadow-2xs space-y-4 text-xs">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2">
            Persons Associated with Case
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3.5 border border-slate-200 rounded bg-slate-50/60 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">Complainant / Informant</span>
                <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-medium">Informant</span>
              </div>
              <div className="text-slate-700">Chief Information Security Officer, State Financial Systems</div>
              <div className="text-[11px] text-slate-500">Contact verified via official police deposition</div>
            </div>

            <div className="p-3.5 border border-slate-200 rounded bg-slate-50/60 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">Suspected Primary Accused</span>
                <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-medium">Under Inquiry</span>
              </div>
              <div className="text-slate-700">Operator Syndicate (IP Telemetry 198.51.100.42)</div>
              <div className="text-[11px] text-slate-500">Subject to cyber warrant & wallet seizure proceedings</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: LEGAL & COURT */}
      {activeTab === 'legal' && (
        <div className="bg-white border border-slate-200 rounded p-5 shadow-2xs space-y-4 text-xs">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2">
            Legal & Court Filings
          </h3>

          <div className="space-y-3">
            <div className="p-3.5 border border-slate-200 rounded bg-slate-50/60 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-900">Statutory Certificate Under Section 65B</div>
                <div className="text-[11px] text-slate-500">Indian Evidence Act compliance certificate for digital bitstream hashes</div>
              </div>
              <span className="text-xs font-medium text-emerald-800 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                Admissible
              </span>
            </div>

            <div className="p-3.5 border border-slate-200 rounded bg-slate-50/60 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-900">Pre-Trial Prosecution Charge Brief</div>
                <div className="text-[11px] text-slate-500">Under review by Directorate of Prosecution (Adv. Meera Sen)</div>
              </div>
              <span className="text-xs font-medium text-amber-800 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                Under Review
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: ACTIVITY */}
      {activeTab === 'activity' && (
        <div className="bg-white border border-slate-200 rounded p-5 shadow-2xs space-y-4 text-xs">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2">
            Chronological Case Activity & Audit Trail
          </h3>
          <CaseTimeline events={caseData.timeline || []} />
        </div>
      )}

      {/* Modals */}
      {showUploadDoc && (
        <UploadDocumentModal
          caseId={caseData.id}
          onClose={() => setShowUploadDoc(false)}
          onUploaded={() => fetchCaseDetails()}
        />
      )}

      {previewDoc && (
        <DocumentPreviewModal
          document={previewDoc}
          onClose={() => setPreviewDoc(null)}
          onRefresh={() => fetchCaseDetails()}
        />
      )}

      {selectedVerForNewVersion && (
        <UploadVersionModal
          document={selectedVerForNewVersion}
          onClose={() => setSelectedVerForNewVersion(null)}
          onVersionUploaded={() => fetchCaseDetails()}
        />
      )}

      {selectedVerForIntegrity && (
        <IntegrityVerificationModal
          document={selectedVerForIntegrity}
          onClose={() => setSelectedVerForIntegrity(null)}
        />
      )}

      {selectedVerForShare && (
        <ShareDocumentModal
          document={selectedVerForShare}
          onClose={() => setSelectedVerForShare(null)}
          onShareUpdated={() => fetchCaseDetails()}
        />
      )}

      {selectedVerForArchive && (
        <ArchiveDocumentModal
          document={selectedVerForArchive}
          onClose={() => setSelectedVerForArchive(null)}
          onStatusUpdated={() => fetchCaseDetails()}
        />
      )}

      {selectedVerForSummary && (
        <SummaryDrawer
          document={selectedVerForSummary}
          onClose={() => setSelectedVerForSummary(null)}
        />
      )}

      {/* Register Evidence Modal */}
      {showAddEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-md shadow-xl border border-slate-300 w-full max-w-md overflow-hidden text-xs">
            <div className="bg-slate-50 px-5 py-3 flex items-center justify-between border-b border-slate-200">
              <h3 className="font-bold text-slate-900">Register Evidence Item</h3>
              <button onClick={() => setShowAddEvidence(false)} className="text-slate-400 hover:text-slate-600">
                &times;
              </button>
            </div>
            <form onSubmit={handleAddEvidence} className="p-5 space-y-3.5">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Item Title / Description *</label>
                <input
                  type="text"
                  placeholder="e.g. Encrypted SanDisk USB Drive"
                  value={newEvidenceTitle}
                  onChange={(e) => setNewEvidenceTitle(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  required
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Evidence Category *</label>
                <select
                  value={newEvidenceCat}
                  onChange={(e) => setNewEvidenceCat(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                >
                  <option value="DIGITAL">Digital Device / Media</option>
                  <option value="DOCUMENTARY">Documentary Evidence</option>
                  <option value="PHYSICAL_ITEM">Physical Item / Weapon</option>
                  <option value="BIOLOGICAL">Biological / Trace</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Custody Storage Location *</label>
                <input
                  type="text"
                  value={newEvidenceLoc}
                  onChange={(e) => setNewEvidenceLoc(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  required
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Seizure Particulars & Remarks</label>
                <textarea
                  rows={2}
                  value={newEvidenceDesc}
                  onChange={(e) => setNewEvidenceDesc(e.target.value)}
                  placeholder="Seized at scene under memo..."
                  className="w-full bg-white border border-slate-300 rounded p-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>
              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddEvidence(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingEvidence}
                  className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold shadow-xs"
                >
                  {isAddingEvidence ? 'Registering...' : 'Register Evidence'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
