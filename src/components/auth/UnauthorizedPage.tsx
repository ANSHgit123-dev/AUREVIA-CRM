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
      <div className="max-w-md w-full bg-white rounded-md border border-[#E5E8EB] shadow-sm p-8 space-y-5">
        <div className="w-12 h-12 rounded-md bg-rose-50 text-rose-600 border border-rose-200 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <div>
          <span className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider block font-mono">
            HTTP 403 • ACCESS RESTRICTED
          </span>
          <h1 className="text-lg font-semibold text-[#1C2024] mt-1">
            Unauthorized Access Attempt
          </h1>
          <p className="text-xs text-[#60646C] mt-2 leading-relaxed">
            Your current assigned role ({roleConfig?.title || user?.role || 'Guest'}) does not have permission to access {attemptedPath ? <strong className="font-mono text-[#1C2024]">{attemptedPath}</strong> : 'this module'}.
          </p>
        </div>

        <div className="p-3.5 bg-[#F8F9FA] border border-[#E5E8EB] rounded-md text-left text-xs space-y-1.5 text-[#60646C]">
          <div className="flex items-center justify-between">
            <span className="text-[#8B8D98]">Authenticated As:</span>
            <span className="font-medium text-[#1C2024]">{user?.fullName || 'Anonymous'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#8B8D98]">Active Role:</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${roleConfig?.badgeClass || 'bg-slate-200'}`}>
              {roleConfig?.badge || user?.role}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#8B8D98]">Enforcement:</span>
            <span className="font-medium text-[#1C2024]">
              {isSupabaseConfigured ? 'Supabase RLS & Route Guard' : 'Client RBAC Route Guard (Demo)'}
            </span>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-center gap-3">
          <Link
            to={targetDashboard}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#1E293B] hover:bg-[#0F172A] text-white rounded text-xs font-medium shadow-sm transition"
          >
            <ArrowLeft size={14} />
            <span>Return to My Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

