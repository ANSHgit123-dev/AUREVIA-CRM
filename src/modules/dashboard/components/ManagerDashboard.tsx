import React from 'react';
import {
  Users,
  Building,
  TrendingUp,
  AlertTriangle,
  Kanban,
  Clock,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import { useLeads } from '../../../context/LeadContext';
import { useProjectInventory } from '../../../context/ProjectInventoryContext';
import { useSalesOperations } from '../../../context/SalesOperationsContext';
import { MetricCard } from '../../../components/common/MetricCard';
import { formatIndianCurrency, formatRelativeTime } from '../../../lib/formatters';
import { Link } from 'react-router-dom';

export const ManagerDashboard: React.FC = () => {
  const { leads, followUps, followUpStats, salesExecutives, executivePerformanceList } = useLeads();
  const { projects } = useProjectInventory();
  const { siteVisits, bookings, siteVisitStats } = useSalesOperations();

  const todayVisits = siteVisits.filter(v => v.status === 'scheduled');
  const overdueTasks = followUps.filter(f => f.status === 'overdue');

  const conversionRate = leads.length > 0
    ? ((bookings.length / leads.length) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E5E8EB]">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            <span>Sales Operations</span>
            <span>&bull;</span>
            <span>Closer Pipeline Management</span>
          </div>
          <h1 className="text-lg font-semibold text-slate-900 tracking-tight mt-0.5">
            Sales Manager Console
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/pipeline"
            className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-white border border-[#E5E8EB] rounded hover:bg-slate-50 transition"
          >
            <Kanban size={13} className="text-slate-500" />
            <span>Sales Pipeline</span>
          </Link>
          <Link
            to="/site-visits"
            className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-medium text-white bg-[#1E293B] rounded hover:bg-slate-800 transition"
          >
            <MapPin size={13} />
            <span>Site Visits</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Scheduled Inspections"
          value={siteVisitStats.upcomingCount.toString()}
          subtitle={`${siteVisitStats.todayCount} scheduled for today`}
          icon={Building}
        />
        <MetricCard
          title="Overdue Tasks (SLA)"
          value={followUpStats.overdueCount.toString()}
          subtitle={followUpStats.overdueCount > 0 ? 'Urgent attention required' : 'All tasks within SLA'}
          icon={AlertTriangle}
        />
        <MetricCard
          title="Active Sales Executives"
          value={salesExecutives.length.toString()}
          subtitle="Frontline property consultants"
          icon={Users}
        />
        <MetricCard
          title="Lead to Booking Rate"
          value={`${conversionRate}%`}
          subtitle={`${bookings.length} allotments from ${leads.length} leads`}
          icon={TrendingUp}
        />
      </div>

      {/* Main Operational Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Sales Consultant Performance Table */}
        <div className="lg:col-span-2 bg-white border border-[#E5E8EB] rounded-md p-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E8EB] mb-3">
            <div>
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Consultant Performance & Pipeline Load
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Frontline closer conversion and sales volume</p>
            </div>
            <Link to="/employees" className="text-xs font-medium text-slate-700 hover:text-slate-900 inline-flex items-center gap-1">
              <span>View Roster</span>
              <ChevronRight size={13} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E5E8EB] text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  <th className="pb-2 font-medium">Consultant</th>
                  <th className="pb-2 font-medium text-right">Assigned</th>
                  <th className="pb-2 font-medium text-right">Site Visits</th>
                  <th className="pb-2 font-medium text-right">Allotments</th>
                  <th className="pb-2 font-medium text-right">Conversion</th>
                  <th className="pb-2 font-medium text-right">Closed Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E8EB]">
                {executivePerformanceList.map((exec) => (
                  <tr key={exec.executiveName} className="hover:bg-[#F8F9FA] transition-colors">
                    <td className="py-2.5 font-medium text-slate-900">
                      {exec.executiveName}
                    </td>
                    <td className="py-2.5 text-right font-mono text-slate-600">
                      {exec.assignedLeads}
                    </td>
                    <td className="py-2.5 text-right font-mono text-slate-600">
                      {exec.siteVisitsGenerated}
                    </td>
                    <td className="py-2.5 text-right font-mono font-medium text-slate-900">
                      {exec.bookingsAchieved}
                    </td>
                    <td className="py-2.5 text-right font-mono text-slate-600">
                      {exec.conversionRate.toFixed(1)}%
                    </td>
                    <td className="py-2.5 text-right font-mono font-medium text-slate-900">
                      {formatIndianCurrency(exec.totalSalesValueInr)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Today's Scheduled Visits & Inspections */}
        <div className="bg-white border border-[#E5E8EB] rounded-md p-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E8EB] mb-3">
            <div>
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Pending Inspections
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Show flat visits awaiting execution</p>
            </div>
            <Link to="/site-visits" className="text-xs font-medium text-slate-700 hover:text-slate-900">
              Schedule
            </Link>
          </div>

          <div className="divide-y divide-[#E5E8EB]">
            {todayVisits.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">No pending visits scheduled.</p>
            ) : (
              todayVisits.slice(0, 5).map((v) => (
                <div key={v.id} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-900">{v.leadName}</span>
                    <span className="text-[11px] font-mono text-slate-500">{formatRelativeTime(v.visitDate)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                    <span className="truncate max-w-[150px]">{v.projectName}</span>
                    <span className="truncate">{v.assignedExecutiveName}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
