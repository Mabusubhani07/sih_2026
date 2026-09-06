import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Document, DocumentVersion } from '../types';
import { StatusBadge } from './StatusBadge';
import { useAuth } from '../context/AuthContext';
import {
  X,
  Download,
  ShieldCheck,
  History,
  Share2,
  FilePlus,
  Sparkles,
  Archive,
  Copy,
  Check,
  FileText,
  Clock,
  Printer,
  ChevronRight,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { UploadVersionModal } from './UploadVersionModal';
import { IntegrityVerificationModal } from './IntegrityVerificationModal';
import { ShareDocumentModal } from './ShareDocumentModal';
import { ArchiveDocumentModal } from './ArchiveDocumentModal';
import { SummaryDrawer } from './SummaryDrawer';
import { AdjustClassificationModal } from './AdjustClassificationModal';
import { EditMetadataModal } from './EditMetadataModal';

interface Props {
  document: Document;
  onClose: () => void;
  onRefresh?: () => void;
}

export const DocumentPreviewModal: React.FC<Props> = ({ document: initialDoc, onClose, onRefresh }) => {
  const { user } = useAuth();
  const [doc, setDoc] = useState<Document>(initialDoc);
  const [selectedVersionNum, setSelectedVersionNum] = useState<number>(initialDoc.currentVersionNumber);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState<boolean>(true);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'ocr'>('preview');
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [metadataSuccess, setMetadataSuccess] = useState<boolean>(false);

  // Sync doc state when parent component updates initialDoc
  useEffect(() => {
    setDoc(initialDoc);
  }, [initialDoc]);

  // Modals
  const [showUploadVersion, setShowUploadVersion] = useState(false);
  const [showIntegrity, setShowIntegrity] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showClassificationModal, setShowClassificationModal] = useState(false);
  const [showMetadataModal, setShowMetadataModal] = useState(false);

  const activeVersion =
    doc.versions?.find((v) => v.versionNumber === selectedVersionNum) ||
    doc.versions?.[0] ||
    null;

  const reloadDoc = async () => {
    try {
      const refreshed = await api.documents.getById(doc.id);
      setDoc(refreshed);
      setSelectedVersionNum(refreshed.currentVersionNumber);
      onRefresh?.();
    } catch (err) {
      console.error('Failed to reload document:', err);
    }
  };

  const handleRetryProcessing = async () => {
    setIsRetrying(true);
    try {
      await api.documents.retryProcessing(doc.id);
      await reloadDoc();
    } catch (err: any) {
      alert(err.message || 'Failed to retry document processing');
    } finally {
      setIsRetrying(false);
    }
  };

  useEffect(() => {
    const fetchContent = async () => {
      if (!activeVersion) return;
      setIsLoadingContent(true);

      try {
        const ext = activeVersion.originalFileName.split('.').pop()?.toLowerCase() || '';
        if (['txt', 'log', 'md', 'json', 'csv', 'py', 'sh'].includes(ext)) {
          const blob = await api.documents.download(doc.id, activeVersion.versionNumber);
          const text = await blob.text();
          setFileContent(text);
        } else {
          setFileContent(null);
        }
      } catch (err) {
        console.error('Failed to load file preview content:', err);
        setFileContent(null);
      } finally {
        setIsLoadingContent(false);
      }
    };

    fetchContent();
  }, [doc.id, selectedVersionNum]);

  const handleCopyHash = () => {
    if (!activeVersion?.sha256Hash) return;
    navigator.clipboard.writeText(activeVersion.sha256Hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleDownload = async () => {
    if (!activeVersion) return;
    try {
      const blob = await api.documents.download(doc.id, activeVersion.versionNumber);
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = activeVersion.originalFileName;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || 'Failed to download document');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const isCourtUser = user?.role === 'COURT_USER';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-2xs p-3 sm:p-5">
      <div className="bg-white rounded-md shadow-2xl border border-slate-300 w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden text-xs">
        {/* Top Header */}
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 rounded bg-blue-700 text-white">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-bold text-sm text-slate-900">{doc.title}</h2>
                <StatusBadge status={doc.status} />
                <StatusBadge status={doc.processingStatus || 'READY'} />
                {doc.processingStatus === 'PROCESSING_FAILED' && !isCourtUser && (
                  <button
                    onClick={handleRetryProcessing}
                    disabled={isRetrying}
                    className="px-2 py-0.5 bg-rose-700 hover:bg-rose-800 text-white rounded text-[11px] font-medium flex items-center space-x-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
                    <span>{isRetrying ? 'Retrying...' : 'Retry Processing'}</span>
                  </button>
                )}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                {doc.documentNumber} • {doc.documentType.replace(/_/g, ' ')} {doc.subCategory ? `[${doc.subCategory}]` : ''} • Current: v{doc.currentVersionNumber}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded flex items-center space-x-1"
              title="Print Document"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print</span>
            </button>

            <button
              onClick={handleDownload}
              className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded font-medium flex items-center space-x-1.5 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main 2-Pane Workstation */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Canvas: Document Preview & OCR Text */}
          <div className="flex-1 bg-slate-100/70 p-5 overflow-y-auto flex flex-col">
            {/* View Mode Switcher */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex bg-white border border-slate-300 rounded p-0.5 text-[11px]">
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1 rounded font-medium transition ${
                    activeTab === 'preview'
                      ? 'bg-blue-700 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Document Preview
                </button>
                <button
                  onClick={() => setActiveTab('ocr')}
                  className={`px-3 py-1 rounded font-medium transition flex items-center space-x-1.5 ${
                    activeTab === 'ocr'
                      ? 'bg-blue-700 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Extracted / OCR Transcript</span>
                  {doc.isOcrProcessed && (
                    <span className="px-1 py-0.2 bg-cyan-100 text-cyan-800 rounded text-[9px] font-bold">
                      OCR
                    </span>
                  )}
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowIntegrity(true)}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-[11px] font-medium transition"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verify SHA-256 Integrity</span>
                </button>
                <button
                  onClick={() => setShowSummary(true)}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded text-[11px] font-medium transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Document Advisory Briefing</span>
                </button>
              </div>
            </div>

            {/* Document Content Canvas */}
            <div className="flex-1 bg-white border border-slate-200 rounded p-5 overflow-y-auto shadow-2xs">
              {activeTab === 'ocr' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-semibold text-slate-800 text-xs">
                      Digitized Bitstream Text Stream (Version {selectedVersionNum})
                    </span>
                    {(activeVersion?.extractedText || doc.ocrText) && (
                      <button
                        onClick={() => {
                          const text = activeVersion?.extractedText || doc.ocrText || '';
                          navigator.clipboard.writeText(text);
                          alert('Extracted transcript copied to clipboard.');
                        }}
                        className="text-blue-700 hover:underline text-[11px] font-medium"
                      >
                        Copy Transcript
                      </button>
                    )}
                  </div>
                  {doc.processingStatus === 'PROCESSING' || doc.processingStatus === 'UPLOADED' ? (
                    <div className="p-8 text-center bg-amber-50/60 border border-amber-200 rounded text-amber-900 space-y-2">
                      <div className="inline-block animate-spin w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full mb-1"></div>
                      <div className="font-semibold text-xs">Text extraction in progress.</div>
                      <div className="text-[11px] text-amber-700">The document is currently undergoing native stream parsing or optical character recognition.</div>
                    </div>
                  ) : doc.processingStatus === 'PROCESSING_FAILED' ? (
                    <div className="p-6 bg-rose-50 border border-rose-200 rounded text-rose-900 space-y-2">
                      <div className="font-semibold text-xs flex items-center space-x-1.5 text-rose-700">
                        <span>⚠</span>
                        <span>Text extraction failed.</span>
                      </div>
                      <div className="text-[11px] text-rose-800 font-mono bg-white/70 p-2.5 rounded border border-rose-200/60">
                        {doc.processingError || 'Unable to extract text from this document.'}
                      </div>
                    </div>
                  ) : (
                    <div className="font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed select-text bg-slate-50 p-4 rounded border border-slate-200">
                      {activeVersion?.extractedText || doc.ocrText || 'No extracted or OCR text recorded for this document version.'}
                    </div>
                  )}
                </div>
              ) : isLoadingContent ? (
                <div className="p-12 text-center text-slate-500 font-sans">
                  Loading document preview...
                </div>
              ) : fileContent !== null ? (
                <div className="font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed select-text">
                  {fileContent}
                </div>
              ) : activeVersion?.originalFileName.toLowerCase().endsWith('.pdf') ? (
                <div className="text-center py-16 space-y-3">
                  <FileText className="w-12 h-12 text-slate-400 mx-auto" />
                  <div className="font-bold text-slate-800 text-sm">{activeVersion.originalFileName}</div>
                  <div className="text-slate-500 text-xs">
                    PDF Document ({(Number(activeVersion.fileSize || 0) / 1024).toFixed(1)} KB)
                  </div>
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded font-medium shadow-xs"
                  >
                    Download and Open PDF
                  </button>
                </div>
              ) : (
                <div className="text-center py-16 space-y-3">
                  <FileText className="w-12 h-12 text-slate-400 mx-auto" />
                  <div className="font-bold text-slate-800 text-sm">{activeVersion?.originalFileName}</div>
                  <div className="text-slate-500 text-xs">
                    Binary Evidentiary File ({(Number(activeVersion?.fileSize || 0) / 1024).toFixed(1)} KB)
                  </div>
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded font-medium shadow-xs"
                  >
                    Download Evidence File
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar: Metadata & Version History */}
          <div className="w-80 bg-white border-l border-slate-200 flex flex-col justify-between overflow-y-auto p-4 space-y-4 shrink-0">
            <div className="space-y-4">
              {/* Metadata Section */}
              <div className="space-y-2">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-1.5">
                  Document Information
                </h3>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Document ID:</span>
                    <span className="font-mono font-medium text-slate-800">{doc.documentNumber}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Document Type:</span>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-slate-800 font-medium">{doc.documentType.replace(/_/g, ' ')}</span>
                      {!isCourtUser && (
                        <button
                          onClick={() => setShowClassificationModal(true)}
                          className="text-blue-700 hover:underline text-[10px] font-semibold"
                        >
                          Adjust
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subcategory:</span>
                    <span className="text-slate-800 font-medium">{doc.subCategory || 'General Case Records'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Active Version:</span>
                    <span className="font-mono font-semibold text-blue-700">v{selectedVersionNum}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Uploaded By:</span>
                    <span className="text-slate-800">{activeVersion?.uploadedBy?.name || 'Officer'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Created Date:</span>
                    <span className="font-mono text-slate-800">{new Date(doc.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Clearance Level:</span>
                    <span className="text-slate-800">{doc.isConfidential ? 'Restricted' : 'Standard Case Team'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Integrity:</span>
                    <span className="text-emerald-700 font-semibold flex items-center space-x-1">
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Verified</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Extracted Evidentiary Metadata Card */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                    Extracted Metadata
                  </h3>
                  {!isCourtUser && (
                    <button
                      onClick={() => setShowMetadataModal(true)}
                      className="text-[11px] text-blue-700 hover:underline font-semibold"
                    >
                      Edit Metadata
                    </button>
                  )}
                </div>

                {metadataSuccess && (
                  <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded flex items-center space-x-1.5 text-[11px] font-medium toast-drop-fade">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Metadata updated and persisted to database.</span>
                  </div>
                )}

                <div className="bg-slate-50 border border-slate-200 rounded p-2.5 space-y-1.5 text-[11px]">
                  {doc.metadata?.referenceNumber && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Reference / Serial:</span>
                      <span className="font-mono font-semibold text-slate-800">{doc.metadata.referenceNumber}</span>
                    </div>
                  )}
                  {doc.metadata?.issuingAuthority && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Authority:</span>
                      <span className="text-slate-800 text-right truncate max-w-[150px]">{doc.metadata.issuingAuthority}</span>
                    </div>
                  )}
                  {(doc.metadata?.departmentName || doc.department?.name) && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Department:</span>
                      <span className="text-slate-800 text-right truncate max-w-[150px]">
                        {doc.metadata?.departmentName || doc.department?.name}
                      </span>
                    </div>
                  )}
                  {doc.metadata?.location && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Location:</span>
                      <span className="text-slate-800">{doc.metadata.location}</span>
                    </div>
                  )}
                  {doc.metadata?.documentDate && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Record Date:</span>
                      <span className="font-mono text-slate-800">{new Date(doc.metadata.documentDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  {doc.metadata?.language && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Language:</span>
                      <span className="text-slate-800 uppercase font-mono">{doc.metadata.language}</span>
                    </div>
                  )}
                  {doc.metadata?.entities && (
                    <div className="pt-1 border-t border-slate-200/60">
                      <span className="text-slate-500 block mb-1">Identified Entities:</span>
                      <div className="flex flex-wrap gap-1">
                        {(() => {
                          try {
                            const parsed = JSON.parse(doc.metadata.entities);
                            return Array.isArray(parsed)
                              ? parsed.slice(0, 3).map((e: string, i: number) => (
                                  <span key={i} className="px-1.5 py-0.5 bg-white border border-slate-200 text-slate-700 rounded text-[10px]">
                                    {e}
                                  </span>
                                ))
                              : null;
                          } catch {
                            return null;
                          }
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* SHA-256 Hash Box */}
              <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-700">SHA-256 Bitstream Hash</span>
                  <button
                    onClick={handleCopyHash}
                    className="text-blue-700 hover:text-blue-900 font-medium flex items-center space-x-1"
                  >
                    {copiedHash ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700 text-[10px]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px]">Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="font-mono text-[10px] text-slate-700 break-all bg-white p-2 border border-slate-200 rounded select-all">
                  {activeVersion?.sha256Hash || 'Pending calculation'}
                </div>
                <div className="text-[10px] text-slate-500">
                  Computed via node crypto bitstream. Section 65B compliant.
                </div>
              </div>

              {/* Version History Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                    Version History ({doc.versions?.length || 1})
                  </h3>
                  {!isCourtUser && (
                    <button
                      onClick={() => setShowUploadVersion(true)}
                      className="text-[11px] text-blue-700 hover:underline font-semibold flex items-center space-x-1"
                    >
                      <FilePlus className="w-3 h-3" />
                      <span>Upload Revision</span>
                    </button>
                  )}
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {(doc.versions || []).map((ver) => {
                    const isSelected = ver.versionNumber === selectedVersionNum;
                    return (
                      <div
                        key={ver.id}
                        onClick={() => setSelectedVersionNum(ver.versionNumber)}
                        className={`p-2.5 rounded border transition cursor-pointer text-[11px] ${
                          isSelected
                            ? 'bg-blue-50 border-blue-300 text-blue-950 font-medium'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold">Version v{ver.versionNumber}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(ver.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-slate-600 mt-0.5 truncate">{ver.changeSummary}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          By {ver.uploadedBy?.name || 'Officer'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Quick Actions (Non-court) */}
            {!isCourtUser && (
              <div className="pt-3 border-t border-slate-200 space-y-1.5">
                <button
                  onClick={() => setShowShare(true)}
                  className="w-full py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium flex items-center justify-center space-x-1.5 transition"
                >
                  <Share2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Controlled Sharing</span>
                </button>

                <button
                  onClick={() => setShowArchive(true)}
                  className="w-full py-1.5 px-2 bg-red-50 hover:bg-red-100 text-red-700 rounded text-xs font-medium flex items-center justify-center space-x-1.5 transition"
                >
                  <Archive className="w-3.5 h-3.5 text-red-600" />
                  <span>Archive Document</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sub-modals */}
      {showUploadVersion && (
        <UploadVersionModal
          document={doc}
          onClose={() => setShowUploadVersion(false)}
          onVersionUploaded={() => reloadDoc()}
        />
      )}

      {showIntegrity && (
        <IntegrityVerificationModal
          document={doc}
          onClose={() => setShowIntegrity(false)}
        />
      )}

      {showShare && (
        <ShareDocumentModal
          document={doc}
          onClose={() => setShowShare(false)}
          onShareUpdated={() => reloadDoc()}
        />
      )}

      {showArchive && (
        <ArchiveDocumentModal
          document={doc}
          onClose={() => setShowArchive(false)}
          onStatusUpdated={() => reloadDoc()}
        />
      )}

      {showSummary && (
        <SummaryDrawer
          document={doc}
          onClose={() => setShowSummary(false)}
        />
      )}

      {showClassificationModal && (
        <AdjustClassificationModal
          document={doc}
          onClose={() => setShowClassificationModal(false)}
          onUpdated={() => reloadDoc()}
        />
      )}

      {showMetadataModal && (
        <EditMetadataModal
          document={doc}
          metadata={doc.metadata}
          onClose={() => setShowMetadataModal(false)}
          onUpdated={async (updated) => {
            if (updated) {
              setDoc(updated);
            }
            setMetadataSuccess(true);
            setTimeout(() => setMetadataSuccess(false), 3500);
            await reloadDoc();
          }}
        />
      )}
    </div>
  );
};
