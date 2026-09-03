import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { User } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Users, Search, RefreshCw } from 'lucide-react';

export const UsersManagementPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await api.users.list({ search: search.trim() || undefined });
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (user: User) => {
    const nextStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    if (
      !window.confirm(
        `Confirm ${nextStatus === 'SUSPENDED' ? 'suspension' : 're-activation'} of clearance for ${user.name}?`
      )
    ) {
      return;
    }

    try {
      await api.users.updateStatus(user.id, nextStatus as any);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus as any } : u))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update user status.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Personnel & Clearances
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Manage authorized investigation personnel, departmental roles, and access credentials.
          </p>
        </div>

        <button
          onClick={fetchUsers}
          className="p-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded transition shadow-2xs self-start sm:self-auto"
          title="Refresh List"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded p-3 shadow-2xs">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchUsers();
          }}
          className="relative max-w-md text-xs"
        >
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, official email, or badge number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600"
          />
        </form>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Loading personnel directory...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3.5">Officer Name & Badge</th>
                  <th className="py-2.5 px-3.5">Official Email</th>
                  <th className="py-2.5 px-3.5">Department</th>
                  <th className="py-2.5 px-3.5">Assigned Role</th>
                  <th className="py-2.5 px-3.5">Status</th>
                  <th className="py-2.5 px-3.5">Last Login</th>
                  <th className="py-2.5 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3.5">
                      <div className="font-semibold text-slate-900">{u.name}</div>
                      <div className="text-[11px] text-slate-500">Badge: {u.badgeNumber}</div>
                    </td>

                    <td className="py-2.5 px-3.5 text-slate-700 text-xs font-medium">
                      {u.email}
                    </td>

                    <td className="py-2.5 px-3.5 text-slate-800">
                      {u.department?.name || u.departmentCode}
                    </td>

                    <td className="py-2.5 px-3.5">
                      <StatusBadge status={u.role} className="text-[10px]" />
                    </td>

                    <td className="py-2.5 px-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-red-50 text-red-800 border-red-200'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>

                    <td className="py-2.5 px-3.5 text-slate-500 text-xs">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never logged in'}
                    </td>

                    <td className="py-2.5 px-3.5 text-right">
                      {u.role !== 'ADMIN' && (
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                            u.status === 'ACTIVE'
                              ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {u.status === 'ACTIVE' ? 'Suspend Access' : 'Reactivate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
