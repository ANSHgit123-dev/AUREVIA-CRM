import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Eye, ShieldAlert, Sparkles } from 'lucide-react';
import { Lead, LeadSource, PipelineStage } from '../../../types';
import { useLeads } from '../../../context/LeadContext';
import { useProjectInventory } from '../../../context/ProjectInventoryContext';
import { formatIndianCurrency, getStageLabel } from '../../../lib/formatters';

interface LeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadToEdit?: Lead | null;
  onViewExistingLead?: (lead: Lead) => void;
}

const SOURCES: { value: LeadSource; label: string }[] = [
  { value: 'website', label: 'Website Direct' },
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'meta_ads', label: 'Meta Ads' },
  { value: '99acres', label: '99acres' },
  { value: 'magicbricks', label: 'MagicBricks' },
  { value: 'channel_partner', label: 'Channel Partner' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'referral', label: 'Referral' },
  { value: 'other', label: 'Other Campaign' },
];

const STAGES: { value: PipelineStage; label: string }[] = [
  { value: 'new', label: 'New Lead' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'site_visit_scheduled', label: 'Site Visit Scheduled' },
  { value: 'site_visit_conducted', label: 'Site Visit Conducted' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'token_paid', label: 'Token Paid' },
  { value: 'booked', label: 'Booked' },
  { value: 'lost', label: 'Lost' },
];

const CONFIG_OPTIONS = [
  '1 BHK',
  '2 BHK',
  '2.5 BHK',
  '3 BHK',
  '3.5 BHK',
  '4 BHK',
  'Penthouse',
  'Duplex',
];

