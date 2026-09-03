import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Document, User, DocumentShare } from '../types';
import { Share2, X, AlertCircle, Trash2, ShieldCheck, UserCheck } from 'lucide-react';

interface Props {
  document: Document;
  onClose: () => void;
  onShareUpdated?: () => void;
}

export const ShareDocumentModal: React.FC<Props> = ({ document, onClose, onShareUpdated }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [permission, setPermission] = useState<'VIEW' | 'DOWNLOAD'>('VIEW');
  const [notes, setNotes] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [activeShares, setActiveShares] = useState<DocumentShare[]>(document.shares || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const list = await api.users.list();
        setUsers(list);
        if (list.length > 0) setSelectedUserId(list[0].id);
      } catch (err) {
        console.error('Failed to load users for sharing:', err);
      }
    };
    fetchUsers();
  }, []);

  const handleCreateShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;

    setIsSubmitting(true);
    setError('');

    try {
      const newShare = await api.documents.share(document.id, {
        sharedWithUserId: selectedUserId,
        permission,
        notes: notes.trim() || undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });

      setActiveShares((prev) => [newShare, ...prev]);
      setNotes('');
      onShareUpdated?.();
    } catch (err: any) {
      setError(err.message || 'Failed to grant clearance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (shareId: string) => {
    if (!window.confirm('Confirm revocation of this document clearance?')) return;

    try {
      await api.documents.revokeShare(document.id, shareId);
      setActiveShares((prev) => prev.filter((s) => s.id !== shareId));
      onShareUpdated?.();
    } catch (err: any) {
      alert(err.message || 'Failed to revoke clearance.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4">
      <div className="bg-white rounded-md shadow-xl border border-slate-300 w-full max-w-xl overflow-hidden text-xs">
        <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900">
              Controlled Document Sharing
            </h3>
            <p className="text-[11px] text-slate-500 font-mono">
              {document.documentNumber} • Authorized Need-to-Know Access
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Grant Clearance Form */}
          <form onSubmit={handleCreateShare} className="space-y-3 bg-slate-50 p-3.5 rounded border border-slate-200">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              Grant New Access Clearance:
            </span>

            {error && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded text-red-700">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Recipient Officer *</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  required
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Permission Level *</label>
                <select
                  value={permission}
                  onChange={(e) => setPermission(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                >
                  <option value="VIEW">Read-Only View</option>
                  <option value="DOWNLOAD">Full Access (View & Download)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Optional Expiry Date</label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Official Purpose / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. For statutory prosecution brief preparation"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="pt-1 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-medium rounded text-xs shadow-xs transition"
              >
                {isSubmitting ? 'Granting...' : 'Grant Access Clearance'}
              </button>
            </div>
          </form>

          {/* Active Shares List */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              Active Authorized Shares ({activeShares.length}):
            </span>

            {activeShares.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded text-center text-slate-500 border border-slate-200">
                No external shares active. Document is restricted to default assigned case team.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {activeShares.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 bg-white border border-slate-200 rounded flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">
                        {s.sharedWithUser?.name || 'Authorized Official'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Clearance: <strong className="text-blue-700">{s.permission}</strong> •{' '}
                        {s.expiresAt ? `Expires: ${new Date(s.expiresAt).toLocaleDateString()}` : 'Indefinite'}
                      </div>
                      {s.notes && <div className="text-[11px] text-slate-600 italic mt-0.5">"{s.notes}"</div>}
                    </div>

                    <button
                      onClick={() => handleRevoke(s.id)}
                      className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition"
                      title="Revoke Clearance"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

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
