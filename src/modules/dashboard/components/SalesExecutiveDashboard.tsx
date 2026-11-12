import React from 'react';
import {
  Target,
  Calendar,
  Building,
  Clock,
  ArrowRight,
  TrendingUp,
  Receipt,
  Phone,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useLeads } from '../../../context/LeadContext';
import { useSalesOperations } from '../../../context/SalesOperationsContext';
import { MetricCard } from '../../../components/common/MetricCard';
import { formatIndianCurrency, formatRelativeTime } from '../../../lib/formatters';
import { Link } from 'react-router-dom';

export const SalesExecutiveDashboard: React.FC = () => {
  const { user } = useAuth();
  const { leads, followUps } = useLeads();
  const { siteVisits, bookings } = useSalesOperations();

  const userName = user?.fullName || 'Arjun Verma';

  // Personal metrics filtered to this sales executive
  const myLeads = leads.filter(
    l => l.assignedExecutiveName === userName || l.assignedExecutiveName.includes('Arjun')
  );
  const myVisits = siteVisits.filter(
    v => v.assignedExecutiveName === userName || v.assignedExecutiveName.includes('Arjun')
  );
  const myBookings = bookings.filter(
    b => b.assignedExecutiveName === userName || b.assignedExecutiveName.includes('Arjun')
  );
  const myFollowUps = followUps.filter(
    f => f.assignedExecutiveName === userName || f.assignedExecutiveName.includes('Arjun')
  );

  const myBookedValue = myBookings.reduce((sum, b) => sum + b.agreedTotalPriceInr, 0);
  const myTargetValue = 50000000; // ₹5 Cr monthly target
  const targetPct = Math.min(100, Math.round((myBookedValue / myTargetValue) * 100));

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E5E8EB]">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            <span>Sales Operations</span>
            <span>&bull;</span>
            <span>Frontline Consultant Console</span>
          </div>
          <h1 className="text-lg font-semibold text-slate-900 tracking-tight mt-0.5">
            Sales Executive Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/pipeline"
            className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-medium text-white bg-[#1E293B] rounded hover:bg-slate-800 transition"
          >
            <span>My Pipeline</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* Target Progress Bar */}
      <div className="bg-white border border-[#E5E8EB] rounded-md p-4">
        <div className="flex items-center justify-between text-xs mb-2">
          <div>
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
              Monthly Allotment Target Progress
            </span>
            <span className="text-base font-semibold text-slate-900 font-mono mt-0.5 block">
              {formatIndianCurrency(myBookedValue)} / {formatIndianCurrency(myTargetValue)}
            </span>
          </div>
          <span className="text-xs font-mono font-medium text-slate-700 bg-slate-100 border border-[#E5E8EB] px-2 py-0.5 rounded">
            {targetPct}% Realized
          </span>
        </div>
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div
            className="bg-[#1E293B] h-full rounded-full transition-all"
            style={{ width: `${targetPct}%` }}
          />
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Assigned Inquiries"
          value={myLeads.length.toString()}
          subtitle="Direct client portfolio"
          icon={Building}
        />
        <MetricCard
          title="Upcoming Inspections"
          value={myVisits.filter(v => v.status === 'scheduled').length.toString()}
          subtitle="Scheduled flat visits"
          icon={Calendar}
        />
        <MetricCard
          title="Allotments Closed"
          value={myBookings.length.toString()}
          subtitle={formatIndianCurrency(myBookedValue)}
          icon={Receipt}
        />
        <MetricCard
          title="Pending Follow-ups"
          value={myFollowUps.filter(f => f.status === 'pending').length.toString()}
          subtitle="Calls & site updates"
          icon={Clock}
        />
      </div>

      {/* Operational Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Active Inquiries Table */}
        <div className="lg:col-span-2 bg-white border border-[#E5E8EB] rounded-md p-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E8EB] mb-3">
            <div>
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                My Active Prospects
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Assigned inquiries requiring active closure</p>
            </div>
            <Link to="/leads" className="text-xs font-medium text-slate-700 hover:text-slate-900 inline-flex items-center gap-1">
              <span>View All Leads</span>
              <ChevronRight size={13} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E5E8EB] text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  <th className="pb-2 font-medium">Prospect Name</th>
                  <th className="pb-2 font-medium">Development</th>
                  <th className="pb-2 font-medium">Budget</th>
                  <th className="pb-2 font-medium">Stage</th>
                  <th className="pb-2 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E8EB]">
                {myLeads.slice(0, 6).map((lead) => (
                  <tr key={lead.id} className="hover:bg-[#F8F9FA] transition-colors">
                    <td className="py-2.5 font-medium text-slate-900">
                      <div>{lead.firstName} {lead.lastName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{lead.phone}</div>
                    </td>
                    <td className="py-2.5 text-slate-600">
                      <div>{lead.projectName}</div>
                      <div className="text-[10px] text-slate-400">{lead.preferredTypology.replace('_', ' ')}</div>
                    </td>
                    <td className="py-2.5 font-mono text-slate-700">
                      {formatIndianCurrency(lead.budgetMaxInr)}
                    </td>
                    <td className="py-2.5">
                      <span className="capitalize px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-[#E5E8EB]">
                        {lead.currentStage.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <Link
                        to={`/leads`}
                        className="text-xs font-medium text-slate-700 hover:text-slate-900"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upcoming Inspections & Tasks */}
        <div className="bg-white border border-[#E5E8EB] rounded-md p-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E8EB] mb-3">
            <div>
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                My Scheduled Visits
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Upcoming appointments with buyers</p>
            </div>
            <Link to="/site-visits" className="text-xs font-medium text-slate-700 hover:text-slate-900">
              Schedule
            </Link>
          </div>

          <div className="divide-y divide-[#E5E8EB]">
            {myVisits.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">No inspections scheduled.</p>
            ) : (
              myVisits.slice(0, 5).map((v) => (
                <div key={v.id} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-900">{v.leadName}</span>
                    <span className="text-[11px] font-mono text-slate-500">{formatRelativeTime(v.visitDate)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                    <span className="truncate max-w-[150px]">{v.projectName}</span>
                    <span className="capitalize font-mono">{v.status}</span>
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
