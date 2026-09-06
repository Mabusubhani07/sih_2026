import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, AlertCircle } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded bg-blue-800 text-white mx-auto shadow-sm">
          <Shield className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          DIEMP Portal
        </h1>
        <p className="text-xs text-slate-600 font-medium">
          Digital Investigation & Evidence Management Platform
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-6 px-6 sm:px-8 shadow-sm border border-slate-200 rounded-md">
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="border-b border-slate-100 pb-2">
              <h2 className="text-sm font-semibold text-slate-800">Sign in to your account</h2>
              <p className="text-[11px] text-slate-500">
                Enter your official identification email and password to access the system.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Official Email / Username
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@department.gov"
                className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold shadow-xs transition disabled:opacity-50"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Quick Demo Officer Logins */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 text-center">
              Official Demo Clearance Profiles
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => { setEmail('police@demo.gov'); setPassword('DemoPass@2026'); }}
                className="text-left px-2 py-1.5 rounded bg-slate-50 hover:bg-blue-50 border border-slate-200 text-slate-700 hover:text-blue-800 transition cursor-pointer"
              >
                <div className="font-semibold">Police Officer</div>
                <div className="text-[10px] text-slate-400">police@demo.gov</div>
              </button>
              <button
                type="button"
                onClick={() => { setEmail('investigator@demo.gov'); setPassword('DemoPass@2026'); }}
                className="text-left px-2 py-1.5 rounded bg-slate-50 hover:bg-blue-50 border border-slate-200 text-slate-700 hover:text-blue-800 transition cursor-pointer"
              >
                <div className="font-semibold">Investigator</div>
                <div className="text-[10px] text-slate-400">investigator@demo.gov</div>
              </button>
              <button
                type="button"
                onClick={() => { setEmail('forensic@demo.gov'); setPassword('DemoPass@2026'); }}
                className="text-left px-2 py-1.5 rounded bg-slate-50 hover:bg-blue-50 border border-slate-200 text-slate-700 hover:text-blue-800 transition cursor-pointer"
              >
                <div className="font-semibold">Forensic Officer</div>
                <div className="text-[10px] text-slate-400">forensic@demo.gov</div>
              </button>
              <button
                type="button"
                onClick={() => { setEmail('admin@demo.gov'); setPassword('DemoPass@2026'); }}
                className="text-left px-2 py-1.5 rounded bg-slate-50 hover:bg-blue-50 border border-slate-200 text-slate-700 hover:text-blue-800 transition cursor-pointer"
              >
                <div className="font-semibold">Administrator</div>
                <div className="text-[10px] text-slate-400">admin@demo.gov</div>
              </button>
            </div>
            <div className="text-[10px] text-slate-500 mt-2 text-center font-mono">
              Demo Password: <span className="font-semibold text-slate-700">DemoPass@2026</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-[11px] text-slate-500 hover:text-blue-700 font-medium transition cursor-pointer"
            >
              ← Return to Portal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
