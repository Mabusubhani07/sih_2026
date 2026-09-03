import React from 'react';

interface Props {
  action: string;
  rawDetails?: string | null;
  documentTitle?: string | null;
  caseTitle?: string | null;
  compact?: boolean;
}

export const AuditDetailFormatter: React.FC<Props> = ({
  action,
  rawDetails,
  documentTitle,
  caseTitle,
  compact = false,
}) => {
  let parsed: Record<string, any> | null = null;

  if (rawDetails) {
    const trimmed = rawDetails.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        parsed = null;
      }
    }
  }

  if (parsed) {
    return (
      <div className="space-y-1 text-slate-700 break-words text-xs">
        {parsed.documentNumber && (
          <div className="flex flex-wrap items-baseline gap-1">
            <span className="text-slate-500 font-medium">Document:</span>
            <span className="font-mono font-semibold text-slate-900">{parsed.documentNumber}</span>
            {parsed.title && <span className="text-slate-600">({parsed.title})</span>}
          </div>
        )}

        {parsed.caseNumber && (
          <div className="flex flex-wrap items-baseline gap-1">
            <span className="text-slate-500 font-medium">Case:</span>
            <span className="font-mono font-semibold text-blue-800">{parsed.caseNumber}</span>
            {parsed.firNumber && <span className="font-mono text-slate-600">[{parsed.firNumber}]</span>}
          </div>
        )}

        {parsed.fileName && (
          <div className="flex flex-wrap items-baseline gap-1">
            <span className="text-slate-500 font-medium">File:</span>
            <span className="font-mono text-slate-800 break-all">{parsed.fileName}</span>
          </div>
        )}

        {parsed.version !== undefined && (
          <div className="flex flex-wrap items-baseline gap-1">
            <span className="text-slate-500 font-medium">Version:</span>
            <span className="font-mono font-semibold text-blue-700">v{parsed.version}</span>
          </div>
        )}

        {parsed.newVersion !== undefined && (
          <div className="flex flex-wrap items-baseline gap-1">
            <span className="text-slate-500 font-medium">Version:</span>
            <span className="font-mono font-semibold text-blue-700">v{parsed.newVersion}</span>
            {parsed.previousVersion !== undefined && (
              <span className="text-slate-500 text-[11px]">(supersedes v{parsed.previousVersion})</span>
            )}
          </div>
        )}

        {parsed.sharedWithUser && (
          <div className="flex flex-wrap items-baseline gap-1">
            <span className="text-slate-500 font-medium">Shared with:</span>
            <span className="font-semibold text-slate-900">{parsed.sharedWithUser}</span>
            {parsed.permission && (
              <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-mono text-[10px] border border-slate-200">
                {parsed.permission}
              </span>
            )}
          </div>
        )}

        {parsed.changeSummary && (
          <div className="text-[11px] text-slate-600 italic">
            "{parsed.changeSummary}"
          </div>
        )}

        {parsed.sha256 && (
          <div className="flex flex-wrap items-baseline gap-1 text-[10px]">
            <span className="text-slate-500 font-medium">SHA-256:</span>
            <span className="font-mono text-slate-600 break-all select-all">
              {compact ? `${parsed.sha256.substring(0, 16)}...` : parsed.sha256}
            </span>
          </div>
        )}

        {parsed.ip && (
          <div className="text-[10px] text-slate-500">
            Station IP: <span className="font-mono">{parsed.ip}</span>
            {parsed.station && ` (${parsed.station})`}
          </div>
        )}
      </div>
    );
  }

  // Plain string or fallback
  const textContent = rawDetails || documentTitle || caseTitle || 'Official system action logged.';
  return (
    <div className="text-slate-700 break-words leading-relaxed text-xs">
      {textContent}
    </div>
  );
};
