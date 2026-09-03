import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Document, SummaryResult } from '../types';
import {
  Sparkles,
  X,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  FileText,
  CheckCircle,
} from 'lucide-react';

interface Props {
  document: Document;
  onClose: () => void;
}

export const SummaryDrawer: React.FC<Props> = ({ document, onClose }) => {
  const [summary, setSummary] = useState<SummaryResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchSummary = async () => {
    setIsLoading(true);
    try {
      const data = await api.ai.summarize(document.id);
      setSummary(data);
    } catch (err: any) {
      alert(err.message || 'Failed to generate AI summary.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [document.id]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-2xs">
      <div className="w-full max-w-lg bg-white border-l border-slate-300 h-full shadow-2xl flex flex-col overflow-hidden text-xs font-sans">
        {/* Header */}
        <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <div className="p-1 rounded bg-blue-700 text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Document Advisory Analysis
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                {document.documentNumber} • Automated Text Extraction & Entity Analysis
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchSummary}
              className="p-1 hover:bg-slate-200 rounded text-slate-600 transition"
              title="Regenerate Analysis"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Advisory Notice */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-800 flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <div className="text-[11px] leading-relaxed">
              <strong className="block font-semibold">Advisory Notice:</strong>
              Automated extraction summaries must be independently reviewed and verified by the investigating officer before incorporating into official case records.
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <div className="w-6 h-6 border-2 border-slate-300 border-t-blue-700 rounded-full animate-spin mx-auto"></div>
              <div>Analyzing document content and extracting evidentiary entities...</div>
            </div>
          ) : summary ? (
            <>
              {/* Executive Summary */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-1">
                  Executive Summary
                </h4>
                <p className="text-slate-800 leading-relaxed bg-slate-50 p-3 rounded border border-slate-200">
                  {summary.executiveSummary}
                </p>
              </div>

              {/* Identified Entities */}
              {summary.involvedEntities && summary.involvedEntities.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-1">
                    Identified Persons, Accounts & Identifiers
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {summary.involvedEntities.map((ent: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200 text-xs font-mono"
                      >
                        {ent}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Findings */}
              {summary.keyFindings && summary.keyFindings.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-1">
                    Factual Evidentiary Deductions
                  </h4>
                  <div className="space-y-1.5">
                    {summary.keyFindings.map((finding: string, idx: number) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-800 flex items-start space-x-2 text-xs"
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{finding}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Actions */}
              {summary.recommendedActions && summary.recommendedActions.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-1">
                    Recommended Investigation Actions
                  </h4>
                  <div className="space-y-1.5">
                    {summary.recommendedActions.map((action: string, idx: number) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-800 flex items-start space-x-2 text-xs"
                      >
                        <ArrowRight className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-100 flex justify-between">
                <span>Analysis Engine: {summary.source}</span>
                <span>Generated: {new Date(summary.generatedAt).toLocaleTimeString()}</span>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded text-xs font-medium"
          >
            Close Analysis
          </button>
        </div>
      </div>
    </div>
  );
};
