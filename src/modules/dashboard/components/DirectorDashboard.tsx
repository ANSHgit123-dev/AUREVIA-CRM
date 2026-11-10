import React from 'react';
import {
  TrendingUp,
  Building,
  Receipt,
  Users,
  Compass,
  Award,
  ArrowUpRight,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import { useProjectInventory } from '../../../context/ProjectInventoryContext';
import { useLeads } from '../../../context/LeadContext';
import { useSalesOperations } from '../../../context/SalesOperationsContext';
import { MetricCard } from '../../../components/common/MetricCard';
import { formatIndianCurrency } from '../../../lib/formatters';
import { Link } from 'react-router-dom';

export const DirectorDashboard: React.FC = () => {
  const { overallStats, projects, units } = useProjectInventory();
  const { leadStats, executivePerformanceList } = useLeads();
  const { bookings, siteVisitStats, bookingStats } = useSalesOperations();

  const totalAbsorption = overallStats.totalUnits > 0
    ? Math.round(((overallStats.bookedUnits + overallStats.soldUnits) / overallStats.totalUnits) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-navy-800 p-6 rounded-2xl text-white shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-gold-500 text-xs font-semibold uppercase tracking-wider">
              <Sparkles size={14} />
              <span>National Portfolio & Capital Realization</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold mt-1">Executive Leadership Dashboard</h1>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Consolidated real-time capital allocation across {projects.length} developments, absorption curves, and macro revenue realization.
            </p>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-400 uppercase font-mono block">Gross Booked Revenue</span>
            <span className="text-2xl sm:text-3xl font-bold text-gold-500 font-mono">
              {formatIndianCurrency(overallStats.soldValueInr + bookingStats.totalBookingValueInr)}
            </span>
          </div>
        </div>
      </div>

      {/* High-Level Financial & Portfolio KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Portfolio Absorption"
          value={`${totalAbsorption}%`}
          subtitle={`${overallStats.bookedUnits + overallStats.soldUnits} of ${overallStats.totalUnits} units booked`}
          icon={TrendingUp}
          variant="gold"
        />
        <MetricCard
          title="Token Advances Collected"
          value={formatIndianCurrency(bookingStats.totalTokenInr)}
          subtitle="Direct liquid booking advances"
          icon={Receipt}
          variant="emerald"
        />
        <MetricCard
          title="Active Lead Pipeline"
          value={leadStats.totalLeads.toString()}
          subtitle={`${leadStats.hotLeads} hot decision-ready leads`}
          icon={Users}
        />
        <MetricCard
          title="Site Inspections (MTD)"
          value={siteVisitStats.total.toString()}
          subtitle={`${siteVisitStats.completedCount} inspections completed`}
          icon={Building}
          variant="gold"
        />
      </div>

      {/* Project Realization Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-surface-border p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Development Absorption & Velocity
              </h2>
              <p className="text-xs text-slate-500">Commercial velocity per active residential project</p>
            </div>
            <Link to="/reports" className="text-xs font-semibold text-navy-900 hover:text-navy-700 flex items-center gap-1">
              <span>Full Analytics</span>
              <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="space-y-3">
            {projects.map(proj => {
              const projUnits = units.filter(u => u.projectId === proj.id);
              const total = projUnits.length || proj.totalUnits;
              const sold = projUnits.filter(u => u.status === 'sold' || u.status === 'booked').length;
              const rate = total > 0 ? Math.round((sold / total) * 100) : 0;
              const revenue = bookings
                .filter(b => b.projectId === proj.id && b.status !== 'cancelled' && b.status !== 'refunded')
                .reduce((s, b) => s + b.agreedTotalPriceInr, 0);

              return (
                <div key={proj.id} className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{proj.name}</h3>
                      <p className="text-xs text-slate-500">{proj.locationArea}, {proj.city}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {formatIndianCurrency(revenue)}
                      </span>
                      <span className="text-[11px] text-slate-400 block font-mono">Revenue Realized</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-slate-200 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gold-500 h-full rounded-full transition-all"
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold font-mono text-slate-700 min-w-12 text-right">
                      {rate}% Sold
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Closer Productivity Leaderboard */}
        <div className="bg-white rounded-xl border border-surface-border p-5 shadow-card space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-gold-500" />
              <span>Closing Leaderboard</span>
            </h2>
            <p className="text-xs text-slate-500">Top closing consultants this quarter</p>
          </div>

          <div className="space-y-3">
            {executivePerformanceList.slice(0, 4).map((exec, idx) => (
              <div key={exec.executiveName} className="p-3 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                    idx === 0 ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {idx + 1}
                  </span>
                  <div>
                    <span className="font-bold text-slate-900">{exec.executiveName}</span>
                    <span className="text-[10px] text-slate-500 block">{exec.bookingsAchieved} Allotments Closed</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-emerald-700 block">
                    {formatIndianCurrency(exec.totalSalesValueInr)}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">{exec.conversionRate.toFixed(1)}% Conversion</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

