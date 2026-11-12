import React from 'react';
import {
  PhoneCall,
  Clock,
  Compass,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import { useLeads } from '../../../context/LeadContext';
import { MetricCard } from '../../../components/common/MetricCard';
import { formatIndianCurrency, formatRelativeTime } from '../../../lib/formatters';
import { Link } from 'react-router-dom';

export const PresalesDashboard: React.FC = () => {
  const { leads, leadStats } = useLeads();

  const uncontactedLeads = leads.filter(l => l.currentStage === 'new');
  const hotInquiries = leads.filter(l => l.priority === 'hot' && l.currentStage !== 'booked');

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E5E8EB]">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            <span>Inbound Pipeline</span>
            <span>&bull;</span>
            <span>Lead Triage & Qualification</span>
          </div>
          <h1 className="text-lg font-semibold text-slate-900 tracking-tight mt-0.5">
            Presales & Lead Qualification Console
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/leads"
            className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-medium text-white bg-[#1E293B] rounded hover:bg-slate-800 transition"
          >
            <span>Lead Ingestion Hub</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Uncontacted Inquiries"
          value={leadStats.uncontactedLeads.toString()}
          subtitle="Pending initial screening"
          icon={PhoneCall}
        />
        <MetricCard
          title="New Leads Today"
          value={leadStats.newLeadsToday.toString()}
          subtitle="Inbound portal & campaign leads"
          icon={Compass}
        />
        <MetricCard
          title="Qualified Prospects"
          value={leadStats.qualifiedLeads.toString()}
          subtitle="Budget & timeline verified"
          icon={CheckCircle2}
        />
        <MetricCard
          title="Average Response SLA"
          value="4.2 mins"
          subtitle="Target SLA: < 15 mins"
          icon={Clock}
        />
      </div>

      {/* Operational Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Urgent Contact Queue Table */}
        <div className="lg:col-span-2 bg-white border border-[#E5E8EB] rounded-md p-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E8EB] mb-3">
            <div>
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Uncontacted Inbound Inquiries
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Immediate outreach required to maintain conversion rate</p>
            </div>
            <span className="text-[11px] font-mono font-medium text-slate-700 bg-slate-100 border border-[#E5E8EB] px-2 py-0.5 rounded">
              {uncontactedLeads.length} In Queue
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E5E8EB] text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  <th className="pb-2 font-medium">Prospect</th>
                  <th className="pb-2 font-medium">Development</th>
                  <th className="pb-2 font-medium">Source</th>
                  <th className="pb-2 font-medium">Ingested</th>
                  <th className="pb-2 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E8EB]">
                {uncontactedLeads.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-500">
                      All inbound leads have been contacted.
                    </td>
                  </tr>
                ) : (
                  uncontactedLeads.slice(0, 6).map((lead) => (
                    <tr key={lead.id} className="hover:bg-[#F8F9FA] transition-colors">
                      <td className="py-2.5 font-medium text-slate-900">
                        <div>{lead.firstName} {lead.lastName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{lead.phone}</div>
                      </td>
                      <td className="py-2.5 text-slate-600">
                        <div>{lead.projectName}</div>
                        <div className="text-[10px] text-slate-400">{lead.preferredTypology.replace('_', ' ')}</div>
                      </td>
                      <td className="py-2.5 capitalize text-slate-600 text-[11px]">
                        {lead.source.replace(/_/g, ' ')}
                      </td>
                      <td className="py-2.5 font-mono text-[11px] text-slate-500">
                        {formatRelativeTime(lead.createdAt)}
                      </td>
                      <td className="py-2.5 text-right">
                        <Link
                          to="/leads"
                          className="px-2 py-1 text-[11px] font-medium bg-[#1E293B] text-white rounded hover:bg-slate-800 transition"
                        >
                          Qualify
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* High-Intent Prospects */}
        <div className="bg-white border border-[#E5E8EB] rounded-md p-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E8EB] mb-3">
            <div>
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                High-Intent Prospects
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Hot qualified decision-ready buyers</p>
            </div>
            <Link to="/leads" className="text-xs font-medium text-slate-700 hover:text-slate-900">
              All Leads
            </Link>
          </div>

          <div className="divide-y divide-[#E5E8EB]">
            {hotInquiries.slice(0, 5).map((lead) => (
              <div key={lead.id} className="py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-900">{lead.firstName} {lead.lastName}</span>
                  <span className="text-[11px] font-mono font-medium text-slate-900">{formatIndianCurrency(lead.budgetMaxInr)}</span>
                </div>
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                  <span className="truncate max-w-[150px]">{lead.projectName}</span>
                  <span className="capitalize">{lead.assignedExecutiveName}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
