import React from 'react';
import {
  PhoneCall,
  Clock,
  Compass,
  CheckCircle2,
  Calendar,
  MessageSquare,
  Sparkles,
  Search,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { useLeads } from '../../../context/LeadContext';
import { MetricCard } from '../../../components/common/MetricCard';
import { formatIndianCurrency, formatRelativeTime } from '../../../lib/formatters';
import { Link } from 'react-router-dom';

export const PresalesDashboard: React.FC = () => {
  const { leads, leadStats } = useLeads();

  // Ingestion Queue: Leads that are 'new' or 'contacted'
  const uncontactedLeads = leads.filter(l => l.currentStage === 'new');
  const hotInquiries = leads.filter(l => l.priority === 'hot' && l.currentStage !== 'booked');

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 p-6 rounded-2xl text-white shadow-card border border-emerald-900/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles size={14} />
              <span>Inbound Ingestion & Lead Triage</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold mt-1">Lead Qualification Console</h1>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Rapid phone response, prospective buyer requirement gathering, budget qualification, and site visit booking.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/leads"
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow transition"
            >
              <span>Ingestion Hub</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Uncontacted Inquiries"
          value={leadStats.uncontactedLeads.toString()}
          subtitle="Pending initial screening call"
          icon={PhoneCall}
          variant={leadStats.uncontactedLeads > 0 ? 'rose' : 'emerald'}
        />
        <MetricCard
          title="New Today"
          value={leadStats.newLeadsToday.toString()}
          subtitle="Digital & channel leads"
          icon={Compass}
          variant="gold"
        />
        <MetricCard
          title="Qualified Prospects"
          value={leadStats.qualifiedLeads.toString()}
          subtitle="Budget & timeline verified"
          icon={CheckCircle2}
          variant="emerald"
        />
        <MetricCard
          title="Average Response SLA"
          value="4.2 mins"
          subtitle="Target threshold: < 15 mins"
          icon={Clock}
        />
      </div>

      {/* Ingestion & Qualification Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Urgent Contact Queue */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-surface-border p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Uncontacted Inbound Inquiries
              </h2>
              <p className="text-xs text-slate-500">Call immediately to maintain high conversion SLA</p>
            </div>
            <span className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
              {uncontactedLeads.length} Urgent
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {uncontactedLeads.slice(0, 5).map(lead => (
              <div key={lead.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{lead.firstName} {lead.lastName}</span>
                    <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded uppercase font-medium">
                      {lead.source.replace('_', ' ')}
                    </span>
                    {lead.priority === 'hot' && (
                      <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                        <Flame size={10} /> Hot
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Phone: <span className="font-mono text-slate-800 font-semibold">{lead.phone}</span> • Budget: {formatIndianCurrency(lead.budgetMaxInr)} • {lead.projectName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${lead.phone}`}
                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded font-semibold flex items-center gap-1 border border-emerald-200 transition"
                  >
                    <PhoneCall size={12} />
                    <span>Call</span>
                  </a>
                  <Link
                    to="/site-visits"
                    className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded font-semibold flex items-center gap-1 border border-amber-200 transition"
                  >
                    <Calendar size={12} />
                    <span>Book Visit</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hot Leads Ready for Inspection */}
        <div className="bg-white rounded-xl border border-surface-border p-5 shadow-card space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-rose-500" />
              <span>High Propensity Leads</span>
            </h2>
            <p className="text-xs text-slate-500">Qualified buyers with immediate buying intent</p>
          </div>

          <div className="space-y-3">
            {hotInquiries.slice(0, 4).map(lead => (
              <div key={lead.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{lead.firstName} {lead.lastName}</span>
                  <span className="text-[10px] font-mono text-slate-500">{formatRelativeTime(lead.createdAt)}</span>
                </div>
                <p className="text-[11px] text-slate-600">Interested in {lead.projectName} • {lead.preferredTypology}</p>
                <p className="text-[10px] font-mono text-emerald-700 font-bold">Max Budget: {formatIndianCurrency(lead.budgetMaxInr)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

