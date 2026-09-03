import React from 'react';
import {
  Upload,
  FileCheck,
  HardDrive,
  ScanText,
  Layers,
  FileSpreadsheet,
  Network,
  ShieldCheck,
  Search,
  CheckCircle2,
  ArrowRight,
  ArrowDown,
} from 'lucide-react';

interface Stage {
  step: string;
  title: string;
  desc: string;
  icon: React.ElementType;
}

const STAGES: Stage[] = [
  { step: '01', title: 'DOCUMENT INGESTION', desc: 'Upload', icon: Upload },
  { step: '02', title: 'FILE VALIDATION', desc: 'Validate', icon: FileCheck },
  { step: '03', title: 'SECURE STORAGE', desc: 'Store + SHA-256', icon: HardDrive },
  { step: '04', title: 'TEXT EXTRACTION', desc: 'OCR / Native Text', icon: ScanText },
  { step: '05', title: 'DOCUMENT CLASSIFICATION', desc: 'Classify', icon: Layers },
  { step: '06', title: 'METADATA EXTRACTION', desc: 'Metadata', icon: FileSpreadsheet },
  { step: '07', title: 'HIERARCHICAL ORGANIZATION', desc: 'Organize', icon: Network },
  { step: '08', title: 'ACCESS AUTHORIZATION', desc: 'Authorize', icon: ShieldCheck },
  { step: '09', title: 'SEARCH INDEXING', desc: 'Index', icon: Search },
  { step: '10', title: 'READY', desc: 'Authorized Access', icon: CheckCircle2 },
];

export const DocumentWorkflowSection: React.FC = () => {
  const row1 = STAGES.slice(0, 5);
  const row2 = STAGES.slice(5, 10);

  return (
    <section id="workflow-section" className="py-12 sm:py-16 bg-white border-b border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading & Supporting Text */}
        <div className="max-w-3xl mx-auto text-center mb-10 sm:mb-12">
          <h2 className="text-xl font-bold tracking-tight text-[#0A192F] uppercase">
            Document Processing Workflow
          </h2>
          <div className="h-[2.5px] w-10 bg-[#1B56CA] mx-auto mt-2 mb-3.5 rounded-full"></div>
          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed max-w-2xl mx-auto">
            Every document follows a controlled processing lifecycle designed to preserve integrity,
            traceability, security and authorized access.
          </p>
        </div>

        {/* Desktop 5 + 5 Process Layout (1024px and above) */}
        <div className="hidden lg:block space-y-3">
          {/* Row 1: 01 -> 02 -> 03 -> 04 -> 05 */}
          <div className="grid grid-cols-5 gap-2.5 xl:gap-3 items-center">
            {row1.map((stage, idx) => (
              <div key={stage.step} className="flex items-center">
                <div className="flex-1 bg-white border border-slate-200/90 rounded-[6px] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition flex flex-col justify-between min-h-[104px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-[#1B56CA] bg-[#EBF3FE] px-1.5 py-0.5 rounded">
                      {stage.step}
                    </span>
                    <stage.icon className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="mt-2.5">
                    <div className="font-bold text-[11px] uppercase tracking-wide text-[#0A192F] leading-tight">
                      {stage.title}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                      {stage.desc}
                    </div>
                  </div>
                </div>
                {idx < 4 && (
                  <div className="px-1.5 shrink-0 text-slate-300">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Row Progression Transition Arrow */}
          <div className="flex justify-end pr-8 py-1">
            <div className="flex items-center space-x-1 text-[10px] text-slate-400 font-mono">
              <span className="text-[9px] uppercase tracking-wider text-slate-400">Pipeline Progression</span>
              <ArrowDown className="w-3 h-3 text-[#1B56CA]" />
            </div>
          </div>

          {/* Row 2: 06 -> 07 -> 08 -> 09 -> 10 */}
          <div className="grid grid-cols-5 gap-2.5 xl:gap-3 items-center">
            {row2.map((stage, idx) => {
              const isReady = stage.step === '10';
              return (
                <div key={stage.step} className="flex items-center">
                  <div
                    className={`flex-1 bg-white border rounded-[6px] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition flex flex-col justify-between min-h-[104px] ${
                      isReady ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200/90'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          isReady ? 'text-emerald-700 bg-emerald-100/70' : 'text-[#1B56CA] bg-[#EBF3FE]'
                        }`}
                      >
                        {stage.step}
                      </span>
                      <stage.icon
                        className={`w-4 h-4 ${isReady ? 'text-emerald-600' : 'text-slate-500'}`}
                      />
                    </div>
                    <div className="mt-2.5">
                      <div className="font-bold text-[11px] uppercase tracking-wide text-[#0A192F] leading-tight">
                        {stage.title}
                      </div>
                      <div
                        className={`text-[10px] font-medium mt-0.5 ${
                          isReady ? 'text-emerald-700 font-semibold' : 'text-slate-500'
                        }`}
                      >
                        {stage.desc}
                      </div>
                    </div>
                  </div>
                  {idx < 4 && (
                    <div className="px-1.5 shrink-0 text-slate-300">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tablet 2-Column Wrapped Layout (640px to 1023px) */}
        <div className="hidden sm:grid lg:hidden sm:grid-cols-2 gap-3.5">
          {STAGES.map((stage) => {
            const isReady = stage.step === '10';
            return (
              <div
                key={stage.step}
                className={`bg-white border rounded-[6px] p-3.5 shadow-2xs flex items-start space-x-3 ${
                  isReady ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200/90'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    isReady ? 'bg-emerald-100 text-emerald-700' : 'bg-[#EBF3FE] text-[#1B56CA]'
                  }`}
                >
                  <stage.icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono font-bold text-slate-400">
                      STAGE {stage.step}
                    </span>
                  </div>
                  <div className="font-bold text-xs uppercase tracking-wide text-[#0A192F] mt-0.5">
                    {stage.title}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {stage.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile Vertical Timeline Layout (< 640px e.g. 390px) */}
        <div className="sm:hidden relative pl-6 space-y-3.5 before:content-[''] before:absolute before:top-2 before:bottom-2 before:left-2.5 before:w-0.5 before:bg-slate-200">
          {STAGES.map((stage) => {
            const isReady = stage.step === '10';
            return (
              <div key={stage.step} className="relative">
                {/* Timeline node */}
                <div
                  className={`absolute -left-[27px] top-3 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center shadow-2xs ${
                    isReady ? 'bg-emerald-600' : 'bg-[#1B56CA]'
                  }`}
                ></div>

                <div
                  className={`bg-white border rounded-[6px] p-3 shadow-2xs ${
                    isReady ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200/90'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        isReady ? 'text-emerald-700 bg-emerald-100' : 'text-[#1B56CA] bg-[#EBF3FE]'
                      }`}
                    >
                      STAGE {stage.step}
                    </span>
                    <stage.icon
                      className={`w-3.5 h-3.5 ${isReady ? 'text-emerald-600' : 'text-slate-400'}`}
                    />
                  </div>
                  <div className="font-bold text-xs uppercase tracking-wide text-[#0A192F] mt-1.5 leading-tight">
                    {stage.title}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {stage.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
