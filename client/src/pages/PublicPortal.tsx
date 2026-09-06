import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DiempBadge } from '../components/DiempBadge';
import { DocumentWorkflowSection } from '../components/DocumentWorkflowSection';
import {
  Lock,
  FileText,
  FolderGit2,
  PackageCheck,
  ShieldCheck,
  UserCheck,
  ClipboardList,
  Menu,
  X,
} from 'lucide-react';

export const PublicPortal: React.FC = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] text-slate-900 font-sans flex flex-col selection:bg-blue-100 selection:text-blue-900">
      {/* 1. Header (Exact structure matching reference) */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Left: Star Crest Emblem + Title */}
          <div
            className="flex items-center space-x-3 cursor-pointer py-1"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <DiempBadge variant="navy" size={44} className="shrink-0 drop-shadow-2xs" />
            <div className="flex flex-col justify-center">
              <span className="font-bold text-lg tracking-tight text-[#0A192F] leading-none">
                DIEMP
              </span>
              <span className="text-[11px] font-semibold text-slate-700 leading-tight mt-1">
                Digital Investigation &amp;
              </span>
              <span className="text-[11px] font-semibold text-slate-700 leading-tight">
                Evidence Management Platform
              </span>
            </div>
          </div>

          {/* Right Navigation */}
          <nav className="hidden md:flex items-center space-x-8 text-xs font-semibold text-slate-800">
            <button
              onClick={() => scrollToSection('about-section')}
              className="hover:text-[#1B56CA] transition-colors duration-150 cursor-pointer"
            >
              About
            </button>
            <button
              onClick={() => scrollToSection('capabilities-section')}
              className="hover:text-[#1B56CA] transition-colors duration-150 cursor-pointer"
            >
              Portal Information
            </button>
            <button
              onClick={() => scrollToSection('workflow-section')}
              className="hover:text-[#1B56CA] transition-colors duration-150 cursor-pointer"
            >
              Workflow
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-700 hover:text-slate-950 transition-colors"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-5 py-3 space-y-2 text-xs font-semibold toast-drop-fade">
            <button
              onClick={() => scrollToSection('about-section')}
              className="block w-full text-left py-1.5 text-slate-700 hover:text-[#1B56CA] transition-colors"
            >
              About
            </button>
            <button
              onClick={() => scrollToSection('capabilities-section')}
              className="block w-full text-left py-1.5 text-slate-700 hover:text-[#1B56CA] transition-colors"
            >
              Portal Information
            </button>
            <button
              onClick={() => scrollToSection('workflow-section')}
              className="block w-full text-left py-1.5 text-slate-700 hover:text-[#1B56CA] transition-colors"
            >
              Workflow
            </button>
          </div>
        )}
      </header>

      {/* Main Container with subtle page-entry animation */}
      <main className="flex-1 bg-white portal-entry-animate">
        {/* 2. Hero Section with subtle Data Flow Lines */}
        <section className="relative bg-gradient-to-b from-[#F8FAFD] to-white border-b border-slate-200/70 py-10 sm:py-14 lg:py-16 overflow-hidden">
          {/* Subtle Data Flow Lines Background (Right -> Left, Linear, Infinite) */}
          <div className="hero-flow-container" aria-hidden="true">
            {/* Mobile (3 lines) */}
            <div className="hero-flow-line" style={{ top: '14%', width: '320px', animationDuration: '22s', animationDelay: '-3s' }} />
            <div className="hero-flow-line" style={{ top: '44%', width: '240px', animationDuration: '27s', animationDelay: '-10s' }} />
            <div className="hero-flow-line" style={{ top: '76%', width: '280px', animationDuration: '21s', animationDelay: '-16s' }} />

            {/* Tablet (+2 lines = 5 lines) */}
            <div className="hero-flow-line hidden sm:block" style={{ top: '26%', width: '260px', animationDuration: '30s', animationDelay: '-6s' }} />
            <div className="hero-flow-line hidden sm:block" style={{ top: '88%', width: '300px', animationDuration: '24s', animationDelay: '-19s' }} />

            {/* Desktop (+3 lines = 8 lines) */}
            <div className="hero-flow-line hidden lg:block" style={{ top: '7%', width: '190px', animationDuration: '26s', animationDelay: '-13s' }} />
            <div className="hero-flow-line hidden lg:block" style={{ top: '58%', width: '340px', animationDuration: '20s', animationDelay: '-8s' }} />
            <div className="hero-flow-line hidden lg:block" style={{ top: '93%', width: '220px', animationDuration: '29s', animationDelay: '-22s' }} />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
              {/* Left Column: Heading, description, CTA */}
              <div className="lg:col-span-6 space-y-4">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0A192F] leading-[1.18]">
                    Digital Investigation &amp;
                    <span className="block mt-1">Evidence Management Platform</span>
                  </h1>
                  <div className="h-[3px] w-12 bg-[#1B56CA] mt-3 mb-5"></div>
                </div>

                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed max-w-lg">
                  A secure, centralized platform for investigation case records, evidence documentation,
                  document management and controlled information access.
                </p>

                <div className="pt-2">
                  <button
                    onClick={() => navigate('/login')}
                    className="inline-flex items-center space-x-2 px-6 py-2.5 bg-[#1B56CA] hover:bg-[#1545A5] text-white rounded-[4px] font-semibold text-xs sm:text-sm shadow-sm transition active:scale-[0.99] cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Login</span>
                  </button>
                  <p className="text-[11px] text-slate-500 font-medium mt-2">
                    Authorized personnel only
                  </p>
                </div>
              </div>

              {/* Right Column: Hero Workspace Image with Official Plaque */}
              <div className="lg:col-span-6">
                <div className="relative rounded-lg overflow-hidden border border-slate-200/90 shadow-sm bg-white">
                  <img
                    src="/images/diemp_hero_workspace.jpg"
                    alt="DIEMP Investigation Workspace"
                    className="w-full h-[290px] sm:h-[350px] lg:h-[380px] object-cover"
                  />

                  {/* Official Investigation Crest Watermark in Top-Right */}
                  <div className="absolute top-4 right-4 flex flex-col items-center text-center text-white bg-slate-950/65 backdrop-blur-2xs px-3.5 py-2.5 rounded border border-white/25 shadow-md">
                    <DiempBadge variant="white" size={38} className="drop-shadow-sm" />
                    <div className="font-bold tracking-widest text-[10px] mt-1.5 leading-none">
                      INVESTIGATION
                    </div>
                    <div className="text-[7.5px] tracking-wider text-slate-200 mt-1 font-medium leading-none">
                      INTEGRITY • SECURITY • JUSTICE
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. About DIEMP Section (Centered) */}
        <section id="about-section" className="py-12 sm:py-16 bg-white border-b border-slate-200/60">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[#0A192F]">
                About DIEMP
              </h2>
              <div className="h-[2.5px] w-10 bg-[#1B56CA] mx-auto mt-2 rounded-full"></div>
            </div>

            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed max-w-2xl mx-auto">
              DIEMP provides a unified digital environment to manage the complete lifecycle of
              investigation records, evidence and official documents with integrity, security and
              accountability.
            </p>
          </div>
        </section>

        {/* 4. Core Capabilities Section (6 Items) */}
        <section id="capabilities-section" className="py-12 sm:py-16 bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {/* 1. Case Management */}
              <div className="bg-white border border-slate-200/90 rounded-[8px] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition flex items-start space-x-4 interactive-card">
                <div className="w-12 h-12 rounded-full bg-[#EBF3FE] text-[#1B56CA] flex items-center justify-center shrink-0 mt-0.5">
                  <FolderGit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-[#0A192F]">
                    Case Management
                  </h3>
                  <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                    Centralized investigation case records, case linking, workflow tracking and status management.
                  </p>
                </div>
              </div>

              {/* 2. Document Management */}
              <div className="bg-white border border-slate-200/90 rounded-[8px] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition flex items-start space-x-4 interactive-card">
                <div className="w-12 h-12 rounded-full bg-[#EBF3FE] text-[#1B56CA] flex items-center justify-center shrink-0 mt-0.5">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-[#0A192F]">
                    Document Management
                  </h3>
                  <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                    Secure storage, classification, version control, metadata management and efficient document retrieval.
                  </p>
                </div>
              </div>

              {/* 3. Evidence Management */}
              <div className="bg-white border border-slate-200/90 rounded-[8px] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition flex items-start space-x-4 interactive-card">
                <div className="w-12 h-12 rounded-full bg-[#EBF3FE] text-[#1B56CA] flex items-center justify-center shrink-0 mt-0.5">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-[#0A192F]">
                    Evidence Management
                  </h3>
                  <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                    Structured evidence records linked to cases and documents with chain of custody management.
                  </p>
                </div>
              </div>

              {/* 4. Document Integrity */}
              <div className="bg-white border border-slate-200/90 rounded-[8px] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition flex items-start space-x-4 interactive-card">
                <div className="w-12 h-12 rounded-full bg-[#EBF3FE] text-[#1B56CA] flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-[#0A192F]">
                    Document Integrity
                  </h3>
                  <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                    SHA-256 based integrity verification, tamper detection and complete version traceability.
                  </p>
                </div>
              </div>

              {/* 5. Controlled Access */}
              <div className="bg-white border border-slate-200/90 rounded-[8px] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition flex items-start space-x-4 interactive-card">
                <div className="w-12 h-12 rounded-full bg-[#EBF3FE] text-[#1B56CA] flex items-center justify-center shrink-0 mt-0.5">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-[#0A192F]">
                    Controlled Access
                  </h3>
                  <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                    Role, department, case and document-level authorization ensuring need-to-know access only.
                  </p>
                </div>
              </div>

              {/* 6. Auditability */}
              <div className="bg-white border border-slate-200/90 rounded-[8px] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition flex items-start space-x-4 interactive-card">
                <div className="w-12 h-12 rounded-full bg-[#EBF3FE] text-[#1B56CA] flex items-center justify-center shrink-0 mt-0.5">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-[#0A192F]">
                    Auditability
                  </h3>
                  <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                    Comprehensive audit logging of user actions, document activities and system operations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 10-Step Document Processing Workflow */}
        <DocumentWorkflowSection />

        {/* 5. Secondary Information / Authorized Access */}
        <section className="py-10 sm:py-14 bg-white border-t border-slate-200/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white border border-slate-200 rounded-[10px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)] grid grid-cols-1 md:grid-cols-12 items-center">
              {/* Left Image: Authorized Detective / Officer */}
              <div className="md:col-span-5 h-64 md:h-80 overflow-hidden bg-slate-100">
                <img
                  src="/images/diemp_authorized_access.jpg"
                  alt="Authorized Investigation Personnel"
                  className="w-full h-full object-cover object-center"
                />
              </div>

              {/* Right Content */}
              <div className="md:col-span-7 p-6 sm:p-8 lg:p-10 space-y-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[#0A192F] uppercase">
                    Authorized Access
                  </h2>
                  <div className="h-[2.5px] w-10 bg-[#1B56CA] mt-2 mb-4"></div>
                </div>

                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                  This portal is intended for authorized personnel of participating investigation,
                  law-enforcement, forensic, legal, administrative and judicial departments.
                </p>

                <div className="pt-2">
                  <div className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded">
                    <Lock className="w-3.5 h-3.5 text-[#1B56CA]" />
                    <span>Authorized Personnel Access Only • Official Credentials Required</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 6. Footer (Deep Navy matching reference) */}
      <footer className="bg-[#0B1E33] text-slate-300 text-xs border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Column 1: Star Crest + DIEMP Branding */}
            <div className="md:col-span-5 space-y-2.5">
              <div className="flex items-center space-x-3">
                <DiempBadge variant="white" size={38} className="shrink-0" />
                <div className="flex flex-col">
                  <span className="font-bold text-base tracking-tight text-white leading-none">
                    DIEMP
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1 leading-tight">
                    Digital Investigation &amp;
                  </span>
                  <span className="text-[11px] text-slate-400 leading-tight">
                    Evidence Management Platform
                  </span>
                </div>
              </div>
            </div>

            {/* Column 2: Institutional Purpose */}
            <div className="md:col-span-4 space-y-1 text-[11px] text-slate-400">
              <div className="text-white font-semibold text-xs">
                Secure. Reliable. Accountable.
              </div>
              <p>Supporting investigation and justice through technology.</p>
            </div>

            {/* Column 3: Portal Information */}
            <div className="md:col-span-3 space-y-2">
              <div className="font-bold text-xs uppercase tracking-wider text-white">
                Portal Information
              </div>
              <ul className="space-y-1.5 text-[11px] text-slate-400">
                <li>
                  <button
                    onClick={() => scrollToSection('about-section')}
                    className="hover:text-white transition cursor-pointer"
                  >
                    About DIEMP
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection('capabilities-section')}
                    className="hover:text-white transition cursor-pointer"
                  >
                    System Overview
                  </button>
                </li>
                <li>
                  <span className="text-slate-500 cursor-default">Security &amp; Privacy</span>
                </li>
                <li>
                  <span className="text-slate-400 cursor-default">Authorized Access Only</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
