import React from 'react';
import { AuditLog } from '../types';
import { StatusBadge } from './StatusBadge';
import { AuditDetailFormatter } from './AuditDetailFormatter';
import {
  FilePlus,
  Eye,
  Download,
  Share2,
  Trash2,
  ShieldCheck,
  Sparkles,
  Archive,
  Briefcase,
  Layers,
  CircleDot,
} from 'lucide-react';

interface Props {
  events: AuditLog[];
}

export const CaseTimeline: React.FC<Props> = ({ events }) => {
  if (!events || events.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 font-sans bg-slate-50 border border-slate-200 rounded">
        No chronological milestones recorded for this case file yet.
      </div>
    );
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CASE_CREATED':
      case 'CASE_UPDATED':
        return <Briefcase className="w-3.5 h-3.5 text-blue-700" />;
      case 'DOCUMENT_UPLOADED':
        return <FilePlus className="w-3.5 h-3.5 text-blue-700" />;
      case 'DOCUMENT_VIEWED':
        return <Eye className="w-3.5 h-3.5 text-slate-500" />;
      case 'DOCUMENT_DOWNLOADED':
        return <Download className="w-3.5 h-3.5 text-slate-600" />;
      case 'DOCUMENT_SHARED':
        return <Share2 className="w-3.5 h-3.5 text-amber-600" />;
      case 'SHARE_REVOKED':
        return <Trash2 className="w-3.5 h-3.5 text-red-600" />;
      case 'VERSION_CREATED':
        return <Layers className="w-3.5 h-3.5 text-purple-700" />;
      case 'INTEGRITY_CHECK':
        return <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />;
      case 'AI_SUMMARY_GENERATED':
        return <Sparkles className="w-3.5 h-3.5 text-blue-600" />;
      case 'DOCUMENT_ARCHIVED':
      case 'DOCUMENT_INVALIDATED':
        return <Archive className="w-3.5 h-3.5 text-red-600" />;
      default:
        return <CircleDot className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="relative pl-6 space-y-4 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
      {events.map((ev, index) => (
        <div key={ev.id || index} className="relative group">
          {/* Milestone Node */}
          <div className="absolute -left-6 top-1 w-6 h-6 rounded-full bg-white border border-slate-300 flex items-center justify-center shadow-2xs">
            {getActionIcon(ev.action)}
          </div>

          {/* Event Content Card */}
          <div className="p-3.5 bg-white border border-slate-200 rounded shadow-2xs text-xs space-y-1.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-slate-900 font-mono text-[11px]">
                  {ev.action.replace(/_/g, ' ')}
                </span>
                <StatusBadge status={ev.status} className="text-[10px]" />
              </div>

              <span className="text-[11px] text-slate-500 font-mono">
                {new Date(ev.timestamp).toLocaleString()}
              </span>
            </div>

            <div className="flex items-center space-x-2 text-[11px] text-slate-600">
              <span>Executed by: <strong>{ev.user?.name || 'Authorized Official'}</strong></span>
              <span>•</span>
              <span className="text-slate-500">{ev.userRole?.replace('_', ' ')}</span>
              <span>•</span>
              <span className="font-mono text-slate-400">{ev.eventId}</span>
            </div>

            {ev.details && (
              <div className="pt-1.5 border-t border-slate-100">
                <AuditDetailFormatter
                  action={ev.action}
                  rawDetails={ev.details}
                  documentTitle={ev.document?.title}
                  caseTitle={ev.case?.title}
                />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
