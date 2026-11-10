import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Calendar,
  Clock,
  User,
  Building,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Star,
  Phone,
  MessageSquare,
  Sparkles,
  ChevronRight,
  X,
  RotateCcw,
} from 'lucide-react';
import { SiteVisit, SiteVisitType, SiteVisitStatus } from '../../../types';
import { useSalesOperations } from '../../../context/SalesOperationsContext';
import { useLeads } from '../../../context/LeadContext';
import { useProjectInventory } from '../../../context/ProjectInventoryContext';
import { MetricCard } from '../../../components/common/MetricCard';
import { formatDate, formatDateTime, formatRelativeTime } from '../../../lib/formatters';

type TabKey = 'all' | 'upcoming' | 'completed' | 'cancelled';

export const SiteVisitsPage: React.FC = () => {
  const {
    siteVisits,
    siteVisitStats,
    scheduleSiteVisit,
    completeSiteVisit,
    cancelSiteVisit,
    rescheduleSiteVisit,
  } = useSalesOperations();
  const { leads, salesExecutives } = useLeads();
  const { projects } = useProjectInventory();

  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedExecutive, setSelectedExecutive] = useState('all');
  const [selectedType, setSelectedType] = useState<SiteVisitType | 'all'>('all');

  // Modals state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [completeModalVisit, setCompleteModalVisit] = useState<SiteVisit | null>(null);
  const [rescheduleModalVisit, setRescheduleModalVisit] = useState<SiteVisit | null>(null);

  // Form states for schedule visit
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [assignedExecutive, setAssignedExecutive] = useState(salesExecutives[0] || 'Arjun Verma');
  const [visitType, setVisitType] = useState<SiteVisitType>('show_flat_visit');
  const [meetingLocation, setMeetingLocation] = useState('');
  const [remarks, setRemarks] = useState('');

  // Form states for complete visit
  const [rating, setRating] = useState<number>(5);
  const [outcome, setOutcome] = useState('');

  // Form states for reschedule visit
  const [newVisitDate, setNewVisitDate] = useState('');
  const [rescheduleNotes, setRescheduleNotes] = useState('');

  // Filtered Site Visits
  const filteredVisits = useMemo(() => {
    return siteVisits.filter((visit) => {
      // Tab filter
      if (activeTab === 'upcoming') {
        if (visit.status !== 'scheduled') return false;
      } else if (activeTab === 'completed') {
        if (visit.status !== 'completed') return false;
      } else if (activeTab === 'cancelled') {
        if (visit.status !== 'cancelled' && visit.status !== 'no_show') return false;
      }

      // Search filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = visit.leadName.toLowerCase().includes(term);
        const matchesPhone = visit.leadPhone.toLowerCase().includes(term);
        const matchesProject = visit.projectName.toLowerCase().includes(term);
        if (!matchesName && !matchesPhone && !matchesProject) return false;
      }

      // Project filter
      if (selectedProject !== 'all' && visit.projectId !== selectedProject) return false;

      // Executive filter
      if (selectedExecutive !== 'all' && visit.assignedExecutiveName !== selectedExecutive) return false;

      // Type filter
      if (selectedType !== 'all' && visit.visitType !== selectedType) return false;

      return true;
    });
  }, [siteVisits, activeTab, searchTerm, selectedProject, selectedExecutive, selectedType]);

  const handleOpenScheduleModal = () => {
    setSelectedLeadId(leads[0]?.id || '');
    setSelectedProjectId(projects[0]?.id || '');
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 16);
    setVisitDate(tomorrow);
    setAssignedExecutive(salesExecutives[0] || 'Arjun Verma');
    setVisitType('show_flat_visit');
    setMeetingLocation('Project Experience Center & Sample Flat');
    setRemarks('');
    setIsScheduleModalOpen(true);
  };

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lead = leads.find((l) => l.id === selectedLeadId) || leads[0];
    const project = projects.find((p) => p.id === selectedProjectId) || projects[0];
    if (!lead || !project) return;

    scheduleSiteVisit({
      leadId: lead.id,
      leadName: `${lead.firstName} ${lead.lastName}`,
      leadPhone: lead.phone,
      projectId: project.id,
      projectName: project.name,
      assignedExecutiveName: assignedExecutive,
      visitDate: new Date(visitDate).toISOString(),
      visitType,
      status: 'scheduled',
      meetingLocation: meetingLocation.trim() || `${project.name} Sales Gallery`,
      remarks: remarks.trim() || `Inspection appointment scheduled for ${project.name}.`,
    });

    setIsScheduleModalOpen(false);
  };

  const handleCompleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeModalVisit) return;

    completeSiteVisit(completeModalVisit.id, rating, outcome.trim());
    setCompleteModalVisit(null);
    setOutcome('');
  };

  const handleRescheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleModalVisit || !newVisitDate) return;

    rescheduleSiteVisit(
      rescheduleModalVisit.id,
      new Date(newVisitDate).toISOString(),
      rescheduleNotes.trim()
    );
    setRescheduleModalVisit(null);
    setNewVisitDate('');
    setRescheduleNotes('');
  };

  const getTypeLabel = (type: SiteVisitType) => {
    switch (type) {
      case 'show_flat_visit':
        return 'Show Flat Tour';
      case 'virtual_tour':
        return 'Virtual Walkthrough';
      case 'site_visit':
        return 'Physical Site Tour';
    }
  };

  const getStatusBadge = (status: SiteVisitStatus) => {
    switch (status) {
      case 'scheduled':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Scheduled</span>;
      case 'completed':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Completed</span>;
      case 'cancelled':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">Cancelled</span>;
      case 'no_show':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">No Show</span>;
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-gold-600 text-xs font-semibold uppercase tracking-wider">
            <MapPin size={14} />
            <span>Show-Flat & Experience Center Management</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
            Site Visit Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Coordinate physical inspections, log customer ratings and objections, and advance prospect pipeline stages.
          </p>
        </div>

        <button
          onClick={handleOpenScheduleModal}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold shadow-card transition shrink-0 self-start md:self-auto"
        >
          <Plus size={15} />
          <span>Schedule Site Visit</span>
        </button>
      </div>

      {/* 2. Site Visit Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          title="Total Visits"
          value={siteVisitStats.total.toString()}
          subtitle="Portfolio appointments"
          icon={MapPin}
        />
        <MetricCard
          title="Today's Visits"
          value={siteVisitStats.todayCount.toString()}
          subtitle="Scheduled today"
          icon={Calendar}
          variant="gold"
        />
        <MetricCard
          title="Upcoming"
          value={siteVisitStats.upcomingCount.toString()}
          subtitle="Confirmed future visits"
          icon={Clock}
        />
        <MetricCard
          title="Conducted"
          value={siteVisitStats.completedCount.toString()}
          subtitle="Inspections completed"
          icon={CheckCircle2}
          variant="emerald"
        />
        <MetricCard
          title="Cancelled"
          value={siteVisitStats.cancelledCount.toString()}
          subtitle="Call-offs recorded"
          icon={XCircle}
        />
        <MetricCard
          title="No-Shows"
          value={siteVisitStats.noShowCount.toString()}
          subtitle="Missed appointments"
          icon={AlertCircle}
          variant="rose"
        />
      </div>

      {/* 3. Tab Navigation */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 text-xs font-semibold text-slate-600">
        <button
          onClick={() => setActiveTab('all')}
          className={`py-3 px-4 border-b-2 transition ${
            activeTab === 'all'
              ? 'border-navy-900 text-navy-950 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          All Appointments ({siteVisits.length})
        </button>

        <button
          onClick={() => setActiveTab('upcoming')}
          className={`py-3 px-4 border-b-2 transition ${
            activeTab === 'upcoming'
              ? 'border-navy-900 text-navy-950 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Scheduled / Upcoming ({siteVisitStats.todayCount + siteVisitStats.upcomingCount})
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`py-3 px-4 border-b-2 transition ${
            activeTab === 'completed'
              ? 'border-emerald-600 text-emerald-800 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Conducted & Feedback ({siteVisitStats.completedCount})
        </button>

        <button
          onClick={() => setActiveTab('cancelled')}
          className={`py-3 px-4 border-b-2 transition ${
            activeTab === 'cancelled'
              ? 'border-rose-600 text-rose-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Cancelled / No-Show ({siteVisitStats.cancelledCount + siteVisitStats.noShowCount})
        </button>
      </div>

      {/* 4. Search and Filters Toolbar */}
      <div className="bg-white p-4 border border-t-0 border-surface-border shadow-card space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by customer name, phone, or project..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-navy-900"
            />
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={selectedExecutive}
              onChange={(e) => setSelectedExecutive(e.target.value)}
              className="px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs"
            >
              <option value="all">All Executives</option>
              {salesExecutives.map((exec) => (
                <option key={exec} value={exec}>
                  {exec}
                </option>
              ))}
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs"
            >
              <option value="all">All Tour Types</option>
              <option value="show_flat_visit">Show Flat Visit</option>
              <option value="site_visit">Physical Site Tour</option>
              <option value="virtual_tour">Virtual Tour</option>
            </select>
          </div>
        </div>

        {/* 5. Site Visit Records List */}
        <div className="divide-y divide-slate-100 pt-2">
          {filteredVisits.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <MapPin size={32} className="mx-auto mb-2 opacity-40" />
              <p className="font-semibold text-slate-600">No site visits match this view.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Click "Schedule Site Visit" to book an inspection appointment.
              </p>
            </div>
          ) : (
            filteredVisits.map((visit) => {
              const cleanDigits = visit.leadPhone.replace(/\D/g, '');
              const waPhone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;

              return (
                <div
                  key={visit.id}
                  className="py-4 px-3 rounded-xl hover:bg-slate-50 transition flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  {/* Left Column: Customer and Project */}
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2.5 rounded-xl bg-navy-900 text-gold-400 shrink-0 mt-0.5">
                      <MapPin size={16} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{visit.leadName}</span>
                        {getStatusBadge(visit.status)}
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                          {getTypeLabel(visit.visitType)}
                        </span>
                      </div>

                      <div className="text-[11px] text-navy-950 font-semibold mt-0.5">
                        {visit.projectName}
                      </div>

                      <div className="text-slate-600 text-[11px] mt-0.5">
                        <span>Location: </span>
                        <span className="text-slate-800 font-medium">{visit.meetingLocation || 'Sales Gallery'}</span>
                      </div>

                      {visit.remarks && (
                        <p className="text-slate-500 text-[11px] mt-0.5 italic">
                          Notes: {visit.remarks}
                        </p>
                      )}

                      {visit.outcome && (
                        <div className="mt-1 p-2 rounded-lg bg-emerald-50/80 border border-emerald-200 text-emerald-800 text-[11px]">
                          <div className="flex items-center gap-1 font-semibold text-emerald-950">
                            {visit.rating && (
                              <div className="flex items-center text-amber-500 mr-2">
                                {Array.from({ length: 5 }, (_, i) => (
                                  <Star
                                    key={i}
                                    size={11}
                                    className={i < (visit.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
                                  />
                                ))}
                              </div>
                            )}
                            <span>Inspection Outcome:</span>
                          </div>
                          <p className="mt-0.5 text-slate-700">{visit.outcome}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-4 mt-1.5 text-[10px] text-slate-400 font-mono">
                        <span>Phone: <strong className="text-slate-700">{visit.leadPhone}</strong></span>
                        <span>Assigned Closer: <strong className="text-slate-700">{visit.assignedExecutiveName}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Appointment Date & Time */}
                  <div className="text-left md:text-right shrink-0">
                    <div className="flex items-center md:justify-end gap-1.5 text-slate-900 font-semibold text-xs">
                      <Calendar size={13} className="text-gold-600" />
                      <span>{formatDateTime(visit.visitDate)}</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                      {visit.status === 'completed'
                        ? `Conducted ${formatRelativeTime(visit.completedAt || visit.visitDate)}`
                        : formatRelativeTime(visit.visitDate)}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <a
                      href={`tel:${visit.leadPhone}`}
                      className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-xs"
                      title="Direct Call"
                    >
                      <Phone size={13} />
                    </a>

                    <a
                      href={`https://wa.me/${waPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white transition shadow-xs"
                      title="WhatsApp"
                    >
                      <MessageSquare size={13} />
                    </a>

                    {visit.status === 'scheduled' && (
                      <>
                        <button
                          onClick={() => {
                            setCompleteModalVisit(visit);
                            setRating(5);
                            setOutcome('');
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-navy-900 hover:bg-navy-800 text-white font-semibold transition"
                        >
                          Log Feedback
                        </button>

                        <button
                          onClick={() => {
                            setRescheduleModalVisit(visit);
                            setNewVisitDate(visit.visitDate.slice(0, 16));
                            setRescheduleNotes('');
                          }}
                          className="px-2 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition"
                        >
                          Reschedule
                        </button>

                        <button
                          onClick={() => cancelSiteVisit(visit.id, 'Cancelled by client')}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition"
                          title="Cancel"
                        >
                          <X size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal: Schedule Site Visit */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-sm animate-fade-in text-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-modal border border-surface-border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-navy-900 text-white">
              <h3 className="font-bold text-sm">Schedule Property Site Inspection</h3>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="p-5 space-y-3.5">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Select Customer / Lead *</label>
                <select
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white"
                >
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.firstName} {l.lastName} ({l.phone}) &bull; Prefers {l.preferredTypology}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Interested Project *</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Visit Type</label>
                  <select
                    value={visitType}
                    onChange={(e) => setVisitType(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="show_flat_visit">Show Flat Tour</option>
                    <option value="site_visit">Physical Site Tour</option>
                    <option value="virtual_tour">Virtual 3D Walkthrough</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Assigned Executive</label>
                  <select
                    value={assignedExecutive}
                    onChange={(e) => setAssignedExecutive(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    {salesExecutives.map((exec) => (
                      <option key={exec} value={exec}>
                        {exec}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Meeting Location / Pickup Point</label>
                <input
                  type="text"
                  value={meetingLocation}
                  onChange={(e) => setMeetingLocation(e.target.value)}
                  placeholder="e.g. Sales Gallery Experience Center, Worli"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Notes / Chauffeur Instructions</label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Customer bringing family; wants to review structural layout of Floor 8 or above..."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-navy-900 text-white font-semibold rounded-lg hover:bg-navy-800"
                >
                  Confirm Site Visit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Complete Visit & Log Feedback */}
      {completeModalVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-sm animate-fade-in text-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-modal border border-surface-border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-emerald-900 text-white">
              <h3 className="font-bold text-sm">
                Conducted Visit Feedback — {completeModalVisit.leadName}
              </h3>
              <button
                onClick={() => setCompleteModalVisit(null)}
                className="text-emerald-200 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCompleteSubmit} className="p-5 space-y-3.5">
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">
                  Customer Inspection Rating (1 - 5 Stars) *
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1.5 rounded-lg hover:bg-amber-50 transition"
                    >
                      <Star
                        size={24}
                        className={
                          star <= rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300'
                        }
                      />
                    </button>
                  ))}
                  <span className="font-bold text-slate-700 ml-2">{rating} / 5 Stars</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Visit Discussion Outcome & Customer Reaction *
                </label>
                <textarea
                  rows={3}
                  required
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  placeholder="Detailed feedback: preferred tower, views, floor rise objections, loan eligibility..."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCompleteModalVisit(null)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-700 text-white font-semibold rounded-lg hover:bg-emerald-600"
                >
                  Save Outcome & Advance Stage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reschedule Visit */}
      {rescheduleModalVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-sm animate-fade-in text-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-modal border border-surface-border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-navy-900 text-white">
              <h3 className="font-bold text-sm">Reschedule Site Visit</h3>
              <button
                onClick={() => setRescheduleModalVisit(null)}
                className="text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRescheduleSubmit} className="p-5 space-y-3.5">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">New Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={newVisitDate}
                  onChange={(e) => setNewVisitDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Rescheduling Reason</label>
                <input
                  type="text"
                  value={rescheduleNotes}
                  onChange={(e) => setRescheduleNotes(e.target.value)}
                  placeholder="e.g. Client requested postponement due to outstation travel"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRescheduleModalVisit(null)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-navy-900 text-white font-semibold rounded-lg hover:bg-navy-800"
                >
                  Confirm Reschedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

