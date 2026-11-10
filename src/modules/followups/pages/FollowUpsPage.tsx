import React, { useState, useMemo } from 'react';
import {
  CalendarCheck,
  Phone,
  MessageSquare,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Search,
  Filter,
  User,
  Building,
  RotateCcw,
  X,
  Send,
  MoreVertical,
  Check,
  ChevronRight,
  Flame,
} from 'lucide-react';
import { FollowUpTask, FollowUpActivityType, FollowUpStatus } from '../../../types';
import { useLeads } from '../../../context/LeadContext';
import { MetricCard } from '../../../components/common/MetricCard';
import { LeadPriorityBadge } from '../../leads/components/LeadPriorityBadge';
import {
  formatDate,
  formatDateTime,
  formatRelativeTime,
} from '../../../lib/formatters';

type TabKey = 'all' | 'today' | 'overdue' | 'upcoming' | 'completed';

export const FollowUpsPage: React.FC = () => {
  const {
    leads,
    followUps,
    followUpStats,
    salesExecutives,
    addFollowUp,
    completeFollowUp,
    cancelFollowUp,
    rescheduleFollowUp,
    deleteFollowUp,
  } = useLeads();

  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExecutive, setSelectedExecutive] = useState('all');
  const [selectedType, setSelectedType] = useState<FollowUpActivityType | 'all'>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [completeTaskModal, setCompleteTaskModal] = useState<FollowUpTask | null>(null);
  const [rescheduleTaskModal, setRescheduleTaskModal] = useState<FollowUpTask | null>(null);

  // Form states for modals
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [activityType, setActivityType] = useState<FollowUpActivityType>('phone_call');
  const [priority, setPriority] = useState<'hot' | 'warm' | 'cold'>('hot');
  const [assignedExecutive, setAssignedExecutive] = useState(salesExecutives[0] || 'Arjun Verma');
  const [remarks, setRemarks] = useState('');

  // Complete modal state
  const [completionOutcome, setCompletionOutcome] = useState('');

  // Reschedule modal state
  const [newScheduleTime, setNewScheduleTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  // Filtered Follow-up Tasks
  const filteredFollowUps = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfToday = startOfToday + 24 * 3600 * 1000;

    return followUps.filter((task) => {
      // Tab filter
      const taskTime = new Date(task.scheduledFor).getTime();
      const isPast = taskTime < Date.now() || task.status === 'overdue';

      if (activeTab === 'today') {
        if (task.status === 'completed' || task.status === 'cancelled') return false;
        if (taskTime < startOfToday || taskTime >= endOfToday) return false;
      } else if (activeTab === 'overdue') {
        if (task.status === 'completed' || task.status === 'cancelled') return false;
        if (!isPast) return false;
      } else if (activeTab === 'upcoming') {
        if (task.status === 'completed' || task.status === 'cancelled') return false;
        if (taskTime < endOfToday) return false;
      } else if (activeTab === 'completed') {
        if (task.status !== 'completed') return false;
      }

      // Search filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = task.leadName.toLowerCase().includes(term);
        const matchesPhone = task.leadPhone.toLowerCase().includes(term);
        const matchesRemarks = task.remarks.toLowerCase().includes(term);
        const matchesProject = task.projectName ? task.projectName.toLowerCase().includes(term) : false;
        if (!matchesName && !matchesPhone && !matchesRemarks && !matchesProject) return false;
      }

      // Executive filter
      if (selectedExecutive !== 'all' && task.assignedExecutiveName !== selectedExecutive) {
        return false;
      }

      // Type filter
      if (selectedType !== 'all' && task.activityType !== selectedType) {
        return false;
      }

      // Priority filter
      if (selectedPriority !== 'all' && task.priority !== selectedPriority) {
        return false;
      }

      return true;
    });
  }, [
    followUps,
    activeTab,
    searchTerm,
    selectedExecutive,
    selectedType,
    selectedPriority,
  ]);

  const sortedTasks = useMemo(() => {
    return [...filteredFollowUps].sort((a, b) => {
      if (activeTab === 'completed') {
        const timeA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const timeB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return timeB - timeA;
      }
      return new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime();
    });
  }, [filteredFollowUps, activeTab]);

  const handleOpenCreateModal = () => {
    setSelectedLeadId(leads[0]?.id || '');
    const defaultTime = new Date(Date.now() + 2 * 3600 * 1000).toISOString().slice(0, 16);
    setScheduledFor(defaultTime);
    setActivityType('phone_call');
    setPriority('hot');
    setAssignedExecutive(salesExecutives[0] || 'Arjun Verma');
    setRemarks('');
    setIsCreateModalOpen(true);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    const lead = leads.find((l) => l.id === selectedLeadId) || leads[0];
    if (!lead) return;

    addFollowUp({
      leadId: lead.id,
      leadName: `${lead.firstName} ${lead.lastName}`,
      leadPhone: lead.phone,
      assignedExecutiveName: assignedExecutive,
      projectName: lead.projectName,
      scheduledFor: new Date(scheduledFor).toISOString(),
      activityType,
      status: new Date(scheduledFor).getTime() < Date.now() ? 'overdue' : 'pending',
      priority,
      remarks: remarks.trim() || `Scheduled ${activityType.replace('_', ' ')} with prospect.`,
    });

    setIsCreateModalOpen(false);
  };

  const handleConfirmComplete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeTaskModal) return;

    completeFollowUp(completeTaskModal.id, completionOutcome.trim());
    setCompleteTaskModal(null);
    setCompletionOutcome('');
  };

  const handleConfirmReschedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleTaskModal || !newScheduleTime) return;

    rescheduleFollowUp(
      rescheduleTaskModal.id,
      new Date(newScheduleTime).toISOString(),
      rescheduleReason.trim()
    );
    setRescheduleTaskModal(null);
    setNewScheduleTime('');
    setRescheduleReason('');
  };

  const getTypeIcon = (type: FollowUpActivityType) => {
    switch (type) {
      case 'phone_call':
        return <Phone size={13} className="text-blue-600" />;
      case 'whatsapp_message':
        return <MessageSquare size={13} className="text-emerald-600" />;
      case 'in_person_meeting':
        return <User size={13} className="text-purple-600" />;
      case 'site_visit':
        return <Building size={13} className="text-amber-600" />;
      case 'email':
        return <Clock size={13} className="text-sky-600" />;
      default:
        return <Phone size={13} className="text-slate-600" />;
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-gold-600 text-xs font-semibold uppercase tracking-wider">
            <CalendarCheck size={14} />
            <span>Task Execution & Daily Outreach</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
            Follow-up & Task Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track daily customer touchpoints, resolve overdue callbacks, and automatically record completed conversations.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold shadow-card transition shrink-0 self-start md:self-auto"
        >
          <Plus size={15} />
          <span>Schedule Follow-up</span>
        </button>
      </div>

      {/* 2. Overdue Warning Banner */}
      {followUpStats.overdueCount > 0 && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-950 text-sm">
                Attention Required: {followUpStats.overdueCount} Overdue Client Follow-ups
              </p>
              <p className="text-rose-800 mt-0.5 leading-relaxed">
                Leads requiring immediate telephone calls or site visit follow-ups have passed their scheduled SLA time. Contact these clients now to prevent lead drop-off.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('overdue')}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition shrink-0"
          >
            View Overdue Tasks ({followUpStats.overdueCount})
          </button>
        </div>
      )}

      {/* 3. Follow-up Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          title="Due Today"
          value={followUpStats.todayCount.toString()}
          subtitle="Scheduled for today"
          icon={Calendar}
          variant="gold"
        />
        <MetricCard
          title="Overdue Tasks"
          value={followUpStats.overdueCount.toString()}
          subtitle="Immediate action required"
          icon={AlertTriangle}
          variant="rose"
        />
        <MetricCard
          title="Upcoming Schedule"
          value={followUpStats.upcomingCount.toString()}
          subtitle="Future appointments"
          icon={Clock}
        />
        <MetricCard
          title="Completed"
          value={followUpStats.completedCount.toString()}
          subtitle="Interactions logged"
          icon={CheckCircle2}
          variant="emerald"
        />
      </div>

      {/* 4. Tab Navigation Bar */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 text-xs font-semibold text-slate-600">
        <button
          onClick={() => setActiveTab('all')}
          className={`py-3 px-4 border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'all'
              ? 'border-navy-900 text-navy-950 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>All Tasks</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 text-[10px]">
            {followUps.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('today')}
          className={`py-3 px-4 border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'today'
              ? 'border-navy-900 text-navy-950 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Today's Due</span>
          <span className="px-1.5 py-0.2 rounded-full bg-gold-100 text-gold-900 text-[10px]">
            {followUpStats.todayCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('overdue')}
          className={`py-3 px-4 border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'overdue'
              ? 'border-rose-600 text-rose-700 font-bold'
              : 'border-transparent text-rose-600 hover:text-rose-800'
          }`}
        >
          <span>Overdue</span>
          <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 text-[10px]">
            {followUpStats.overdueCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('upcoming')}
          className={`py-3 px-4 border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'upcoming'
              ? 'border-navy-900 text-navy-950 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Upcoming</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 text-[10px]">
            {followUpStats.upcomingCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`py-3 px-4 border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'completed'
              ? 'border-emerald-600 text-emerald-800 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Completed</span>
          <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">
            {followUpStats.completedCount}
          </span>
        </button>
      </div>

      {/* 5. Search & Filters Bar */}
      <div className="bg-white p-4 border border-t-0 border-surface-border shadow-card space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search follow-ups by customer name, phone, remarks..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-navy-900"
            />
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <select
              value={selectedExecutive}
              onChange={(e) => setSelectedExecutive(e.target.value)}
              className="px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800"
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
              className="px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800"
            >
              <option value="all">All Types</option>
              <option value="phone_call">Phone Call</option>
              <option value="whatsapp_message">WhatsApp</option>
              <option value="site_visit">Site Visit</option>
              <option value="in_person_meeting">Meeting</option>
              <option value="email">Email</option>
            </select>

            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800"
            >
              <option value="all">All Priorities</option>
              <option value="hot">🔥 Hot</option>
              <option value="warm">⚡ Warm</option>
              <option value="cold">❄️ Cold</option>
            </select>
          </div>
        </div>

        {/* 6. Tasks List */}
        <div className="divide-y divide-slate-100 pt-2">
          {sortedTasks.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <CalendarCheck size={32} className="mx-auto mb-2 opacity-40" />
              <p className="font-semibold text-slate-600">No follow-up tasks match this view.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Check other tabs or click "Schedule Follow-up" to plan client outreach.
              </p>
            </div>
          ) : (
            sortedTasks.map((task) => {
              const taskTime = new Date(task.scheduledFor).getTime();
              const isOverdue =
                task.status !== 'completed' &&
                task.status !== 'cancelled' &&
                (taskTime < Date.now() || task.status === 'overdue');
              const isCompleted = task.status === 'completed';

              const cleanPhone = task.leadPhone.replace(/\D/g, '');
              const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

              return (
                <div
                  key={task.id}
                  className={`py-3.5 px-3 rounded-xl transition flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    isOverdue
                      ? 'bg-rose-50/60 border border-rose-100 hover:bg-rose-50'
                      : isCompleted
                      ? 'bg-slate-50/40 text-slate-500'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Left Column: Customer and Activity Type */}
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-xs shrink-0 mt-0.5">
                      {getTypeIcon(task.activityType)}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">{task.leadName}</span>
                        <LeadPriorityBadge priority={task.priority} showIcon={false} />
                        {task.projectName && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            &bull; {task.projectName}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-600 mt-0.5">
                        <span className="font-medium text-slate-800">{task.remarks}</span>
                      </div>

                      {task.completionOutcome && (
                        <div className="text-[11px] text-emerald-700 mt-1 italic bg-emerald-50/80 px-2 py-0.5 rounded border border-emerald-200/60 inline-block">
                          Outcome: {task.completionOutcome}
                        </div>
                      )}

                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400 font-mono">
                        <span>Lead Phone: <strong className="text-slate-700">{task.leadPhone}</strong></span>
                        <span>Assigned: <strong className="text-slate-700">{task.assignedExecutiveName}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Middle Column: Scheduled Time */}
                  <div className="text-left md:text-right shrink-0">
                    <div className="flex items-center md:justify-end gap-1.5">
                      <Clock
                        size={12}
                        className={isOverdue ? 'text-rose-600' : 'text-slate-400'}
                      />
                      <span
                        className={`text-xs font-semibold ${
                          isOverdue ? 'text-rose-600' : 'text-slate-700'
                        }`}
                      >
                        {formatDateTime(task.scheduledFor)}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                      {isCompleted ? (
                        <span className="text-emerald-700 font-semibold">Completed</span>
                      ) : (
                        formatRelativeTime(task.scheduledFor)
                      )}
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    {/* Quick Call */}
                    <a
                      href={`tel:${task.leadPhone}`}
                      className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-xs"
                      title="Direct Call"
                    >
                      <Phone size={13} />
                    </a>

                    {/* Quick WhatsApp */}
                    <a
                      href={`https://wa.me/${waPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white transition shadow-xs"
                      title="Open WhatsApp"
                    >
                      <MessageSquare size={13} />
                    </a>

                    {!isCompleted ? (
                      <>
                        <button
                          onClick={() => {
                            setCompleteTaskModal(task);
                            setCompletionOutcome('');
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold shadow-xs transition flex items-center gap-1"
                        >
                          <Check size={12} />
                          <span>Complete</span>
                        </button>

                        <button
                          onClick={() => {
                            setRescheduleTaskModal(task);
                            setNewScheduleTime(task.scheduledFor.slice(0, 16));
                            setRescheduleReason('');
                          }}
                          className="px-2 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium transition"
                        >
                          Reschedule
                        </button>

                        <button
                          onClick={() => cancelFollowUp(task.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition"
                          title="Cancel Task"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                        Resolved
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal: Schedule Follow-up */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-modal border border-surface-border overflow-hidden text-xs">
            <div className="flex items-center justify-between px-5 py-3.5 bg-navy-900 text-white">
              <h3 className="font-bold text-sm">Schedule Customer Follow-up</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-5 space-y-3.5">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Associated Lead *</label>
                <select
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white"
                >
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.firstName} {l.lastName} ({l.phone}) &bull; {l.projectName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Follow-up Type</label>
                  <select
                    value={activityType}
                    onChange={(e) => setActivityType(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="phone_call">Phone Call</option>
                    <option value="whatsapp_message">WhatsApp Message</option>
                    <option value="site_visit">Site Visit Inspection</option>
                    <option value="in_person_meeting">In-Person Meeting</option>
                    <option value="email">Email Follow-up</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="hot">🔥 Hot</option>
                    <option value="warm">⚡ Warm</option>
                    <option value="cold">❄️ Cold</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Scheduled Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
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

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Task Remarks / Agenda *</label>
                <textarea
                  rows={2}
                  required
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Call to discuss payment schedule approval for Sea-facing 4 BHK..."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-navy-900 text-white font-semibold rounded-lg hover:bg-navy-800"
                >
                  Schedule Follow-up
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Complete Follow-up */}
      {completeTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-modal border border-surface-border overflow-hidden text-xs">
            <div className="flex items-center justify-between px-5 py-3.5 bg-emerald-900 text-white">
              <h3 className="font-bold text-sm">
                Log Completed Interaction — {completeTaskModal.leadName}
              </h3>
              <button
                onClick={() => setCompleteTaskModal(null)}
                className="text-emerald-200 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmComplete} className="p-5 space-y-3.5">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="font-semibold text-slate-800">{completeTaskModal.remarks}</p>
                <p className="text-[10px] text-slate-400 font-mono mt-1">
                  Scheduled: {formatDateTime(completeTaskModal.scheduledFor)}
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Discussion Outcome / Client Feedback *
                </label>
                <textarea
                  rows={3}
                  required
                  value={completionOutcome}
                  onChange={(e) => setCompletionOutcome(e.target.value)}
                  placeholder="Record summary of call/meeting, objections addressed, or next client requirements..."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCompleteTaskModal(null)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-700 text-white font-semibold rounded-lg hover:bg-emerald-600"
                >
                  Confirm & Save to Audit Timeline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reschedule Follow-up */}
      {rescheduleTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-modal border border-surface-border overflow-hidden text-xs">
            <div className="flex items-center justify-between px-5 py-3.5 bg-navy-900 text-white">
              <h3 className="font-bold text-sm">Reschedule Task</h3>
              <button
                onClick={() => setRescheduleTaskModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmReschedule} className="p-5 space-y-3.5">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">New Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={newScheduleTime}
                  onChange={(e) => setNewScheduleTime(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Reason for Rescheduling</label>
                <input
                  type="text"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="e.g. Customer in flight, requested call tomorrow morning"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRescheduleTaskModal(null)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-navy-900 text-white font-semibold rounded-lg hover:bg-navy-800"
                >
                  Save Reschedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

