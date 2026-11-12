import React from 'react';
import {
  ShieldCheck,
  Users,
  Database,
  Lock,
  UserPlus,
  FileCheck,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useLeads } from '../../../context/LeadContext';
import { isSupabaseConfigured } from '../../../lib/supabase';
import { MetricCard } from '../../../components/common/MetricCard';
import { Link } from 'react-router-dom';
import { ROLE_CONFIGS } from '../../../config/rbac';
import { formatRelativeTime } from '../../../lib/formatters';

export const AdminDashboard: React.FC = () => {
  const { user, employees } = useAuth();
  const { activities } = useLeads();

  const activeEmployees = employees.filter(e => e.isActive);
  const inactiveEmployees = employees.filter(e => !e.isActive);

  // Group by role
  const roleCounts = employees.reduce((acc, emp) => {
    acc[emp.role] = (acc[emp.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E5E8EB]">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            <span>Administration</span>
            <span>&bull;</span>
            <span>RBAC & Security</span>
          </div>
          <h1 className="text-lg font-semibold text-slate-900 tracking-tight mt-0.5">
            Company Administration Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/employees"
            className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-medium text-white bg-[#1E293B] rounded hover:bg-slate-800 transition"
          >
            <UserPlus size={13} />
            <span>Provision Staff</span>
          </Link>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Active Employees"
          value={activeEmployees.length.toString()}
          subtitle={`${inactiveEmployees.length} deactivated`}
          icon={Users}
        />
        <MetricCard
          title="Security (RLS)"
          value={isSupabaseConfigured ? 'Active' : 'Offline Mode'}
          subtitle={isSupabaseConfigured ? 'PostgreSQL row policies' : 'Client route guards (demo)'}
          icon={Lock}
        />
        <MetricCard
          title="Tenant Data Store"
          value={isSupabaseConfigured ? 'Supabase' : 'Local Fallback'}
          subtitle={isSupabaseConfigured ? 'PostgreSQL 15 Connected' : 'Encrypted browser storage'}
          icon={Database}
        />
        <MetricCard
          title="Audit Trail Events"
          value={activities.length.toString()}
          subtitle="System & lead activity logs"
          icon={FileCheck}
        />
      </div>

      {/* RBAC Breakdown & Recent Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Role Distribution Table */}
        <div className="bg-white border border-[#E5E8EB] rounded-md p-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E8EB] mb-3">
            <div>
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Role Assignments
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Staff roster by RBAC scope</p>
            </div>
            <Link to="/employees" className="text-xs font-medium text-slate-700 hover:text-slate-900">
              Manage
            </Link>
          </div>

          <div className="divide-y divide-[#E5E8EB]">
            {Object.entries(roleCounts).map(([r, count]) => {
              const cfg = (ROLE_CONFIGS as Record<string, any>)[r];
              return (
                <div key={r} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-medium text-slate-900">{cfg?.title || r}</span>
                    <span className="text-[11px] text-slate-500 block">{cfg?.badge || r}</span>
                  </div>
                  <span className="font-mono text-xs font-semibold text-slate-900 bg-slate-100 border border-[#E5E8EB] px-2 py-0.5 rounded">
                    {count} {count === 1 ? 'user' : 'users'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Security Audit Activity Feed */}
        <div className="lg:col-span-2 bg-white border border-[#E5E8EB] rounded-md p-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E8EB] mb-3">
            <div>
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Recent System & Security Audit Events
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Chronological activity record</p>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              {activities.length} logged
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E5E8EB] text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  <th className="pb-2 font-medium">Event</th>
                  <th className="pb-2 font-medium">Actor</th>
                  <th className="pb-2 font-medium">Target / Detail</th>
                  <th className="pb-2 font-medium text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E8EB]">
                {activities.slice(0, 6).map((act) => (
                  <tr key={act.id} className="hover:bg-[#F8F9FA] transition-colors">
                    <td className="py-2.5 font-medium text-slate-900">
                      {act.title}
                    </td>
                    <td className="py-2.5 text-slate-600">
                      {act.actorName}
                    </td>
                    <td className="py-2.5 text-slate-500 text-[11px] truncate max-w-[200px]">
                      {act.description || act.leadName}
                    </td>
                    <td className="py-2.5 text-right font-mono text-[11px] text-slate-500">
                      {formatRelativeTime(act.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
