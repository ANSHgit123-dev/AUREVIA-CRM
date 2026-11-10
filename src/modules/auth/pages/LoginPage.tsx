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
  Building2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
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
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Decorative gradient backdrops */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-gradient-to-b from-amber-500/10 via-indigo-500/5 to-transparent blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        {/* Brand Emblem */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-amber-500/40 text-amber-400 mx-auto flex items-center justify-center font-serif text-2xl font-bold shadow-2xl shadow-amber-500/10">
          A
        </div>
        <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-white font-serif">
          AUREVIA CRM
        </h2>
        <p className="mt-1 text-xs text-amber-400/90 tracking-widest uppercase font-semibold">
          Enterprise Real Estate Sales & Relationship System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Corporate Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="name@aurevia.demo"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setForgotNotice(null);
                    setIsForgotModalOpen(true);
                  }}
                  className="text-xs text-amber-400 hover:text-amber-300 font-medium transition"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent font-medium"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition disabled:opacity-50"
              >
                <span>{isLoading ? 'Verifying Credentials...' : 'Sign In to Workspace'}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </form>

          {/* Security Notice: Public registration disabled */}
          <div className="mt-6 pt-5 border-t border-slate-800 text-center">
            <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Public signup is disabled. Accounts provisioned by Company Admin.</span>
            </p>
          </div>

          {/* Demo 1-Click Role Switcher */}
          {(!isSupabaseConfigured || isMockFallbackEnabled) && (
            <div className="mt-6 pt-5 border-t border-slate-800">
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block mb-2 text-center">
                Sample CRM Demo Authentication (Instant Login)
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {DEMO_USERS.map(demo => (
                  <button
                    key={demo.id}
                    type="button"
                    onClick={() => handleQuickDemoLogin(demo.role)}
                    className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 text-left transition flex flex-col justify-center"
                  >
                    <span className="font-semibold text-slate-200">{ROLE_CONFIGS[demo.role]?.badge || demo.role}</span>
                    <span className="text-[10px] text-slate-500 truncate">{demo.fullName}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold">Password Reset</h3>
              </div>
              <button
                onClick={() => setIsForgotModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleForgotSubmit} className="mt-4 space-y-4">
              <p className="text-xs text-slate-300">
                Enter your verified corporate email address. A password reset link will be dispatched via Supabase Auth.
              </p>

              {forgotNotice && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{forgotNotice}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Corporate Email
                </label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  required
                  placeholder="name@aurevia.demo"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(false)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl transition"
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

