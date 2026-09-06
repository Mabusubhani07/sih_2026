import React from 'react';

interface StatusBadgeProps {
  status: string;
  className?: string;
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '', showIcon = true }) => {
  const normalized = status?.toUpperCase().replace(/\s+/g, '_');

  let bg = 'bg-slate-100 text-slate-700 border-slate-200';
  let dot = 'bg-slate-400';

  switch (normalized) {
    // Verified / Active / Success / Ready
    case 'ACTIVE':
    case 'VERIFIED':
    case 'SUCCESS':
    case 'READY':
      bg = 'bg-emerald-50 text-emerald-800 border-emerald-200';
      dot = 'bg-emerald-600';
      break;

    // Under Investigation / In Progress / Processing
    case 'UNDER_INVESTIGATION':
    case 'REGISTERED':
      bg = 'bg-blue-50 text-blue-800 border-blue-200';
      dot = 'bg-blue-600';
      break;

    case 'PROCESSING':
    case 'UPLOADED':
      bg = 'bg-blue-50 text-blue-800 border-blue-200';
      dot = 'bg-blue-600 animate-status-dot-pulse';
      break;

    // Processing intermediate stages
    case 'OCR_COMPLETE':
    case 'CLASSIFIED':
    case 'METADATA_EXTRACTED':
    case 'INDEXED':
      bg = 'bg-cyan-50 text-cyan-800 border-cyan-200';
      dot = 'bg-cyan-600 animate-status-dot-pulse';
      break;

    // Forensic Examination / Lab
    case 'FORENSIC_ANALYSIS':
    case 'LAB_ANALYSIS':
      bg = 'bg-indigo-50 text-indigo-800 border-indigo-200';
      dot = 'bg-indigo-600';
      break;

    // Legal Review / Prosecution
    case 'LEGAL_REVIEW':
      bg = 'bg-amber-50 text-amber-800 border-amber-200';
      dot = 'bg-amber-600';
      break;

    // Court Submitted
    case 'COURT_SUBMITTED':
      bg = 'bg-purple-50 text-purple-800 border-purple-200';
      dot = 'bg-purple-600';
      break;

    // Closed / Archived / Disposed
    case 'CLOSED':
    case 'ARCHIVED':
    case 'DISPOSED':
      bg = 'bg-slate-100 text-slate-700 border-slate-300';
      dot = 'bg-slate-500';
      break;

    // Invalid / Compromised / Failure / Processing Failed
    case 'INVALID':
    case 'COMPROMISED':
    case 'FAILURE':
    case 'DENIED':
    case 'PROCESSING_FAILED':
      bg = 'bg-rose-50 text-rose-800 border-rose-200';
      dot = 'bg-rose-600';
      break;

    // Priority Levels
    case 'URGENT':
      bg = 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
      dot = 'bg-rose-600';
      break;
    case 'HIGH':
      bg = 'bg-orange-50 text-orange-800 border-orange-200 font-medium';
      dot = 'bg-orange-600';
      break;
    case 'MEDIUM':
      bg = 'bg-amber-50 text-amber-800 border-amber-200';
      dot = 'bg-amber-500';
      break;
    case 'LOW':
      bg = 'bg-slate-100 text-slate-600 border-slate-200';
      dot = 'bg-slate-400';
      break;

    // User Roles
    case 'ADMIN':
      bg = 'bg-slate-100 text-slate-800 border-slate-300 font-semibold';
      dot = 'bg-slate-600';
      break;
    case 'POLICE_OFFICER':
      bg = 'bg-blue-50 text-blue-800 border-blue-200';
      dot = 'bg-blue-600';
      break;
    case 'INVESTIGATOR':
      bg = 'bg-sky-50 text-sky-800 border-sky-200';
      dot = 'bg-sky-600';
      break;
    case 'FORENSIC_OFFICER':
      bg = 'bg-purple-50 text-purple-800 border-purple-200';
      dot = 'bg-purple-600';
      break;
    case 'LEGAL_OFFICER':
      bg = 'bg-amber-50 text-amber-800 border-amber-200';
      dot = 'bg-amber-600';
      break;
    case 'COURT_USER':
      bg = 'bg-emerald-50 text-emerald-800 border-emerald-200';
      dot = 'bg-emerald-600';
      break;

    default:
      break;
  }

  const label = status?.replace(/_/g, ' ') || 'UNKNOWN';

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border shrink-0 whitespace-nowrap ${bg} ${className}`}
    >
      {showIcon && <span className={`w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 ${dot}`} />}
      {label}
    </span>
  );
};
