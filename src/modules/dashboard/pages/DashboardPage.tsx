import React from 'react';
import {
  Users,
  Calendar,
  Receipt,
  TrendingUp,
  ArrowRight,
  Clock,
  Building,
  ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { MetricCard } from '../../../components/common/MetricCard';
import { formatIndianCurrency, formatRelativeTime } from '../../../lib/formatters';
import { useProjectInventory } from '../../../context/ProjectInventoryContext';
import { useLeads } from '../../../context/LeadContext';
import { useSalesOperations } from '../../../context/SalesOperationsContext';
import {
  MOCK_CHART_VELOCITY,
  MOCK_SOURCE_DISTRIBUTION,
} from '../../../lib/mockData';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { overallStats, projects } = useProjectInventory();
  const { siteVisits, bookings, siteVisitStats, bookingStats } = useSalesOperations();
  const {
    leads,
    leadStats,
    followUps,
  } = useLeads();

  const activeFollowUps = followUps
    .filter(f => f.status !== 'completed' && f.status !== 'cancelled')
    .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())
    .slice(0, 5);

  const totalAbsorption = overallStats.totalUnits > 0
    ? Math.round(((overallStats.bookedUnits + overallStats.soldUnits) / overallStats.totalUnits) * 100)
    : 0;

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E5E8EB]">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            <span>Portfolio Overview</span>
            <span>&bull;</span>
            <span>Real Estate Q3 Operations</span>
          </div>
          <h1 className="text-lg font-semibold text-slate-900 tracking-tight mt-0.5">
            Executive Operations Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/inventory"
            className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-white border border-[#E5E8EB] rounded hover:bg-slate-50 transition"
          >
            <Building size={13} className="text-slate-500" />
            <span>Unit Matrix</span>
          </Link>
          <Link
            to="/reports"
            className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-medium text-white bg-[#1E293B] rounded hover:bg-slate-800 transition"
          >
            <span>Analytics</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Active Prospects"
          value={leadStats.totalLeads.toString()}
          trend={{ value: `${leadStats.hotLeads} hot`, isPositive: true }}
          subtitle={`${leadStats.newLeadsToday} new today`}
          icon={Users}
        />
        <MetricCard
          title="Site Inspections (MTD)"
          value={siteVisitStats.total.toString()}
          trend={{ value: `${siteVisitStats.completedCount} done`, isPositive: true }}
          subtitle={`${siteVisitStats.upcomingCount + siteVisitStats.todayCount} upcoming`}
          icon={Calendar}
        />
        <MetricCard
          title="Allotments & Sold"
          value={(overallStats.bookedUnits + overallStats.soldUnits).toString()}
          trend={{ value: `${totalAbsorption}%`, isPositive: true }}
          subtitle={`${overallStats.availableUnits} units available`}
          icon={Receipt}
        />
        <MetricCard
          title="Lead Conversion Rate"
          value={`${leadStats.conversionRate.toFixed(1)}%`}
          trend={{ value: '+0.6%', isPositive: true }}
          subtitle="Allotments to lead ratio"
          icon={TrendingUp}
        />
      </div>

      {/* Sales Velocity Chart & Lead Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Sales Velocity Area Chart */}
        <div className="lg:col-span-2 bg-white border border-[#E5E8EB] rounded-md p-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E8EB] mb-3">
            <div>
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Weekly Sales Velocity & Ingestion
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Captured leads vs booked consideration in ₹ Crores</p>
            </div>
            <Link to="/inventory" className="text-xs font-medium text-slate-700 hover:text-slate-900 inline-flex items-center gap-1">
              <span>Inventory</span>
              <ChevronRight size={13} />
            </Link>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_CHART_VELOCITY} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" vertical={false} />
                <XAxis dataKey="week" stroke="#9AA2AE" fontSize={11} tickLine={false} axisLine={{ stroke: '#E5E8EB' }} />
                <YAxis stroke="#9AA2AE" fontSize={11} tickLine={false} axisLine={{ stroke: '#E5E8EB' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E8EB',
                    borderRadius: '4px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    fontSize: '12px',
                    color: '#1C2024',
                  }}
                />
                <Area type="monotone" dataKey="leads" stroke="#1E293B" strokeWidth={1.5} fill="#F1F3F5" name="Leads" />
                <Area type="monotone" dataKey="bookingsValueCr" stroke="#2563EB" strokeWidth={1.5} fill="#EFF6FF" name="Value (₹ Cr)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Source Acquisition Donut */}
        <div className="bg-white border border-[#E5E8EB] rounded-md p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E8EB] mb-3">
              <div>
                <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Acquisition Attribution
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Campaign channel breakdown</p>
              </div>
            </div>
            <div className="h-44 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={MOCK_SOURCE_DISTRIBUTION}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={68}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {MOCK_SOURCE_DISTRIBUTION.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={1} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E8EB',
                      borderRadius: '4px',
                      fontSize: '11px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] pt-3 border-t border-[#E5E8EB]">
            {MOCK_SOURCE_DISTRIBUTION.slice(0, 4).map((s) => (
              <div key={s.name} className="flex items-center space-x-1.5">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-slate-600 truncate">{s.name} ({s.value}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Priority Follow-ups Table */}
      <div className="bg-white border border-[#E5E8EB] rounded-md p-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E8EB] mb-3">
          <div>
            <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Priority Tasks & Follow-ups
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Scheduled calls and inspections requiring closer action</p>
          </div>
          <Link to="/follow-ups" className="text-xs font-medium text-slate-700 hover:text-slate-900 inline-flex items-center gap-1">
            <span>View All Follow-ups</span>
            <ChevronRight size={13} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E5E8EB] text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                <th className="pb-2 font-medium">Prospect</th>
                <th className="pb-2 font-medium">Scheduled</th>
                <th className="pb-2 font-medium">Activity Type</th>
                <th className="pb-2 font-medium">Executive</th>
                <th className="pb-2 font-medium">Remarks</th>
                <th className="pb-2 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E8EB]">
              {activeFollowUps.map((f) => (
                <tr key={f.id} className="hover:bg-[#F8F9FA] transition-colors">
                  <td className="py-2.5 font-medium text-slate-900">
                    <div>{f.leadName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{f.leadPhone}</div>
                  </td>
                  <td className="py-2.5 text-slate-600">
                    <span className={f.status === 'overdue' ? 'text-red-700 font-medium' : ''}>
                      {formatRelativeTime(f.scheduledFor)}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <span className="capitalize px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium border border-[#E5E8EB]">
                      {f.activityType.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-2.5 text-slate-600">
                    {f.assignedExecutiveName}
                  </td>
                  <td className="py-2.5 text-slate-500 text-[11px] truncate max-w-[200px]">
                    {f.remarks}
                  </td>
                  <td className="py-2.5 text-right">
                    <Link
                      to="/follow-ups"
                      className="text-xs font-medium text-slate-700 hover:text-slate-900"
                    >
                      Complete
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
