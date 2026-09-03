import React, { useState } from 'react';
import { api } from '../services/api';
import { Document } from '../types';
import { Archive, X, AlertTriangle } from 'lucide-react';

interface Props {
  document: Document;
  onClose: () => void;
  onStatusUpdated: () => void;
}

export const ArchiveDocumentModal: React.FC<Props> = ({ document, onClose, onStatusUpdated }) => {
  const [status, setStatus] = useState<'ARCHIVED' | 'INVALID'>('ARCHIVED');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A mandatory official reason is required by statutory evidence procedure.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await api.documents.archive(document.id, status, reason.trim());
      onStatusUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update document status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4">
      <div className="bg-white rounded-md shadow-xl border border-slate-300 w-full max-w-md overflow-hidden text-xs">
        <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900">
              Non-Destructive Document Archival
            </h3>
            <p className="text-[11px] text-slate-500 font-mono">
              {document.documentNumber} • Append-Only Evidence Policy
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-800 flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <div className="text-[11px] leading-relaxed">
              Evidentiary integrity rules prohibit physical deletion of case records. The document remains immutable in the audit ledger under the designated status.
            </div>
          </div>

          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block font-medium text-slate-700 mb-1">Designated Status *</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
            >
              <option value="ARCHIVED">ARCHIVED (Concluded / Retained as historical record)</option>
              <option value="INVALID">INVALID (Uploaded in error / Procedural defect)</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Official Justification / Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide required rationale for supervisory audit review..."
              className="w-full bg-white border border-slate-300 rounded p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              required
            />
          </div>

          <div className="pt-2 flex justify-end space-x-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded font-medium shadow-xs"
            >
              {isSubmitting ? 'Updating...' : 'Confirm Status Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
