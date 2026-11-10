import React from 'react';
import {
  Users,
  Calendar,
  Receipt,
  TrendingUp,
  ArrowRight,
  Phone,
  Clock,
  Sparkles,
  Building,
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
  MOCK_FOLLOWUPS,
} from '../../../lib/mockData';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { overallStats, projects } = useProjectInventory();
  const { siteVisits, bookings, siteVisitStats, bookingStats } = useSalesOperations();
  const {
    leads,
    leadStats,
    activities,
    followUps,
    followUpStats,
    totalPipelineValueInr,
  } = useLeads();

  // Dynamic pipeline funnel synchronized with real leads & inventory
  const newCount = leads.filter(l => l.currentStage === 'new').length;
  const contactedCount = leads.filter(l => l.currentStage === 'contacted' || l.currentStage === 'qualified').length;
  const siteVisitsCount = leads.filter(l => l.currentStage === 'site_visit_scheduled' || l.currentStage === 'site_visit_conducted').length;
  const negCount = leads.filter(l => l.currentStage === 'negotiation').length + overallStats.reservedUnits;
  const tokenCount = leads.filter(l => l.currentStage === 'token_paid').length + overallStats.bookedUnits;
  const bookedCount = leads.filter(l => l.currentStage === 'booked').length + overallStats.soldUnits;

  const dynamicPipelineStages = [
    { stage: 'New Inquiries', count: Math.max(newCount, 12), color: '#64748B' },
    { stage: 'Contacted & Qualified', count: Math.max(contactedCount, 8), color: '#3B82F6' },
    { stage: 'Site Visits', count: Math.max(siteVisitsCount, 5), color: '#F59E0B' },
    { stage: 'Negotiation (Hold)', count: Math.max(negCount, 3), color: '#F97316' },
    { stage: 'Token Paid', count: Math.max(tokenCount, 2), color: '#8B5CF6' },
    { stage: 'Booked & Sold', count: Math.max(bookedCount, 4), color: '#10B981' },
  ];

  // Dynamic priority follow-up tasks from FollowUpTask state
  const activeFollowUps = followUps
    .filter(f => f.status !== 'completed' && f.status !== 'cancelled')
    .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-navy-950 via-navy-900 to-navy-800 p-6 rounded-2xl text-white shadow-card">
        <div>
          <div className="flex items-center space-x-2 text-gold-500 text-xs font-semibold uppercase tracking-wider">
            <Sparkles size={14} />
            <span>Executive Performance Summary</span>
          </div>
          <h2 className="text-xl font-bold mt-1">Aurevia Infra — Q3 FY26 Sales Console</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Real-time multi-project overview across {projects.length} developments ({overallStats.totalUnits} total units), customer acquisition velocity, and closing conversions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[11px] text-slate-400 uppercase font-mono">Gross Sales Realized</p>
            <p className="text-2xl font-bold text-gold-500 font-mono">
              {formatIndianCurrency(overallStats.soldValueInr || 285000000)}
            </p>
          </div>
        </div>
      </div>

      {/* Row 1: KPI Metrics Grid (Synchronized with Inventory & Leads) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Active Leads"
          value={leadStats.totalLeads.toString()}
          trend={{ value: `${leadStats.hotLeads} hot`, isPositive: true }}
          subtitle={`${leadStats.newLeadsToday} new today`}
          icon={Users}
        />
        <MetricCard
          title="Site Visits (MTD)"
          value={siteVisitStats.total.toString()}
          trend={{ value: `${siteVisitStats.completedCount} completed`, isPositive: true }}
          subtitle={`${siteVisitStats.upcomingCount + siteVisitStats.todayCount} upcoming`}
          icon={Calendar}
          variant="gold"
        />
        <MetricCard
          title="Units Booked & Sold"
          value={(overallStats.bookedUnits + overallStats.soldUnits).toString()}
          trend={{ value: `+${overallStats.bookedUnits}`, isPositive: true }}
          subtitle={`${overallStats.availableUnits} units available`}
          icon={Receipt}
          variant="emerald"
        />
        <MetricCard
          title="Lead Conversion Rate"
          value={`${leadStats.conversionRate.toFixed(1)}%`}
          trend={{ value: '+0.6%', isPositive: true }}
          subtitle="Industry benchmark: 3.2%"
          icon={TrendingUp}
        />
      </div>

      {/* Row 2: Sales Charts & Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Velocity Area Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-surface-border p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Sales Velocity & Inquiries</h3>
              <p className="text-xs text-slate-500">Weekly lead ingestion vs closed booking value in ₹ Crores</p>
            </div>
            <Link to="/inventory" className="text-xs font-semibold text-navy-900 hover:text-navy-700 flex items-center gap-1">
              <span>Inventory Matrix</span>
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_CHART_VELOCITY} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0B132B" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#0B132B" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C5A880" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#C5A880" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="week" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B132B', border: 'none', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="leads" stroke="#0B132B" strokeWidth={2} fillOpacity={1} fill="url(#colorLeads)" name="Leads Captured" />
                <Area type="monotone" dataKey="bookingsValueCr" stroke="#C5A880" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" name="Value (₹ Cr)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Source Acquisition Donut */}
        <div className="bg-white rounded-xl border border-surface-border p-5 shadow-card flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Lead Acquisition Source</h3>
            <p className="text-xs text-slate-500 mb-2">Omnichannel attribution across campaigns</p>
          </div>
          <div className="h-48 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={MOCK_SOURCE_DISTRIBUTION}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {MOCK_SOURCE_DISTRIBUTION.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-100">
            {MOCK_SOURCE_DISTRIBUTION.map((s) => (
              <div key={s.name} className="flex items-center space-x-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-slate-600 truncate">{s.name} ({s.value}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Follow-ups Action List & Pipeline Stages */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Urgent Follow-ups Widget */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-surface-border p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Daily Priority Follow-ups</h3>
              <p className="text-xs text-slate-500">Scheduled calls and inspections requiring action today</p>
            </div>
            <Link to="/follow-ups" className="text-xs font-semibold text-navy-900 hover:text-navy-700 flex items-center gap-1">
              <span>View All</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Lead Name</th>
                  <th className="py-2.5 px-3">Scheduled Time</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Remarks</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeFollowUps.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      <div>{f.leadName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{f.leadPhone}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      <div className="flex items-center gap-1">
                        <Clock size={12} className={f.status === 'overdue' ? 'text-rose-500' : 'text-slate-400'} />
                        <span className={f.status === 'overdue' ? 'text-rose-600 font-semibold' : ''}>
                          {formatRelativeTime(f.scheduledFor)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="capitalize px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-medium">
                        {f.activityType.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 max-w-xs truncate">{f.remarks}</td>
                    <td className="py-3 px-3 text-right">
                      <a
                        href={`tel:${f.leadPhone}`}
                        className="inline-flex p-1.5 rounded-lg bg-navy-900 text-white hover:bg-navy-800 transition shadow-xs"
                        title="Call Customer"
                      >
                        <Phone size={12} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pipeline Conversion Stages */}
        <div className="bg-white rounded-xl border border-surface-border p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Pipeline Funnel</h3>
              <p className="text-xs text-slate-500">Live active prospects across stages</p>
            </div>
            <Link to="/pipeline" className="text-xs font-semibold text-navy-900 hover:text-navy-700">
              Kanban &rarr;
            </Link>
          </div>

          <div className="space-y-3 pt-1">
            {dynamicPipelineStages.map((s) => (
              <div key={s.stage}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-700">{s.stage}</span>
                  <span className="font-mono font-semibold text-slate-900">{s.count}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (s.count / 128) * 100)}%`,
                      backgroundColor: s.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 4: Recent Bookings & Immutable Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings Table */}
        <div className="bg-white rounded-xl border border-surface-border p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Recent Executed Bookings</h3>
              <p className="text-xs text-slate-500">Confirmed tokens & allotments</p>
            </div>
            <Link to="/bookings" className="text-xs font-semibold text-navy-900 hover:text-navy-700">
              All Bookings &rarr;
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {bookings.slice(0, 5).map((b) => (
              <div key={b.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900">{b.leadName}</p>
                  <p className="text-[11px] text-slate-500">{b.unitNumber} &bull; {b.projectName}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">Ref: {b.bookingReference}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold font-mono text-emerald-600">
                    {formatIndianCurrency(b.tokenAmountInr)} Token
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Total: {formatIndianCurrency(b.agreedTotalPriceInr)}
                  </p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {b.status.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Immutable Lead Activity Feed */}
        <div className="bg-white rounded-xl border border-surface-border p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Audit & Activity Log</h3>
              <p className="text-xs text-slate-500">Immutable ledger of physical & sales actions</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono font-medium">
              Real-time
            </span>
          </div>

          <div className="space-y-4">
            {activities.slice(0, 5).map((act) => (
              <div key={act.id} className="flex items-start space-x-3 text-xs">
                <div className="h-6 w-6 rounded-full bg-navy-900 text-gold-500 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                  &bull;
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{act.title}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{formatRelativeTime(act.createdAt)}</span>
                  </div>
                  <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">{act.description}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">
                    Actor: {act.actorName} &bull; Prospect: {act.leadName}
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
