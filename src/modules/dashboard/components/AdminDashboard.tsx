import React from 'react';
import {
  ShieldCheck,
  Users,
  Database,
  Lock,
  UserPlus,
  KeyRound,
  FileCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Server,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useLeads } from '../../../context/LeadContext';
import { useProjectInventory } from '../../../context/ProjectInventoryContext';
import { isSupabaseConfigured } from '../../../lib/supabase';
import { MetricCard } from '../../../components/common/MetricCard';
import { Link } from 'react-router-dom';
import { ROLE_CONFIGS } from '../../../config/rbac';
import { formatRelativeTime } from '../../../lib/formatters';

export const AdminDashboard: React.FC = () => {
  const { user, employees } = useAuth();
  const { leads, activities } = useLeads();
  const { projects, units } = useProjectInventory();

  const activeEmployees = employees.filter(e => e.isActive);
  const inactiveEmployees = employees.filter(e => !e.isActive);

  // Group by role
  const roleCounts = employees.reduce((acc, emp) => {
    acc[emp.role] = (acc[emp.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-6 rounded-2xl text-white shadow-xl border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck size={15} />
              <span>Security, RBAC & Provisioning Console</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold mt-1">Company Administration Dashboard</h1>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Centralized platform security, employee credentials, Row Level Security (RLS) enforcement, and immutable audit logging.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/employees"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-xl shadow transition"
            >
              <UserPlus size={14} />
              <span>Provision Staff</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Employees"
          value={activeEmployees.length.toString()}
          subtitle={`${inactiveEmployees.length} deactivated`}
          icon={Users}
          variant="gold"
        />
        <MetricCard
          title="Database Security (RLS)"
          value={isSupabaseConfigured ? 'ENFORCED' : 'OFFLINE'}
          subtitle={isSupabaseConfigured ? 'PostgreSQL Policies Active' : 'Client Route Guards (Demo)'}
          icon={Lock}
          variant={isSupabaseConfigured ? 'emerald' : 'default'}
        />
        <MetricCard
          title="Tenant Database"
          value={isSupabaseConfigured ? 'Supabase Live' : 'Demo Fallback'}
          subtitle={isSupabaseConfigured ? 'PostgreSQL 15 Connected' : 'Encrypted Local Storage'}
          icon={Database}
          variant={isSupabaseConfigured ? 'emerald' : 'default'}
        />
        <MetricCard
          title="System Audit Events"
          value={activities.length.toString()}
          subtitle="Immutable security logs"
          icon={FileCheck}
        />
      </div>

      {/* RBAC Role Distribution & Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Role Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Authorized Role Assignments
              </h2>
              <p className="text-xs text-slate-500">Distribution across 6 platform access tiers</p>
            </div>
            <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
              {employees.length} Total Users
            </span>
          </div>

          <div className="space-y-2.5">
            {Object.entries(ROLE_CONFIGS)
              .filter(([roleKey]) => roleKey !== 'super_admin')
              .map(([roleKey, conf]) => {
                const count = roleCounts[roleKey] || 0;
                return (
                  <div
                    key={roleKey}
                    className="p-3 rounded-lg border border-slate-100 bg-slate-50/70 hover:bg-slate-100/80 transition flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{conf.title}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${conf.badgeClass}`}>
                          {conf.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs">{conf.description}</p>
                    </div>
                    <span className="text-sm font-bold font-mono text-slate-900">{count}</span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Right: Security & Activity Ledger */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                System Security & Transaction Audit Log
              </h2>
              <p className="text-xs text-slate-500">Chronological access and data modification ledger</p>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
              Live Auditing Active
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
            {activities.slice(0, 7).map(act => (
              <div key={act.id} className="py-3 flex items-start gap-3 text-xs">
                <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{act.title}</span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {formatRelativeTime(act.createdAt)}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] mt-0.5">{act.description}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">
                    Actor: <strong className="text-slate-700">{act.actorName}</strong> • Prospect: {act.leadName}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

