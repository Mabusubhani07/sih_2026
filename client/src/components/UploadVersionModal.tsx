import React, { useState } from 'react';
import { api } from '../services/api';
import { Document } from '../types';
import { FilePlus, X, AlertCircle, FileText, Upload } from 'lucide-react';

interface Props {
  document: Document;
  onClose: () => void;
  onVersionUploaded: (updatedDoc: any) => void;
}

export const UploadVersionModal: React.FC<Props> = ({ document, onClose, onVersionUploaded }) => {
  const nextVerNumber = document.currentVersionNumber + 1;
  const [changeSummary, setChangeSummary] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a revised file payload.');
      return;
    }
    if (!changeSummary.trim()) {
      setError('A mandatory revision changelog / justification is required by statutory evidence rules.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('changeSummary', changeSummary.trim());
      formData.append('file', file);

      const res = await api.documents.uploadNewVersion(document.id, formData);
      onVersionUploaded(res.document);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to upload revised version.');
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
              Submit Revised Document Version (v{nextVerNumber})
            </h3>
            <p className="text-[11px] text-slate-500 font-mono">
              {document.documentNumber} • Preserves all historical versions
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Revision Justification / Changelog <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.target.value)}
              placeholder="Provide official rationale for updating this document (e.g. Added supplementary laboratory findings)..."
              className="w-full bg-white border border-slate-300 rounded p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              required
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Revised File Payload <span className="text-red-500">*</span>
            </label>
            <div className="border border-dashed border-slate-300 rounded p-4 text-center bg-slate-50/60 hover:bg-slate-50 transition cursor-pointer relative">
              <input
                type="file"
                onChange={(e) => e.target.files && setFile(e.target.files[0])}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                required
              />
              {file ? (
                <div className="space-y-1">
                  <FileText className="w-6 h-6 text-blue-700 mx-auto" />
                  <div className="font-semibold text-slate-900">{file.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono">{(file.size / 1024).toFixed(1)} KB</div>
                </div>
              ) : (
                <div className="space-y-1 text-slate-500">
                  <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                  <div className="font-medium text-slate-700">Select revised file payload</div>
                  <div className="text-[11px] text-slate-400">Creates non-destructive v{nextVerNumber} revision</div>
                </div>
              )}
            </div>
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
              className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded font-semibold shadow-xs"
            >
              {isSubmitting ? 'Uploading...' : `Upload Version v${nextVerNumber}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
