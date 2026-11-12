import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { getDefaultDashboardPath, ROLE_CONFIGS } from '../../../config/rbac';
import { UserRole } from '../../../types';
import { DEMO_USERS } from '../../../lib/mockData';
import { isSupabaseConfigured, isMockFallbackEnabled } from '../../../lib/supabase';
import {
  Lock,
  Mail,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  KeyRound,
  X,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, resetPassword, isAuthenticated, user } = useAuth();

  const [email, setEmail] = useState('admin@aurevia.demo');
  const [password, setPassword] = useState('password123');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Forgot Password Modal
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotNotice, setForgotNotice] = useState<string | null>(null);

  // If already authenticated, redirect to default dashboard
  React.useEffect(() => {
    if (isAuthenticated && user) {
      const returnUrl = (location.state as any)?.from?.pathname;
      const target = returnUrl && returnUrl !== '/login' ? returnUrl : getDefaultDashboardPath(user.role);
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, user, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const loggedUser = await login(email, password);
      const returnUrl = (location.state as any)?.from?.pathname;
      const target = returnUrl && returnUrl !== '/login' ? returnUrl : getDefaultDashboardPath(loggedUser.role);
      navigate(target, { replace: true });
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoRole: UserRole) => {
    if (isSupabaseConfigured && !isMockFallbackEnabled) {
      setErrorMsg('One-click demo authentication is disabled when strict live Supabase mode is forced without mock fallback.');
      return;
    }
    setErrorMsg(null);
    setIsLoading(true);
    const targetDemo = DEMO_USERS.find(d => d.role === demoRole);
    if (!targetDemo) return;

    setEmail(targetDemo.email);
    setPassword('password123');

    try {
      const loggedUser = await login(targetDemo.email, 'password123');
      const target = getDefaultDashboardPath(loggedUser.role);
      navigate(target, { replace: true });
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    const res = await resetPassword(forgotEmail);
    setForgotNotice(res.message);
  };

  return (
    <div className="min-h-screen bg-[#F5F6F7] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Wordmark */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="h-7 w-7 rounded bg-[#1E2227] flex items-center justify-center text-white text-xs font-bold tracking-tight">
              A
            </div>
            <span className="text-sm font-bold tracking-widest text-slate-900 uppercase">
              AUREVIA
            </span>
          </div>
          <h1 className="text-lg font-semibold text-slate-900 tracking-tight">
            Developer Operations CRM
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real estate inventory, sales pipeline & booking operations
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white border border-[#E5E8EB] rounded-lg p-6 sm:p-7 shadow-sm">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Corporate Email
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="name@aurevia.demo"
                  className="w-full pl-9 pr-3 h-9 bg-white border border-[#E5E8EB] rounded text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:border-slate-800 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setForgotNotice(null);
                    setIsForgotModalOpen(true);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-900 transition"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 h-9 bg-white border border-[#E5E8EB] rounded text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:border-slate-800 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-9 flex items-center justify-center gap-1.5 rounded text-xs font-medium text-white bg-[#1E293B] hover:bg-slate-800 focus:outline-none transition disabled:opacity-50"
            >
              <span>{isLoading ? 'Verifying Credentials...' : 'Sign In'}</span>
              <ArrowRight size={13} />
            </button>
          </form>

          {/* Demo Persona 1-Click Fast Auth */}
          {(!isSupabaseConfigured || isMockFallbackEnabled) && (
            <div className="mt-5 pt-4 border-t border-[#E5E8EB]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Fast Demo Personas
                </span>
                <span className="text-[10px] text-slate-400 font-mono">1-Click Login</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {DEMO_USERS.map(demo => (
                  <button
                    key={demo.id}
                    type="button"
                    onClick={() => handleQuickDemoLogin(demo.role)}
                    className="p-2 rounded border border-[#E5E8EB] bg-[#F8F9FA] hover:bg-white hover:border-slate-300 text-left transition flex flex-col justify-center"
                  >
                    <span className="font-medium text-slate-900 text-xs">
                      {ROLE_CONFIGS[demo.role]?.title || demo.role}
                    </span>
                    <span className="text-[10px] text-slate-500 truncate mt-0.5">
                      {demo.fullName}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Security Notice */}
          <div className="mt-4 pt-3 border-t border-[#E5E8EB] text-center">
            <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>Restricted enterprise portal. Employee provisioning required.</span>
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-none flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm bg-white border border-[#E5E8EB] rounded-lg shadow-lg p-5 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E8EB]">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-slate-700" />
                <h3 className="text-sm font-semibold text-slate-900">Password Reset</h3>
              </div>
              <button
                onClick={() => setIsForgotModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleForgotSubmit} className="mt-3.5 space-y-3.5">
              <p className="text-xs text-slate-500">
                Enter your verified corporate email address. Password reset instructions will be dispatched.
              </p>

              {forgotNotice && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{forgotNotice}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Corporate Email
                </label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  required
                  placeholder="name@aurevia.demo"
                  className="w-full px-3 h-8 bg-white border border-[#E5E8EB] rounded text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E8EB]">
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#1E293B] hover:bg-slate-800 text-white font-medium text-xs rounded transition"
                >
                  Send Reset Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
