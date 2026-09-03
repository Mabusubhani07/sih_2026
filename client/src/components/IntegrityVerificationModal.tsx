import React, { useState } from 'react';
import { api } from '../services/api';
import { Document, IntegrityResult } from '../types';
import { ShieldCheck, ShieldAlert, X, RefreshCw, Copy, Check, FileText } from 'lucide-react';

interface Props {
  document: Document;
  onClose: () => void;
}

export const IntegrityVerificationModal: React.FC<Props> = ({ document, onClose }) => {
  const [selectedVersion, setSelectedVersion] = useState<number>(document.currentVersionNumber);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<IntegrityResult | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const result = await api.documents.verifyIntegrity(document.id, selectedVersion);
      setVerificationResult(result);
    } catch (err: any) {
      alert(err.message || 'Integrity check failed to execute.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopy = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4">
      <div className="bg-white rounded-md shadow-xl border border-slate-300 w-full max-w-xl overflow-hidden text-xs">
        {/* Modal Header */}
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1 rounded bg-emerald-700 text-white">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Cryptographic Integrity Verification
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                {document.documentNumber} • Version v{selectedVersion}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded border border-slate-200">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Select Revision Version to Verify:
              </label>
              <select
                value={selectedVersion}
                onChange={(e) => {
                  setSelectedVersion(Number(e.target.value));
                  setVerificationResult(null);
                }}
                className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 focus:outline-none"
              >
                {(document.versions || []).map((v) => (
                  <option key={v.id} value={v.versionNumber}>
                    Version v{v.versionNumber} ({v.originalFileName})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleVerify}
              disabled={isVerifying}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-medium shadow-xs transition disabled:opacity-50"
            >
              {isVerifying ? 'Verifying Bitstream...' : 'Run Integrity Check'}
            </button>
          </div>

          {/* Verification Results */}
          {verificationResult && (
            <div className="space-y-3 pt-2">
              {/* Status Banner */}
              <div
                className={`p-3.5 rounded border flex items-center space-x-3 ${
                  verificationResult.verified
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-red-50 border-red-300 text-red-900'
                }`}
              >
                {verificationResult.verified ? (
                  <ShieldCheck className="w-6 h-6 text-emerald-700 shrink-0" />
                ) : (
                  <ShieldAlert className="w-6 h-6 text-red-700 shrink-0" />
                )}
                <div>
                  <div className="font-bold text-xs">
                    {verificationResult.verified ? 'Integrity: Verified' : 'Integrity: Verification Failed'}
                  </div>
                  <div className="text-[11px] mt-0.5">
                    {verificationResult.verified
                      ? 'The calculated SHA-256 bitstream hash matches the immutable master record exactly.'
                      : 'Bitstream mismatch detected! The stored artifact may have been modified outside official channels.'}
                  </div>
                </div>
              </div>

              {/* Hash Comparison Box */}
              <div className="space-y-2 bg-slate-50 border border-slate-200 rounded p-3 font-mono text-[11px]">
                <div>
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span>RECORDED HASH (Database Ledger):</span>
                    <button
                      onClick={() => handleCopy(verificationResult.recordedHash)}
                      className="text-blue-700 hover:underline"
                    >
                      {copiedHash === verificationResult.recordedHash ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="bg-white p-2 border border-slate-200 rounded break-all text-slate-800">
                    {verificationResult.recordedHash}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span>CALCULATED HASH (Disk Bytes):</span>
                    <button
                      onClick={() => handleCopy(verificationResult.calculatedHash)}
                      className="text-blue-700 hover:underline"
                    >
                      {copiedHash === verificationResult.calculatedHash ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="bg-white p-2 border border-slate-200 rounded break-all text-slate-800">
                    {verificationResult.calculatedHash}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Algorithm:</span>
                    <span className="font-semibold text-slate-700">{verificationResult.algorithm}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Audit Timestamp:</span>
                    <span className="text-slate-700">{new Date(verificationResult.checkedAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Compliance:</span>
                    <span className="text-emerald-700 font-medium">Section 65B Indian Evidence Act Admissible</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-2.5 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded font-medium text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
