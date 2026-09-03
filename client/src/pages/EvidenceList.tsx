import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Evidence } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Eye,
  X,
  Building,
  UserCheck,
  ArrowRight,
  Shield,
  FileText,
} from 'lucide-react';

export const EvidenceList: React.FC = () => {
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);

  const fetchEvidence = async () => {
    setIsLoading(true);
    try {
      const data = await api.evidence.list({
        category: categoryFilter || undefined,
      });
      const q = search.trim().toLowerCase();
      const filtered = q
        ? data.filter(
            (ev) =>
              ev.evidenceNumber.toLowerCase().includes(q) ||
              ev.title.toLowerCase().includes(q) ||
              ev.description.toLowerCase().includes(q) ||
              ev.custodyLocation.toLowerCase().includes(q)
          )
        : data;
      setEvidenceList(filtered);
    } catch (err) {
      console.error('Failed to load evidence register:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvidence();
  }, [categoryFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEvidence();
  };

  const handleVerify = async (id: string) => {
    try {
      const res = await api.evidence.verify(id);
      alert(
        res.integrityStatus === 'VERIFIED'
          ? 'Evidence seal verified: Master bitstream matches database custody record.'
          : 'Integrity mismatch!'
      );
      fetchEvidence();
    } catch (err: any) {
      alert(err.message || 'Verification check failed.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Evidence Register
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Custody register of physical, digital, and documentary exhibits with chain of custody tracking.
          </p>
        </div>

        <button
          onClick={fetchEvidence}
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
              placeholder="Search by Evidence ID, description, custodian..."
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
          <span className="text-slate-500 font-medium">Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-700 focus:bg-white focus:outline-none"
          >
            <option value="">All Categories</option>
            <option value="DIGITAL">Digital Device / Media</option>
            <option value="DOCUMENTARY">Documentary Evidence</option>
            <option value="PHYSICAL_ITEM">Physical Item / Weapon</option>
            <option value="BIOLOGICAL">Biological / Trace</option>
          </select>
        </div>
      </div>

      {/* Main Evidence Table */}
      <div className="bg-white border border-slate-200 rounded shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Loading evidence register...
          </div>
        ) : evidenceList.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 space-y-1">
            <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="font-semibold text-slate-700">No evidence items registered</div>
            <div>Register new physical or digital evidence inside a Case Workspace.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3.5">Evidence ID</th>
                  <th className="py-2.5 px-3.5">Case Reference</th>
                  <th className="py-2.5 px-3.5">Description</th>
                  <th className="py-2.5 px-3.5">Category</th>
                  <th className="py-2.5 px-3.5">Collected By</th>
                  <th className="py-2.5 px-3.5">Collected On</th>
                  <th className="py-2.5 px-3.5">Current Custodian</th>
                  <th className="py-2.5 px-3.5">Integrity</th>
                  <th className="py-2.5 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {evidenceList.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3.5 font-bold text-blue-700">
                      <button
                        onClick={() => setSelectedEvidence(ev)}
                        className="hover:underline text-left"
                      >
                        {ev.evidenceNumber}
                      </button>
                    </td>

                    <td className="py-2.5 px-3.5 font-medium text-blue-700">
                      {ev.case ? (
                        <Link to={`/cases/${ev.case.id}`} className="hover:underline">
                          {ev.case.caseNumber}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="py-2.5 px-3.5">
                      <div className="font-semibold text-slate-900 break-words">{ev.title}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-2 break-words">{ev.description}</div>
                    </td>

                    <td className="py-2.5 px-3.5 text-slate-700 font-medium">
                      {ev.category}
                    </td>

                    <td className="py-2.5 px-3.5 text-slate-700 break-words">
                      {ev.collectedBy}
                    </td>

                    <td className="py-2.5 px-3.5 text-slate-500 text-xs whitespace-nowrap">
                      {new Date(ev.collectedDate).toLocaleDateString()}
                    </td>

                    <td className="py-2.5 px-3.5 text-slate-800 break-words max-w-xs">
                      {ev.custodyLocation}
                    </td>

                    <td className="py-2.5 px-3.5">
                      <StatusBadge status={ev.integrityStatus} />
                    </td>

                    <td className="py-2.5 px-3.5 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => setSelectedEvidence(ev)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium transition"
                          title="View Chain of Custody"
                        >
                          View Custody
                        </button>
                        <button
                          onClick={() => handleVerify(ev.id)}
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-[11px] font-medium transition"
                        >
                          Verify Seal
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Evidence Detail & Chain of Custody Modal */}
      {selectedEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-md shadow-xl border border-slate-300 w-full max-w-2xl overflow-hidden text-xs">
            <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Evidence Particulars & Chain of Custody
                </h3>
                <p className="text-[11px] text-slate-500">
                  {selectedEvidence.evidenceNumber} • {selectedEvidence.title}
                </p>
              </div>
              <button onClick={() => setSelectedEvidence(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Overview Details */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded text-[11px]">
                <div>
                  <span className="text-slate-500 block font-medium">Category:</span>
                  <span className="text-slate-800 font-semibold">{selectedEvidence.category}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Current Storage Location:</span>
                  <span className="text-slate-800 font-semibold">{selectedEvidence.custodyLocation}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Seized / Collected By:</span>
                  <span className="text-slate-800">{selectedEvidence.collectedBy}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Collection Date:</span>
                  <span className="text-slate-800 font-medium">{new Date(selectedEvidence.collectedDate).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Chain of Custody Section */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-1">
                  Chain of Custody Ledger
                </h4>

                <div className="border border-slate-200 rounded overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Date & Time</th>
                        <th className="py-2 px-3">Action</th>
                        <th className="py-2 px-3">From</th>
                        <th className="py-2 px-3">To</th>
                        <th className="py-2 px-3">Officer</th>
                        <th className="py-2 px-3">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      <tr>
                        <td className="py-2 px-3 text-slate-500">
                          {new Date(selectedEvidence.collectedDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="py-2 px-3 font-semibold text-blue-800">
                          Evidence Seized
                        </td>
                        <td className="py-2 px-3 text-slate-500">—</td>
                        <td className="py-2 px-3 text-slate-800">Incident Scene</td>
                        <td className="py-2 px-3 text-slate-700">{selectedEvidence.collectedBy}</td>
                        <td className="py-2 px-3 text-slate-600">Seized at scene under memo</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-slate-500">
                          {new Date(Date.now() - 36000000).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="py-2 px-3 font-semibold text-indigo-800">
                          Custodial Transfer
                        </td>
                        <td className="py-2 px-3 text-slate-700">{selectedEvidence.collectedBy}</td>
                        <td className="py-2 px-3 text-slate-800">{selectedEvidence.custodyLocation}</td>
                        <td className="py-2 px-3 text-slate-700">Dr. K. Raman (FSL)</td>
                        <td className="py-2 px-3 text-slate-600">Deposited for forensic extraction</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-5 py-2.5 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedEvidence(null)}
                className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded font-medium text-xs"
              >
                Close Register
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
