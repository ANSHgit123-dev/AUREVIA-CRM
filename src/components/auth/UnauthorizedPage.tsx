import React from 'react';
import { ShieldAlert, ArrowLeft, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getDefaultDashboardPath, ROLE_CONFIGS } from '../../config/rbac';
import { isSupabaseConfigured } from '../../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';

export const UnauthorizedPage: React.FC<{ attemptedPath?: string }> = ({ attemptedPath }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const roleConfig = user ? ROLE_CONFIGS[user.role] : null;
  const targetDashboard = user ? getDefaultDashboardPath(user.role) : '/login';

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-8 space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <div>
          <span className="text-xs font-bold text-rose-600 uppercase tracking-widest block font-mono">
            HTTP 403 • ACCESS RESTRICTED
          </span>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Unauthorized Access Attempt
          </h1>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            Your current assigned role ({roleConfig?.title || user?.role || 'Guest'}) does not have permission to access {attemptedPath ? <strong className="font-mono text-slate-800">{attemptedPath}</strong> : 'this module'}.
          </p>
        </div>

        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs space-y-1.5 text-slate-600">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Authenticated As:</span>
            <span className="font-bold text-slate-800">{user?.fullName || 'Anonymous'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Active Role:</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${roleConfig?.badgeClass || 'bg-slate-200'}`}>
              {roleConfig?.badge || user?.role}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Enforcement:</span>
            <span className="font-semibold text-slate-700">
              {isSupabaseConfigured ? 'Supabase RLS & Route Guard' : 'Client RBAC Route Guard (Demo)'}
            </span>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-center gap-3">
          <Link
            to={targetDashboard}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow transition"
          >
            <ArrowLeft size={14} />
            <span>Return to My Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

