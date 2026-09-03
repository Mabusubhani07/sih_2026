import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const AccessDenied: React.FC = () => {
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-4">
      <div className="bg-white border border-slate-300 rounded shadow-sm p-8 max-w-md w-full text-center space-y-4 text-xs">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-700 border border-red-200 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <div>
          <span className="font-mono text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
            HTTP 403 Forbidden
          </span>
          <h2 className="text-base font-bold text-slate-900 mt-2">
            Access Restricted
          </h2>
          <p className="text-slate-600 mt-1 leading-relaxed">
            You do not possess the required departmental clearance or case authorization level to access this official investigation record.
          </p>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded text-left space-y-1 text-[11px] text-slate-600">
          <div>Clearance Check: <span className="text-red-700 font-semibold">Denied</span></div>
          <div>Audit Incident: <span className="text-slate-800">Logged to System Ledger</span></div>
          <div>Security Policy: <span className="text-slate-800">Statutory Need-to-Know</span></div>
        </div>

        <div className="pt-2">
          <Link
            to="/dashboard"
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-medium shadow-2xs transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
