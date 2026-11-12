import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Phone,
  MessageSquare,
  Mail,
  Copy,
  Check,
  Building,
  User,
  Clock,
  Calendar,
  Send,
  Plus,
  ArrowRight,
  ChevronRight,
  ShieldAlert,
  MapPin,
  Receipt,
} from 'lucide-react';
import { Lead, PipelineStage, ContactHistoryItem } from '../../../types';
import { useLeads } from '../../../context/LeadContext';
import { LeadStageBadge } from './LeadStageBadge';
import { LeadPriorityBadge } from './LeadPriorityBadge';
import { LeadSourceBadge } from './LeadSourceBadge';
import {
  formatIndianCurrency,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  getStageLabel,
} from '../../../lib/formatters';

interface LeadDetailDrawerProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onEditLead: (lead: Lead) => void;
}

const STAGES_PIPELINE: PipelineStage[] = [
  'new',
  'contacted',
  'qualified',
  'site_visit_scheduled',
  'negotiation',
  'booked',
];

export const LeadDetailDrawer: React.FC<LeadDetailDrawerProps> = ({
  lead,
  isOpen,
  onClose,
  onEditLead,
}) => {
  const navigate = useNavigate();
  const {
    updateLeadStage,
    reassignLead,
    addLeadNote,
    logContactHistory,
    updateLead,
    activities,
    salesExecutives,
  } = useLeads();

  const [activeTab, setActiveTab] = useState<'timeline' | 'notes' | 'contact_history'>('timeline');
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // New Note state
  const [newNoteContent, setNewNoteContent] = useState('');

  // Quick log contact modal state
  const [showLogModal, setShowLogModal] = useState(false);
  const [contactType, setContactType] = useState<'call' | 'whatsapp' | 'email' | 'meeting' | 'site_visit'>('call');
  const [contactSummary, setContactSummary] = useState('');
  const [contactOutcome, setContactOutcome] = useState('');

  // Follow-up scheduling
  const [isEditingFollowUp, setIsEditingFollowUp] = useState(false);
  const [followUpInput, setFollowUpInput] = useState('');

  if (!isOpen || !lead) return null;

  // Filter activities for this lead
  const leadActivities = activities.filter((a) => a.leadId === lead.id);

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(lead.phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(lead.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleStageChange = (newStage: PipelineStage) => {
    updateLeadStage(lead.id, newStage);
  };

  const handleExecutiveChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    reassignLead(lead.id, e.target.value);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;
    addLeadNote(lead.id, newNoteContent.trim());
    setNewNoteContent('');
  };

  const handleLogContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactSummary.trim()) return;

    logContactHistory(lead.id, {
      type: contactType,
      summary: contactSummary.trim(),
      outcome: contactOutcome.trim() || undefined,
      performedBy: lead.assignedExecutiveName,
      date: new Date().toISOString(),
    });

    setContactSummary('');
    setContactOutcome('');
    setShowLogModal(false);
  };

  const handleSaveFollowUp = () => {
    updateLead(lead.id, {
      nextFollowUpAt: followUpInput ? new Date(followUpInput).toISOString() : undefined,
    });
    setIsEditingFollowUp(false);
  };

  const cleanDigits = lead.phone.replace(/\D/g, '');
  const waPhone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 flex justify-end">
      {/* Backdrop click to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer Container */}
      <div className="w-full max-w-xl bg-white h-full shadow-lg flex flex-col border-l border-[#E5E8EB] z-10 overflow-hidden">
        {/* Top Header */}
        <div className="p-4 bg-[#1E293B] text-white flex items-start justify-between border-b border-[#334155]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <LeadPriorityBadge priority={lead.priority} />
              <LeadStageBadge stage={lead.currentStage} size="md" />
              {lead.city && (
                <span className="text-[11px] text-slate-400 font-medium">
                  &bull; {lead.city}
                </span>
              )}
            </div>
            <h2 className="text-base font-semibold tracking-tight">
              {lead.firstName} {lead.lastName}
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Captured on {formatDate(lead.createdAt)} &bull; {lead.projectName}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onEditLead(lead)}
              className="px-2 py-1 text-xs rounded bg-white/10 hover:bg-white/20 text-white font-medium transition"
            >
              Edit
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-white transition"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Quick Contact & Action Bar */}
        <div className="px-4 py-2 bg-[#0F172A] border-b border-[#334155] flex items-center justify-between text-xs text-white">
          <div className="flex items-center gap-1.5">
            <a
              href={`tel:${lead.phone}`}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 font-medium text-white transition text-xs"
              title="Initiate phone call"
            >
              <Phone size={12} />
              <span>Call</span>
            </a>
            <a
              href={`https://wa.me/${waPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-800 hover:bg-emerald-700 font-medium text-white transition text-xs"
              title="Open WhatsApp chat"
            >
              <MessageSquare size={12} />
              <span>WhatsApp</span>
            </a>
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 font-medium text-slate-200 transition text-xs"
                title="Send email"
              >
                <Mail size={12} />
                <span>Email</span>
              </a>
            )}
          </div>

          <button
            onClick={() => setShowLogModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-white text-[#1C2024] font-medium transition text-xs hover:bg-[#F1F3F5]"
          >
            <Plus size={12} />
            <span>Log Interaction</span>
          </button>
        </div>

        {/* Stage Progression Stepper */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-2">
            <span className="uppercase tracking-wider">Pipeline Stage Progression</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Current:</span>
              <span className="font-bold text-navy-950">{getStageLabel(lead.currentStage)}</span>
            </div>
          </div>

          {/* Step circles */}
          <div className="grid grid-cols-6 gap-1">
            {STAGES_PIPELINE.map((st, idx) => {
              const currentIdx = STAGES_PIPELINE.indexOf(lead.currentStage);
              const isPassed = currentIdx >= idx;
              const isCurrent = lead.currentStage === st;

              return (
                <button
                  key={st}
                  onClick={() => handleStageChange(st)}
                  title={`Move to ${getStageLabel(st)}`}
                  className={`py-1.5 px-1 rounded text-center transition flex flex-col items-center group ${
                    isCurrent
                      ? 'bg-navy-900 text-white font-bold shadow-sm'
                      : isPassed
                      ? 'bg-emerald-100 text-emerald-800 font-medium hover:bg-emerald-200'
                      : 'bg-white text-slate-500 border border-slate-200 hover:border-navy-400'
                  }`}
                >
                  <span className="text-[10px] leading-tight truncate w-full px-0.5">
                    {getStageLabel(st).replace('Scheduled', 'Sched.')}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Mark as lost toggle */}
          <div className="mt-2 flex items-center justify-end gap-2 text-[11px]">
            {lead.currentStage !== 'lost' ? (
              <button
                onClick={() => handleStageChange('lost')}
                className="text-rose-600 hover:text-rose-800 font-semibold"
              >
                Mark as Lost Deal &rarr;
              </button>
            ) : (
              <button
                onClick={() => handleStageChange('new')}
                className="text-emerald-700 hover:text-emerald-900 font-semibold"
              >
                Re-open Lead (Move to New) &rarr;
              </button>
            )}
          </div>

          {/* Quick Operations Actions */}
          <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                navigate('/site-visits');
              }}
              className="flex-1 py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border border-amber-200 transition-colors"
            >
              <MapPin size={13} className="text-amber-600" />
              <span>Schedule Visit</span>
            </button>
            <button
              onClick={() => {
                onClose();
                navigate('/bookings');
              }}
              className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border border-emerald-200 transition-colors"
            >
              <Receipt size={13} className="text-emerald-600" />
              <span>Issue Allotment</span>
            </button>
          </div>
        </div>

        {/* Lead Profile Summary Card */}
        <div className="p-5 border-b border-slate-200 grid grid-cols-2 gap-4 text-xs bg-white">
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Contact Number</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono font-bold text-slate-800 text-sm">{lead.phone}</span>
              <button
                onClick={handleCopyPhone}
                className="p-1 rounded text-slate-400 hover:text-navy-900 transition"
                title="Copy phone"
              >
                {copiedPhone ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              </button>
            </div>
          </div>

          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Email Address</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-slate-700 truncate max-w-[170px]">{lead.email || '—'}</span>
              {lead.email && (
                <button
                  onClick={handleCopyEmail}
                  className="p-1 rounded text-slate-400 hover:text-navy-900 transition"
                  title="Copy email"
                >
                  {copiedEmail ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                </button>
              )}
            </div>
          </div>

          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Interested Property</span>
            <p className="font-semibold text-slate-900 mt-0.5">{lead.projectName}</p>
            <p className="text-[11px] text-slate-500">{lead.preferredTypology}</p>
          </div>

          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Budget Range</span>
            <p className="font-bold text-navy-900 font-mono mt-0.5">
              {formatIndianCurrency(lead.budgetMinInr)} – {formatIndianCurrency(lead.budgetMaxInr)}
            </p>
          </div>

          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Lead Acquisition Source</span>
            <div className="mt-1">
              <LeadSourceBadge source={lead.source} />
            </div>
          </div>

          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Assigned Executive</span>
            <select
              value={lead.assignedExecutiveName}
              onChange={handleExecutiveChange}
              className="mt-1 w-full px-2 py-1 rounded border border-slate-300 text-xs font-semibold text-navy-900 focus:ring-1 focus:ring-navy-900 bg-slate-50"
            >
              {salesExecutives.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Follow-up info & scheduler */}
          <div className="col-span-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-gold-600" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Next Scheduled Follow-up:</span>
                <span className="ml-1.5 font-semibold text-slate-800">
                  {lead.nextFollowUpAt ? formatDateTime(lead.nextFollowUpAt) : 'None scheduled'}
                </span>
              </div>
            </div>

            {!isEditingFollowUp ? (
              <button
                onClick={() => {
                  setFollowUpInput(lead.nextFollowUpAt ? lead.nextFollowUpAt.slice(0, 16) : '');
                  setIsEditingFollowUp(true);
                }}
                className="text-[11px] font-semibold text-navy-900 hover:text-navy-700 underline"
              >
                {lead.nextFollowUpAt ? 'Reschedule' : 'Set Follow-up'}
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <input
                  type="datetime-local"
                  value={followUpInput}
                  onChange={(e) => setFollowUpInput(e.target.value)}
                  className="px-2 py-1 border rounded text-[11px]"
                />
                <button
                  onClick={handleSaveFollowUp}
                  className="px-2 py-1 bg-navy-900 text-white rounded text-[10px] font-semibold"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditingFollowUp(false)}
                  className="px-1.5 py-1 text-slate-400 hover:text-slate-600 text-[10px]"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 text-xs">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`py-3 px-3 font-semibold border-b-2 transition ${
              activeTab === 'timeline'
                ? 'border-navy-900 text-navy-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Activity Timeline ({leadActivities.length})
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`py-3 px-3 font-semibold border-b-2 transition ${
              activeTab === 'notes'
                ? 'border-navy-900 text-navy-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Team Notes ({(lead.notes || []).length})
          </button>
          <button
            onClick={() => setActiveTab('contact_history')}
            className={`py-3 px-3 font-semibold border-b-2 transition ${
              activeTab === 'contact_history'
                ? 'border-navy-900 text-navy-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Contact History ({(lead.contactHistory || []).length})
          </button>
        </div>

        {/* Tab Contents (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 text-xs bg-slate-50/50">
          {/* 1. TIMELINE TAB */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              {leadActivities.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <Clock size={28} className="mx-auto mb-2 opacity-50" />
                  <p>No activity records logged yet for this lead.</p>
                </div>
              ) : (
                leadActivities.map((act) => (
                  <div key={act.id} className="relative pl-6 pb-2 border-l-2 border-slate-200 last:border-l-0">
                    <span className="absolute -left-[7px] top-0 h-3 w-3 rounded-full bg-navy-900 ring-4 ring-white" />
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-bold text-slate-900">{act.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatRelativeTime(act.createdAt)}
                        </span>
                      </div>
                      <p className="text-slate-600 leading-relaxed">{act.description}</p>
                      <div className="mt-2 text-[10px] text-slate-400 font-medium">
                        Actor: <span className="text-slate-600 font-semibold">{act.actorName}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 2. NOTES TAB */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              {/* Add Note Form */}
              <form onSubmit={handleAddNote} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Add Executive Note
                </label>
                <textarea
                  rows={2}
                  required
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Record customer preferences, budget negotiations, family requirements..."
                  className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-1 focus:ring-navy-900 text-xs"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-900 hover:bg-navy-800 text-white font-semibold text-xs transition"
                  >
                    <Send size={12} />
                    <span>Post Note</span>
                  </button>
                </div>
              </form>

              {/* Notes List */}
              <div className="space-y-3">
                {(!lead.notes || lead.notes.length === 0) ? (
                  <p className="text-slate-400 text-center py-6">No customer notes recorded yet.</p>
                ) : (
                  lead.notes.map((n) => (
                    <div key={n.id} className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span className="font-bold text-navy-900">{n.authorName}</span>
                        <span className="font-mono">{formatRelativeTime(n.createdAt)}</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{n.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 3. CONTACT HISTORY TAB */}
          {activeTab === 'contact_history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Logged Interactions
                </span>
                <button
                  onClick={() => setShowLogModal(true)}
                  className="text-xs font-semibold text-navy-900 hover:text-navy-700 flex items-center gap-1"
                >
                  <Plus size={13} />
                  <span>Log Interaction</span>
                </button>
              </div>

              {(!lead.contactHistory || lead.contactHistory.length === 0) ? (
                <div className="text-center py-8 text-slate-400 bg-white rounded-xl border border-slate-200">
                  <Phone size={24} className="mx-auto mb-2 opacity-40" />
                  <p>No phone or meeting history logged yet.</p>
                </div>
              ) : (
                lead.contactHistory.map((item) => (
                  <div key={item.id} className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                        {item.type}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatDateTime(item.date)}
                      </span>
                    </div>
                    <p className="text-slate-800 font-medium mt-1">{item.summary}</p>
                    {item.outcome && (
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        Outcome: <span className="text-slate-700 italic">{item.outcome}</span>
                      </p>
                    )}
                    <div className="mt-2 text-[10px] text-slate-400">
                      Logged by: {item.performedBy}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Log Interaction Modal Overlay */}
        {showLogModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40">
            <div className="bg-white rounded-md p-5 w-full max-w-md shadow-lg border border-[#E5E8EB] text-xs">
              <div className="flex items-center justify-between mb-3 border-b border-[#E5E8EB] pb-2">
                <h4 className="font-semibold text-sm text-[#1C2024]">Log Customer Contact</h4>
                <button onClick={() => setShowLogModal(false)} className="text-[#8B8D98] hover:text-[#1C2024]">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleLogContact} className="space-y-3">
                <div>
                  <label className="block text-[#1C2024] font-medium mb-1">Interaction Type</label>
                  <select
                    value={contactType}
                    onChange={(e) => setContactType(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 border border-[#E5E8EB] rounded bg-white text-xs text-[#1C2024] focus:outline-none focus:border-[#1E293B]"
                  >
                    <option value="call">Outbound Phone Call</option>
                    <option value="whatsapp">WhatsApp Conversation</option>
                    <option value="site_visit">Site Visit / Show Flat Tour</option>
                    <option value="meeting">In-Person Meeting</option>
                    <option value="email">Formal Email</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Discussion Summary *</label>
                  <textarea
                    rows={2}
                    required
                    value={contactSummary}
                    onChange={(e) => setContactSummary(e.target.value)}
                    placeholder="e.g. Discussed 3 BHK pricing and stamp duty concessions..."
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Customer Reaction / Outcome</label>
                  <input
                    type="text"
                    value={contactOutcome}
                    onChange={(e) => setContactOutcome(e.target.value)}
                    placeholder="e.g. Positive, requested floor plan on WhatsApp"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowLogModal(false)}
                    className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-navy-900 text-white font-semibold rounded-lg hover:bg-navy-800"
                  >
                    Save Interaction
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

