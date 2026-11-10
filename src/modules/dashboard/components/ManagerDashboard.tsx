import React from 'react';
import {
  Users,
  Target,
  CalendarCheck,
  Building,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Kanban,
  CheckCircle2,
} from 'lucide-react';
import { useLeads } from '../../../context/LeadContext';
import { useProjectInventory } from '../../../context/ProjectInventoryContext';
import { useSalesOperations } from '../../../context/SalesOperationsContext';
import { MetricCard } from '../../../components/common/MetricCard';
import { formatIndianCurrency, formatDate } from '../../../lib/formatters';
import { Link } from 'react-router-dom';

export const ManagerDashboard: React.FC = () => {
  const { leads, followUps, followUpStats, salesExecutives, executivePerformanceList } = useLeads();
  const { projects, units } = useProjectInventory();
  const { siteVisits, bookings, siteVisitStats } = useSalesOperations();

  // Pending inspections to coordinate
  const pendingVisits = siteVisits.filter(v => v.status === 'scheduled');
  const overdueTasks = followUps.filter(f => f.status === 'overdue');

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-navy-950 p-6 rounded-2xl text-white shadow-card border border-blue-900/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles size={14} />
              <span>Project Sales & Closer Management</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold mt-1">Sales Manager Console</h1>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Team inspection scheduling, closer pipeline allocation, overdue SLA monitoring, and deal closing velocity.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/pipeline"
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-500 hover:bg-blue-400 text-white text-xs font-semibold rounded-xl shadow transition"
            >
              <Kanban size={14} />
              <span>Sales Pipeline</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Team Inspection Queue"
          value={siteVisitStats.upcomingCount.toString()}
          subtitle={`${siteVisitStats.todayCount} scheduled for today`}
          icon={Building}
          variant="gold"
        />
        <MetricCard
          title="Overdue SLAs"
          value={followUpStats.overdueCount.toString()}
          subtitle="Requires closer intervention"
          icon={AlertTriangle}
          variant={followUpStats.overdueCount > 0 ? 'rose' : 'emerald'}
        />
        <MetricCard
          title="Active Team Closers"
          value={salesExecutives.length.toString()}
          subtitle="Frontline property consultants"
          icon={Users}
        />
        <MetricCard
          title="Conversion Efficiency"
          value={`${((bookings.length / Math.max(1, leads.length)) * 100).toFixed(1)}%`}
          subtitle="Lead to allotment ratio"
          icon={TrendingUp}
          variant="emerald"
        />
      </div>

      {/* Grid: Executive Closers & Today's Inspection Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Productivity Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-surface-border p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Sales Executive Target Realization
              </h2>
              <p className="text-xs text-slate-500">Pipeline load and closing numbers by frontline closer</p>
            </div>
            <Link to="/employees" className="text-xs font-semibold text-blue-700 hover:text-blue-900">
              View Detailed Metrics &rarr;
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50">
                  <th className="py-2.5 px-3">Closer Name</th>
                  <th className="py-2.5 px-3 text-center">Assigned Leads</th>
                  <th className="py-2.5 px-3 text-center">Inspections</th>
                  <th className="py-2.5 px-3 text-center">Bookings</th>
                  <th className="py-2.5 px-3 text-right">Closed Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {executivePerformanceList.map(exec => (
                  <tr key={exec.executiveName} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 font-semibold text-slate-900">{exec.executiveName}</td>
                    <td className="py-3 px-3 text-center font-mono">{exec.assignedLeads}</td>
                    <td className="py-3 px-3 text-center font-mono text-amber-700 font-medium">{exec.siteVisitsGenerated}</td>
                    <td className="py-3 px-3 text-center font-mono text-emerald-700 font-bold">{exec.bookingsAchieved}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      {formatIndianCurrency(exec.totalSalesValueInr)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Priority Inspections Queue */}
        <div className="bg-white rounded-xl border border-surface-border p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Upcoming Inspections
              </h2>
              <p className="text-xs text-slate-500">Scheduled client property visits</p>
            </div>
            <Link to="/site-visits" className="text-xs font-semibold text-blue-700 hover:text-blue-900">
              All Visits &rarr;
            </Link>
          </div>

          <div className="space-y-3">
            {pendingVisits.slice(0, 4).map(v => (
              <div key={v.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{v.leadName}</span>
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-medium">
                    {formatDate(v.visitDate)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">{v.projectName} • Closer: {v.assignedExecutiveName}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

