import React, { useState } from 'react';
import { Document } from '../types';
import { api } from '../services/api';
import { X, ShieldAlert, Check } from 'lucide-react';

interface Props {
  document: Document;
  onClose: () => void;
  onUpdated: () => void;
}

const DOCUMENT_TYPES = [
  'FIR',
  'POLICE_REPORT',
  'INVESTIGATION_REPORT',
  'EVIDENCE',
  'FORENSIC_REPORT',
  'WITNESS_STATEMENT',
  'LEGAL_DOCUMENT',
  'COURT_DOCUMENT',
  'OTHER',
];

const COMMON_SUBCATEGORIES = [
  'First Information Reports',
  'Case Diaries',
  'Operational Reports',
  'Cyber Forensics',
  'Ballistics Striation',
  'Questioned Documents',
  'Chemical Analysis',
  'Interrogation Statements',
  'Seizure Panchnama',
  'Prosecution Briefs',
  'Court Orders & Dockets',
  'General Case Records',
];

export const AdjustClassificationModal: React.FC<Props> = ({ document: doc, onClose, onUpdated }) => {
  const [docType, setDocType] = useState(doc.documentType);
  const [subCategory, setSubCategory] = useState(doc.subCategory || '');
  const [rationale, setRationale] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await api.documents.updateClassification(doc.id, {
        documentType: docType,
        subCategory: subCategory.trim() || undefined,
        rationale: rationale.trim() || undefined,
      });
      onUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update document classification.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-2xs p-4">
      <div className="bg-white rounded-md shadow-xl border border-slate-300 w-full max-w-md overflow-hidden text-xs">
        {/* Header */}
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Adjust Document Classification</h3>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">{doc.documentNumber}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded flex items-center space-x-2 text-[11px]">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-700 font-medium mb-1">
              Document Classification <span className="text-rose-600">*</span>
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-800 text-xs focus:ring-1 focus:ring-blue-700 outline-none"
              required
            >
              {DOCUMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Hierarchical Subcategory</label>
            <input
              type="text"
              list="subcategories"
              value={subCategory}
              onChange={(e) => setSubCategory(e.target.value)}
              placeholder="e.g. Cyber Forensics, Seizure Panchnama"
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-800 text-xs focus:ring-1 focus:ring-blue-700 outline-none"
            />
            <datalist id="subcategories">
              {COMMON_SUBCATEGORIES.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Official Justification / Rationale</label>
            <textarea
              rows={2}
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="Reason for reclassifying this official record in case docket..."
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
              <span>{isSubmitting ? 'Updating...' : 'Confirm Classification'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
