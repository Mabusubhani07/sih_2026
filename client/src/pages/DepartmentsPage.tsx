import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Department } from '../types';
import { Building2, RefreshCw } from 'lucide-react';

export const DepartmentsPage: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchDepts = async () => {
    setIsLoading(true);
    try {
      const data = await api.users.getDepartments();
      setDepartments(data);
    } catch (err) {
      console.error('Failed to load departments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDepts();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Departmental Units
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Registered law enforcement divisions, forensic laboratories, and prosecution agencies.
          </p>
        </div>

        <button
          onClick={fetchDepts}
          className="p-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded transition shadow-2xs self-start sm:self-auto"
          title="Refresh List"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((dept) => (
          <div
            key={dept.id}
            className="bg-white border border-slate-200 rounded p-4 shadow-2xs space-y-3 text-xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-xs">
                {dept.code}
              </span>
              <Building2 className="w-4 h-4 text-slate-400" />
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">{dept.name}</h3>
              <p className="text-slate-600 text-[11px] mt-1 leading-relaxed">
                {dept.description || 'Official government department unit.'}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-slate-50 rounded border border-slate-200">
                <div className="font-bold text-slate-900 text-sm">{dept._count?.users ?? 0}</div>
                <div className="text-[10px] text-slate-500">Personnel</div>
              </div>
              <div className="p-2 bg-slate-50 rounded border border-slate-200">
                <div className="font-bold text-slate-900 text-sm">{dept._count?.cases ?? 0}</div>
                <div className="text-[10px] text-slate-500">Cases</div>
              </div>
              <div className="p-2 bg-slate-50 rounded border border-slate-200">
                <div className="font-bold text-slate-900 text-sm">{dept._count?.documents ?? 0}</div>
                <div className="text-[10px] text-slate-500">Documents</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
