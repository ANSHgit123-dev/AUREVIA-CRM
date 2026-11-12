import React from 'react';
import {
  TrendingUp,
  Building,
  Receipt,
  Users,
  ArrowUpRight,
  ChevronRight,
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

  const totalRealizedRevenue = overallStats.soldValueInr + bookingStats.totalBookingValueInr;

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E5E8EB]">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            <span>Executive Command</span>
            <span>&bull;</span>
            <span>Pan-India Portfolio</span>
          </div>
          <h1 className="text-lg font-semibold text-slate-900 tracking-tight mt-0.5">
            Executive Leadership Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/reports"
            className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-white border border-[#E5E8EB] rounded hover:bg-slate-50 transition"
          >
            <span>Portfolio Reports</span>
            <ArrowUpRight size={13} className="text-slate-400" />
          </Link>
          <Link
            to="/inventory"
            className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-medium text-white bg-[#1E293B] rounded hover:bg-slate-800 transition"
          >
            <span>Unit Matrix</span>
          </Link>
        </div>
      </div>

      {/* Primary Financial Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Gross Booked Revenue"
          value={formatIndianCurrency(totalRealizedRevenue)}
          subtitle="Contracted booking consideration"
          icon={TrendingUp}
        />
        <MetricCard
          title="Portfolio Absorption"
          value={`${totalAbsorption}%`}
          subtitle={`${overallStats.bookedUnits + overallStats.soldUnits} of ${overallStats.totalUnits} total units`}
          icon={Building}
        />
        <MetricCard
          title="Token Advances"
          value={formatIndianCurrency(bookingStats.totalTokenInr)}
          subtitle={`${bookingStats.tokenReceivedCount + bookingStats.confirmedCount} active allotments`}
          icon={Receipt}
        />
        <MetricCard
          title="Active Prospects"
          value={leadStats.totalLeads.toString()}
          subtitle={`${leadStats.hotLeads} hot decision-ready`}
          icon={Users}
        />
      </div>

      {/* Main Operational Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Development Absorption Ledger */}
        <div className="lg:col-span-2 bg-white border border-[#E5E8EB] rounded-md p-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E8EB] mb-3">
            <div>
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Development Absorption & Velocity
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Commercial allocation and realization per development</p>
            </div>
            <Link to="/projects" className="text-xs font-medium text-slate-700 hover:text-slate-900 inline-flex items-center gap-1">
              <span>View All Projects</span>
              <ChevronRight size={13} />
            </Link>
          </div>

          <div className="divide-y divide-[#E5E8EB]">
            {projects.map((proj) => {
              const projUnits = units.filter((u) => u.projectId === proj.id);
              const total = projUnits.length || proj.totalUnits;
              const sold = projUnits.filter((u) => u.status === 'sold' || u.status === 'booked').length;
              const rate = total > 0 ? Math.round((sold / total) * 100) : 0;
              const revenue = bookings
                .filter((b) => b.projectId === proj.id && b.status !== 'cancelled' && b.status !== 'refunded')
                .reduce((s, b) => s + b.agreedTotalPriceInr, 0);

              return (
                <div key={proj.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <h3 className="text-xs font-semibold text-slate-900">{proj.name}</h3>
                      <p className="text-[11px] text-slate-500">{proj.locationArea}, {proj.city} &bull; {total} Units</p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-xs font-semibold text-slate-900">
                        {formatIndianCurrency(revenue)}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">Revenue Booked</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#1E293B] h-full rounded-full transition-all"
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-mono font-medium text-slate-700 min-w-12 text-right">
                      {rate}% Allotted
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Closer Productivity Leaderboard */}
        <div className="bg-white border border-[#E5E8EB] rounded-md p-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E8EB] mb-3">
            <div>
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Closing Leaderboard
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Lead conversion & sales volume</p>
            </div>
            <Link to="/employees" className="text-xs font-medium text-slate-700 hover:text-slate-900">
              Directory
            </Link>
          </div>

          <div className="divide-y divide-[#E5E8EB]">
            {executivePerformanceList.slice(0, 5).map((exec, idx) => (
              <div key={exec.executiveName} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-5 h-5 rounded bg-slate-100 text-slate-600 font-mono text-[10px] font-medium flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-900 truncate">{exec.executiveName}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{exec.bookingsAchieved} Allotments &bull; {exec.conversionRate.toFixed(1)}% Conv.</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono text-xs font-semibold text-slate-900 block">
                    {formatIndianCurrency(exec.totalSalesValueInr)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
