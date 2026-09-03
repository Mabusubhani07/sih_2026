import React, { useState } from 'react';
import { Document, DocumentMetadata } from '../types';
import { api } from '../services/api';
import { X, ShieldAlert, Check } from 'lucide-react';

interface Props {
  document: Document;
  metadata?: DocumentMetadata | null;
  onClose: () => void;
  onUpdated: () => void;
}

export const EditMetadataModal: React.FC<Props> = ({ document: doc, metadata, onClose, onUpdated }) => {
  const [referenceNumber, setReferenceNumber] = useState(metadata?.referenceNumber || '');
  const [issuingAuthority, setIssuingAuthority] = useState(metadata?.issuingAuthority || '');
  const [departmentName, setDepartmentName] = useState(metadata?.departmentName || '');
  const [location, setLocation] = useState(metadata?.location || '');
  const [documentDate, setDocumentDate] = useState(
    metadata?.documentDate ? new Date(metadata.documentDate).toISOString().slice(0, 10) : ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await api.documents.updateMetadata(doc.id, {
        referenceNumber: referenceNumber.trim() || undefined,
        issuingAuthority: issuingAuthority.trim() || undefined,
        departmentName: departmentName.trim() || undefined,
        location: location.trim() || undefined,
        documentDate: documentDate || undefined,
      });
      onUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update document metadata.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-2xs p-4">
      <div className="bg-white rounded-md shadow-xl border border-slate-300 w-full max-w-lg overflow-hidden text-xs">
        {/* Header */}
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Edit Extracted Document Metadata</h3>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
              {doc.documentNumber} • Original file bytes remain unmodified
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded flex items-center space-x-2 text-[11px]">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Serial / Reference Number</label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. SN-982103, SL-4820"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-800 text-xs focus:ring-1 focus:ring-blue-700 outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Document Date</label>
              <input
                type="date"
                value={documentDate}
                onChange={(e) => setDocumentDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-800 text-xs focus:ring-1 focus:ring-blue-700 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Issuing Authority / Officer</label>
            <input
              type="text"
              value={issuingAuthority}
              onChange={(e) => setIssuingAuthority(e.target.value)}
              placeholder="e.g. Director, Forensic Science Laboratory"
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-800 text-xs focus:ring-1 focus:ring-blue-700 outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Department / Organization</label>
            <input
              type="text"
              value={departmentName}
              onChange={(e) => setDepartmentName(e.target.value)}
              placeholder="e.g. Forensic Science Laboratory & Cyber Analysis"
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-800 text-xs focus:ring-1 focus:ring-blue-700 outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Seizure / Inspection Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Sector 62 Cyber Precinct Lab"
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-800 text-xs focus:ring-1 focus:ring-blue-700 outline-none"
            />
          </div>

          <div className="bg-slate-50 -mx-4 -mb-4 p-3 border-t border-slate-200 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded font-medium shadow-2xs flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving...' : 'Save Metadata'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
