import React, { useState } from 'react';
import { api } from '../services/api';
import { Upload, X, FileText, AlertCircle, Shield } from 'lucide-react';

interface Props {
  caseId: string;
  onClose: () => void;
  onUploaded: (newDoc: any) => void;
}

export const UploadDocumentModal: React.FC<Props> = ({ caseId, onClose, onUploaded }) => {
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState('POLICE_REPORT');
  const [isConfidential, setIsConfidential] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);

      if (!title) {
        setTitle(selected.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please attach an evidentiary file payload.');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('documentType', documentType);
      formData.append('isConfidential', String(isConfidential));
      formData.append('file', file);

      const createdDoc = await api.documents.upload(caseId, formData);
      onUploaded(createdDoc);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to upload and seal document.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4">
      <div className="bg-white rounded-md shadow-xl border border-slate-300 w-full max-w-lg overflow-hidden text-xs">
        {/* Header */}
        <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900">
              Upload Case Document
            </h3>
            <p className="text-[11px] text-slate-500">
              Computes bitstream SHA-256 hash immediately upon registration.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Document Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Supplementary Cyber Forensic Examination Report"
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              required
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Document Classification <span className="text-red-500">*</span>
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
            >
              <option value="FIR">FIR (First Information Report)</option>
              <option value="POLICE_REPORT">Police Investigation Report</option>
              <option value="INVESTIGATION_REPORT">Investigation Diary Report</option>
              <option value="EVIDENCE">Evidence Seizure Memo</option>
              <option value="FORENSIC_REPORT">Forensic Laboratory Examination Report</option>
              <option value="WITNESS_STATEMENT">Witness Deposition Statement</option>
              <option value="LEGAL_DOCUMENT">Statutory Prosecution Brief</option>
              <option value="COURT_DOCUMENT">Certified Judicial Court Order</option>
            </select>
          </div>

          {/* File Upload Drop Area */}
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              File Payload (PDF, DOCX, TXT, PNG, JPG) <span className="text-red-500">*</span>
            </label>
            <div className="border border-dashed border-slate-300 rounded p-4 text-center bg-slate-50/60 hover:bg-slate-50 transition cursor-pointer relative">
              <input
                type="file"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                required
              />
              {file ? (
                <div className="space-y-1">
                  <FileText className="w-7 h-7 text-blue-700 mx-auto" />
                  <div className="font-semibold text-slate-900">{file.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {(file.size / 1024).toFixed(1)} KB • {file.type || 'Binary Document'}
                  </div>
                </div>
              ) : (
                <div className="space-y-1 text-slate-500">
                  <Upload className="w-7 h-7 text-slate-400 mx-auto" />
                  <div className="font-medium text-slate-700">Choose file or drag here to attach</div>
                  <div className="text-[11px] text-slate-400">Maximum 25 MB. SHA-256 hash calculated automatically.</div>
                </div>
              )}
            </div>
          </div>

          {/* Confidentiality */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded flex items-start space-x-2.5">
            <input
              type="checkbox"
              id="isConfidential"
              checked={isConfidential}
              onChange={(e) => setIsConfidential(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 mt-0.5"
            />
            <label htmlFor="isConfidential" className="cursor-pointer text-xs">
              <div className="font-semibold text-slate-800">Restricted Case Team Document</div>
              <div className="text-[11px] text-slate-500">
                Restricts visibility to assigned case officers and supervisory administration.
              </div>
            </label>
          </div>

          {/* Buttons */}
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
              disabled={isUploading}
              className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded font-semibold shadow-xs transition disabled:opacity-50"
            >
              {isUploading ? 'Sealing Document...' : 'Upload & Compute Hash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
