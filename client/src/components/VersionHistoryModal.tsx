import React from 'react';
import { Document, DocumentVersion } from '../types';
import { api } from '../services/api';
import { Layers, X, Download, Copy, Check, Clock, FileText } from 'lucide-react';

interface Props {
  document: Document;
  onClose: () => void;
}

export const VersionHistoryModal: React.FC<Props> = ({ document, onClose }) => {
  const [copiedHash, setCopiedHash] = React.useState<string | null>(null);

  const handleCopy = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleDownload = async (ver: DocumentVersion) => {
    try {
      const blob = await api.documents.download(document.id, ver.versionNumber);
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = ver.originalFileName;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || 'Failed to download version.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4">
      <div className="bg-white rounded-md shadow-xl border border-slate-300 w-full max-w-3xl overflow-hidden text-xs">
        <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1 rounded bg-blue-700 text-white">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Version History Ledger
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                {document.documentNumber} • {document.title}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Version</th>
                <th className="py-2.5 px-3">Filename</th>
                <th className="py-2.5 px-3">Uploaded By</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Revision Changelog</th>
                <th className="py-2.5 px-3">SHA-256 Hash</th>
                <th className="py-2.5 px-3 text-right">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(document.versions || []).map((ver) => (
                <tr key={ver.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                    v{ver.versionNumber}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-800">
                    {ver.originalFileName}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">
                    {ver.uploadedBy?.name || 'Authorized Officer'}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                    {new Date(ver.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-2.5 px-3 text-slate-800 max-w-xs truncate" title={ver.changeSummary}>
                    {ver.changeSummary}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                    <button
                      onClick={() => handleCopy(ver.sha256Hash)}
                      className="hover:text-blue-700 flex items-center space-x-1"
                      title="Copy full hash"
                    >
                      <span>{ver.sha256Hash.substring(0, 10)}...</span>
                      {copiedHash === ver.sha256Hash ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3 text-slate-400" />
                      )}
                    </button>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => handleDownload(ver)}
                      className="p-1 text-blue-700 hover:bg-blue-50 rounded transition"
                      title="Download this version"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-slate-50 px-5 py-2.5 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded font-medium text-xs"
          >
            Close Ledger
          </button>
        </div>
      </div>
    </div>
  );
};
