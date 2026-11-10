import React from 'react';
import {
  Target,
  Calendar,
  Building,
  Flame,
  Clock,
  Sparkles,
  Phone,
  ArrowRight,
  TrendingUp,
  Receipt,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useLeads } from '../../../context/LeadContext';
import { useSalesOperations } from '../../../context/SalesOperationsContext';
import { MetricCard } from '../../../components/common/MetricCard';
import { formatIndianCurrency, formatDate } from '../../../lib/formatters';
import { Link } from 'react-router-dom';

export const SalesExecutiveDashboard: React.FC = () => {
  const { user } = useAuth();
  const { leads, followUps } = useLeads();
  const { siteVisits, bookings } = useSalesOperations();

  const userName = user?.fullName || 'Arjun Verma';

  // Personal metrics filtered to this sales executive
  const myLeads = leads.filter(l => l.assignedExecutiveName === userName || l.assignedExecutiveName.includes('Arjun'));
  const myVisits = siteVisits.filter(v => v.assignedExecutiveName === userName || v.assignedExecutiveName.includes('Arjun'));
  const myBookings = bookings.filter(b => b.assignedExecutiveName === userName || b.assignedExecutiveName.includes('Arjun'));
  const myFollowUps = followUps.filter(f => f.assignedExecutiveName === userName || f.assignedExecutiveName.includes('Arjun'));

  const myBookedValue = myBookings.reduce((sum, b) => sum + b.agreedTotalPriceInr, 0);
  const myTargetValue = 50000000; // ₹5 Cr monthly target
  const targetPct = Math.min(100, Math.round((myBookedValue / myTargetValue) * 100));

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-navy-950 p-6 rounded-2xl text-white shadow-card border border-indigo-900/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles size={14} />
              <span>Personal Sales & Closure Console</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold mt-1">Sales Executive Dashboard</h1>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Hello, <strong>{userName}</strong>. Track your active prospect conversations, upcoming show flat appointments, and monthly target progress.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/pipeline"
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold rounded-xl shadow transition"
            >
              <span>My Pipeline</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* Target Progress Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400 font-semibold uppercase tracking-wider block">Monthly Closing Target Progress</span>
            <span className="text-lg font-bold text-slate-900 font-mono">
              {formatIndianCurrency(myBookedValue)} / {formatIndianCurrency(myTargetValue)}
            </span>
          </div>
          <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
            {targetPct}% Achieved
          </span>
        </div>
        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
          <div
            className="bg-indigo-600 h-full rounded-full transition-all"
            style={{ width: `${targetPct}%` }}
          />
        </div>
      </div>

      {/* Personal KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Assigned Prospects"
          value={myLeads.length.toString()}
          subtitle="Direct assigned accounts"
          icon={Building}
        />
        <MetricCard
          title="My Site Visits"
          value={myVisits.length.toString()}
          subtitle={`${myVisits.filter(v => v.status === 'scheduled').length} pending inspections`}
          icon={Calendar}
          variant="gold"
        />
        <MetricCard
          title="Allotments Closed"
          value={myBookings.length.toString()}
          subtitle="Confirmed property deals"
          icon={Receipt}
          variant="emerald"
        />
        <MetricCard
          title="Active Follow-ups"
          value={myFollowUps.filter(f => f.status !== 'completed').length.toString()}
          subtitle="Scheduled callbacks & meetings"
          icon={Clock}
        />
      </div>

      {/* Grid: My Scheduled Visits & Hot Prospects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scheduled Inspections */}
        <div className="bg-white rounded-xl border border-surface-border p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              My Scheduled Property Inspections
            </h2>
            <Link to="/site-visits" className="text-xs font-semibold text-indigo-700 hover:text-indigo-900">
              Manage All &rarr;
            </Link>
          </div>

          <div className="space-y-3">
            {myVisits.slice(0, 4).map(v => (
              <div key={v.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900">{v.leadName}</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">{v.projectName} • {v.meetingLocation || 'Experience Center'}</p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-mono font-semibold text-slate-800 block">{formatDate(v.visitDate)}</span>
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold uppercase">{v.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* My Hot Deals */}
        <div className="bg-white rounded-xl border border-surface-border p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-rose-500" />
              <span>Deals Near Closing</span>
            </h2>
            <Link to="/bookings" className="text-xs font-semibold text-indigo-700 hover:text-indigo-900">
              Issue Allotment &rarr;
            </Link>
          </div>

          <div className="space-y-3">
            {myLeads
              .filter(l => l.currentStage === 'negotiation' || l.currentStage === 'token_paid' || l.priority === 'hot')
              .slice(0, 4)
              .map(l => (
                <div key={l.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900">{l.firstName} {l.lastName}</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">{l.projectName} • {l.preferredTypology}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-emerald-700 block">{formatIndianCurrency(l.budgetMaxInr)}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-200 px-1 rounded">{l.currentStage.replace(/_/g, ' ')}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