export const LeadFormModal: React.FC<LeadFormModalProps> = ({
  isOpen,
  onClose,
  leadToEdit,
  onViewExistingLead,
}) => {
  const { addLead, updateLead, checkDuplicatePhone, salesExecutives } = useLeads();
  const { projects } = useProjectInventory();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Mumbai');
  const [projectId, setProjectId] = useState('');
  const [preferredTypology, setPreferredTypology] = useState('3 BHK');
  const [budgetMinInr, setBudgetMinInr] = useState<number>(30000000);
  const [budgetMaxInr, setBudgetMaxInr] = useState<number>(50000000);
  const [source, setSource] = useState<LeadSource>('website');
  const [priority, setPriority] = useState<'hot' | 'warm' | 'cold'>('warm');
  const [currentStage, setCurrentStage] = useState<PipelineStage>('new');
  const [assignedExecutiveName, setAssignedExecutiveName] = useState(salesExecutives[0] || 'Arjun Verma');
  const [notesText, setNotesText] = useState('');
  const [nextFollowUpAt, setNextFollowUpAt] = useState('');

  // Duplicate warning state
  const [duplicateLead, setDuplicateLead] = useState<Lead | undefined>(undefined);
  const [allowDuplicateOverride, setAllowDuplicateOverride] = useState(false);

  useEffect(() => {
    if (leadToEdit) {
      setFirstName(leadToEdit.firstName);
      setLastName(leadToEdit.lastName);
      setPhone(leadToEdit.phone);
      setEmail(leadToEdit.email);
      setCity(leadToEdit.city || 'Mumbai');
      setProjectId(leadToEdit.projectId);
      setPreferredTypology(leadToEdit.preferredTypology);
      setBudgetMinInr(leadToEdit.budgetMinInr);
      setBudgetMaxInr(leadToEdit.budgetMaxInr);
      setSource(leadToEdit.source);
      setPriority(leadToEdit.priority);
      setCurrentStage(leadToEdit.currentStage);
      setAssignedExecutiveName(leadToEdit.assignedExecutiveName);
      setNextFollowUpAt(leadToEdit.nextFollowUpAt ? leadToEdit.nextFollowUpAt.slice(0, 16) : '');
      setNotesText('');
      setDuplicateLead(undefined);
      setAllowDuplicateOverride(false);
    } else {
      setFirstName('');
      setLastName('');
      setPhone('');
      setEmail('');
      setCity('Mumbai');
      setProjectId(projects[0]?.id || '');
      setPreferredTypology('3 BHK');
      setBudgetMinInr(30000000);
      setBudgetMaxInr(50000000);
      setSource('website');
      setPriority('warm');
      setCurrentStage('new');
      setAssignedExecutiveName(salesExecutives[0] || 'Arjun Verma');
      setNextFollowUpAt('');
      setNotesText('');
      setDuplicateLead(undefined);
      setAllowDuplicateOverride(false);
    }
  }, [leadToEdit, projects, salesExecutives, isOpen]);

  // Live duplicate detection as user types phone
  useEffect(() => {
    if (!isOpen) return;
    if (phone.trim().length >= 8) {
      const existing = checkDuplicatePhone(phone, leadToEdit?.id);
      setDuplicateLead(existing);
    } else {
      setDuplicateLead(undefined);
    }
  }, [phone, isOpen, leadToEdit, checkDuplicatePhone]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !phone.trim()) {
      alert('First Name and Phone Number are required fields.');
      return;
    }

    // Check duplicate phone unless overridden
    if (duplicateLead && !allowDuplicateOverride && !leadToEdit) {
      alert('A lead with this phone number already exists. Please review or check the override box to proceed.');
      return;
    }

    const selectedProj = projects.find(p => p.id === projectId) || projects[0];

    if (leadToEdit) {
      updateLead(leadToEdit.id, {
        firstName,
        lastName,
        phone,
        email,
        city,
        projectId: selectedProj?.id || projectId,
        projectName: selectedProj?.name || leadToEdit.projectName,
        preferredTypology,
        budgetMinInr: Number(budgetMinInr),
        budgetMaxInr: Number(budgetMaxInr),
        source,
        priority,
        currentStage,
        assignedExecutiveName,
        nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt).toISOString() : undefined,
      });
    } else {
      addLead({
        firstName,
        lastName,
        phone,
        email,
        city,
        projectId: selectedProj?.id || 'proj-grandeur',
        projectName: selectedProj?.name || 'Aurevia Grandeur',
        preferredTypology,
        budgetMinInr: Number(budgetMinInr),
        budgetMaxInr: Number(budgetMaxInr),
        source,
        priority,
        currentStage,
        assignedExecutiveName,
        nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt).toISOString() : undefined,
        notes: notesText.trim()
          ? [
              {
                id: `note-${Date.now()}`,
                leadId: '',
                authorName: assignedExecutiveName,
                content: notesText.trim(),
                createdAt: new Date().toISOString(),
              },
            ]
          : [],
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-modal border border-surface-border overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-navy-900 text-white">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-navy-800 text-gold-500">
              <Sparkles size={16} />
            </span>
            <div>
              <h3 className="text-base font-bold">
                {leadToEdit ? `Edit Lead — ${leadToEdit.firstName} ${leadToEdit.lastName}` : 'Ingest New Lead'}
              </h3>
              <p className="text-xs text-slate-300">
                {leadToEdit ? 'Update prospect profile and preferences' : 'Direct capture, campaign attribution, and assignment'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-navy-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Duplicate Warning Alert */}
        {duplicateLead && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-3 text-xs">
            <ShieldAlert size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-950">
                <span>Duplicate Mobile Number Alert</span>
                <span className="px-1.5 py-0.2 rounded bg-amber-200 text-amber-800 text-[10px]">Match Found</span>
              </div>
              <p className="mt-1 leading-relaxed">
                A lead with phone <strong className="font-mono">{phone}</strong> already exists:
                <strong className="ml-1 text-slate-900">{duplicateLead.firstName} {duplicateLead.lastName}</strong>
                {' '}in <span className="font-medium text-navy-900">[{duplicateLead.projectName}]</span>
                {' '}(Stage: <span className="font-semibold text-amber-900">{getStageLabel(duplicateLead.currentStage)}</span>, Assigned to: {duplicateLead.assignedExecutiveName}).
              </p>
              <div className="mt-2.5 flex items-center gap-3">
                {onViewExistingLead && (
                  <button
                    type="button"
                    onClick={() => {
                      onViewExistingLead(duplicateLead);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-medium text-[11px] shadow-sm transition"
                  >
                    <Eye size={12} />
                    <span>View Existing Lead</span>
                  </button>
                )}
                <label className="flex items-center gap-1.5 text-[11px] text-amber-950 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={allowDuplicateOverride}
                    onChange={(e) => setAllowDuplicateOverride(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                  />
                  <span>Allow duplicate entry (New requirement / Separate project inquiry)</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Customer Personal Details */}
          <div>
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">1. Customer Identification</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Vikram"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-navy-900 focus:border-navy-900"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Singhania"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-navy-900 focus:border-navy-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98200 12345"
                  className={`w-full px-3 py-2 rounded-lg border font-mono ${
                    duplicateLead ? 'border-amber-400 bg-amber-50/30' : 'border-slate-300'
                  } focus:ring-2 focus:ring-navy-900 focus:border-navy-900`}
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@corporate.demo"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-navy-900 focus:border-navy-900"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">City / Location</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Mumbai, Bengaluru"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-navy-900 focus:border-navy-900"
                />
              </div>
            </div>
          </div>

          {/* Property Interests & Budget */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">2. Property Interest & Budget</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Interested Project</label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-navy-900 focus:border-navy-900 bg-white"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Preferred Typology / Configuration</label>
                <select
                  value={preferredTypology}
                  onChange={(e) => setPreferredTypology(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-navy-900 focus:border-navy-900 bg-white"
                >
                  {CONFIG_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Budget Min: <span className="text-navy-900 font-bold font-mono">{formatIndianCurrency(budgetMinInr)}</span>
                </label>
                <input
                  type="number"
                  step="500000"
                  min="1000000"
                  value={budgetMinInr}
                  onChange={(e) => setBudgetMinInr(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Budget Max: <span className="text-navy-900 font-bold font-mono">{formatIndianCurrency(budgetMaxInr)}</span>
                </label>
                <input
                  type="number"
                  step="500000"
                  min="1000000"
                  value={budgetMaxInr}
                  onChange={(e) => setBudgetMaxInr(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Lead Attribution & Assignment */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">3. Source, Priority & Assignment</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Lead Source</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value as LeadSource)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-navy-900 focus:border-navy-900 bg-white"
                >
                  {SOURCES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Priority Level</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-navy-900 focus:border-navy-900 bg-white"
                >
                  <option value="hot">🔥 Hot (Immediate Action)</option>
                  <option value="warm">⚡ Warm (Engaged)</option>
                  <option value="cold">❄️ Cold (Nurture)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Assigned Executive</label>
                <select
                  value={assignedExecutiveName}
                  onChange={(e) => setAssignedExecutiveName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-navy-900 focus:border-navy-900 bg-white font-medium"
                >
                  {salesExecutives.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Pipeline Status</label>
                <select
                  value={currentStage}
                  onChange={(e) => setCurrentStage(e.target.value as PipelineStage)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-navy-900 focus:border-navy-900 bg-white"
                >
                  {STAGES.map((st) => (
                    <option key={st.value} value={st.value}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Next Follow-up Schedule</label>
                <input
                  type="datetime-local"
                  value={nextFollowUpAt}
                  onChange={(e) => setNextFollowUpAt(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-navy-900 focus:border-navy-900"
                />
              </div>
            </div>
          </div>

          {/* Initial Note (only for new lead) */}
          {!leadToEdit && (
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-slate-700 font-semibold mb-1">Initial Customer Note / Requirement</label>
              <textarea
                rows={2}
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                placeholder="Specific buyer requirements, preferred floor range, sea-facing view preferences..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-navy-900 focus:border-navy-900"
              />
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={duplicateLead && !allowDuplicateOverride && !leadToEdit}
              className="px-5 py-2 rounded-lg bg-navy-900 hover:bg-navy-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold shadow-sm transition"
            >
              {leadToEdit ? 'Save Changes' : 'Create & Assign Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

