import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { X, AlertCircle, Upload, FileText } from 'lucide-react';

interface Props {
  onClose: () => void;
  onCaseCreated?: (newCase: any) => void;
}

export const CreateCaseModal: React.FC<Props> = ({ onClose, onCaseCreated }) => {
  const navigate = useNavigate();
  const [firNumber, setFirNumber] = useState(`FIR/2026/${Math.floor(1000 + Math.random() * 9000)}`);
  const [caseNumber] = useState(`CASE-2026-${Math.floor(100 + Math.random() * 900)}`);
  const [title, setTitle] = useState('');
  const [crimeCategory, setCrimeCategory] = useState('Cyber Fraud');
  const [priority, setPriority] = useState<'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [policeStation, setPoliceStation] = useState('Central Police Station');
  const [jurisdiction, setJurisdiction] = useState('State Police Command, Zone I');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().slice(0, 10));
  const [incidentLocation, setIncidentLocation] = useState('Metropolitan Server Complex, Sector 44');
  const [description, setDescription] = useState('');
  const [supportingDept, setSupportingDept] = useState('Forensic Science Laboratory');

  const [initialFile, setInitialFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !firNumber.trim() || !policeStation.trim()) {
      setError('Please complete all mandatory required fields (*).');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const created = await api.cases.create({
        firNumber: firNumber.trim(),
        title: title.trim(),
        crimeCategory,
        policeStation,
        jurisdiction,
        incidentLocation,
        incidentDate: new Date(incidentDate).toISOString(),
        description: description.trim() || undefined,
        priority,
      });

      // If initial document was attached, upload it
      if (initialFile) {
        try {
          const formData = new FormData();
          formData.append('title', `Certified Copy of ${firNumber}`);
          formData.append('documentType', 'FIR');
          formData.append('file', initialFile);
          await api.documents.upload(created.id, formData);
        } catch (uploadErr) {
          console.warn('Case created, but initial file upload failed:', uploadErr);
        }
      }

      if (onCaseCreated) onCaseCreated(created);
      onClose();
      navigate(`/cases/${created.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to register FIR and case.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4">
      <div className="bg-white rounded-md shadow-xl border border-slate-300 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden text-xs">
        {/* Modal Header */}
        <div className="bg-slate-50 px-6 py-3.5 flex items-center justify-between border-b border-slate-200 shrink-0">
          <div>
            <h2 className="font-bold text-sm text-slate-900">
              Register New FIR / Investigation Case
            </h2>
            <p className="text-[11px] text-slate-500">
              Complete official investigation particulars and jurisdictional assignment.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Case Identification */}
          <div className="space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-1">
              1. Case Identification
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  FIR Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={firNumber}
                  onChange={(e) => setFirNumber(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:border-blue-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Assigned Case Number
                </label>
                <input
                  type="text"
                  value={caseNumber}
                  readOnly
                  className="w-full bg-slate-100 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-600 font-mono cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Case Official Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Investigation into Digital Financial Extortion"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: Classification */}
          <div className="space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-1">
              2. Classification & Jurisdiction
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Crime Classification <span className="text-red-500">*</span>
                </label>
                <select
                  value={crimeCategory}
                  onChange={(e) => setCrimeCategory(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-600 focus:outline-none"
                >
                  <option value="Cyber Fraud">Cyber Fraud & Extortion</option>
                  <option value="Economic Offences">Economic Offences</option>
                  <option value="Forgery & Counterfeit">Forgery & Counterfeit</option>
                  <option value="Narcotics Smuggling">Narcotics Smuggling</option>
                  <option value="Organized Crime">Organized Crime</option>
                  <option value="Homicide">Homicide & Violent Crime</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Priority Level <span className="text-red-500">*</span>
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-600 focus:outline-none"
                >
                  <option value="URGENT">Urgent (Critical)</option>
                  <option value="HIGH">High Priority</option>
                  <option value="MEDIUM">Medium Priority</option>
                  <option value="LOW">Low Priority</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Police Station <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={policeStation}
                  onChange={(e) => setPoliceStation(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Jurisdiction <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 3: Incident Details */}
          <div className="space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-1">
              3. Incident Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Date of Incident
                </label>
                <input
                  type="date"
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Place of Incident / Scene
                </label>
                <input
                  type="text"
                  value={incidentLocation}
                  onChange={(e) => setIncidentLocation(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Brief Description / Complainant Particulars
              </label>
              <textarea
                rows={3}
                placeholder="Summary of complaint allegations, initial findings, and immediate investigation orders..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded p-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Section 4: Initial Documents */}
          <div className="space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-1">
              4. Initial FIR / Complaint Document
            </h3>
            <div className="border border-dashed border-slate-300 rounded p-4 text-center bg-slate-50/50 hover:bg-slate-50 transition cursor-pointer relative">
              <input
                type="file"
                onChange={(e) => e.target.files && setInitialFile(e.target.files[0])}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              {initialFile ? (
                <div className="flex items-center justify-center space-x-2 text-slate-800">
                  <FileText className="w-5 h-5 text-blue-700" />
                  <span className="font-medium">{initialFile.name}</span>
                  <span className="text-slate-500 font-mono">({(initialFile.size / 1024).toFixed(1)} KB)</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                  <div className="font-medium text-slate-700">Attach initial FIR copy or complaint (PDF, DOCX, TXT)</div>
                  <div className="text-[11px] text-slate-400">Optional. SHA-256 hash will be computed upon registration.</div>
                </div>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold shadow-xs transition disabled:opacity-50"
            >
              {isSubmitting ? 'Registering...' : 'Register Case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
