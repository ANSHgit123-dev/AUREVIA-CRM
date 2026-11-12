import React, { useState, useMemo } from 'react';
import {
  Kanban,
  Search,
  Filter,
  Plus,
  Flame,
  Calendar,
  Clock,
  User,
  Building,
  RotateCcw,
  ArrowRight,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { Lead, PipelineStage, LeadSource } from '../../../types';
import { useLeads, PIPELINE_STAGES_ORDER } from '../../../context/LeadContext';
import { useProjectInventory } from '../../../context/ProjectInventoryContext';
import { LeadPriorityBadge } from '../../leads/components/LeadPriorityBadge';
import { LeadDetailDrawer } from '../../leads/components/LeadDetailDrawer';
import { LeadFormModal } from '../../leads/components/LeadFormModal';
import {
  formatIndianCurrency,
  formatDate,
  formatRelativeTime,
  getStageLabel,
  getSourceLabel,
} from '../../../lib/formatters';

const STAGE_CONFIG: Record<
  PipelineStage,
  { label: string; headerBg: string; border: string; badgeBg: string; badgeText: string }
> = {
  new: {
    label: 'New Leads',
    headerBg: 'bg-slate-100',
    border: 'border-slate-300',
    badgeBg: 'bg-slate-200',
    badgeText: 'text-slate-800',
  },
  contacted: {
    label: 'Contacted',
    headerBg: 'bg-blue-50',
    border: 'border-blue-200',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-800',
  },
  qualified: {
    label: 'Qualified',
    headerBg: 'bg-indigo-50',
    border: 'border-indigo-200',
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-800',
  },
  site_visit_scheduled: {
    label: 'Site Visit Sched.',
    headerBg: 'bg-amber-50',
    border: 'border-amber-200',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
  },
  site_visit_conducted: {
    label: 'Visit Done',
    headerBg: 'bg-orange-50',
    border: 'border-orange-200',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-800',
  },
  negotiation: {
    label: 'Negotiation',
    headerBg: 'bg-purple-50',
    border: 'border-purple-200',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-800',
  },
  token_paid: {
    label: 'Token Paid',
    headerBg: 'bg-emerald-50',
    border: 'border-emerald-200',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
  },
  booked: {
    label: 'Booked Allotment',
    headerBg: 'bg-emerald-100',
    border: 'border-emerald-300',
    badgeBg: 'bg-emerald-200',
    badgeText: 'text-emerald-900',
  },
  lost: {
    label: 'Lost Deals',
    headerBg: 'bg-rose-50',
    border: 'border-rose-200',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-800',
  },
};

export const PipelinePage: React.FC = () => {
  const {
    leads,
    salesExecutives,
    updateLeadStage,
    totalPipelineValueInr,
    followUpStats,
  } = useLeads();
  const { projects } = useProjectInventory();

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedExecutive, setSelectedExecutive] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedSource, setSelectedSource] = useState('all');

  // Drag and Drop State
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<PipelineStage | null>(null);

  // Modals & Drawer State
  const [selectedLeadForDrawer, setSelectedLeadForDrawer] = useState<Lead | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState<Lead | null>(null);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const fullName = `${lead.firstName} ${lead.lastName}`.toLowerCase();
        if (
          !fullName.includes(term) &&
          !lead.phone.includes(term) &&
          !lead.projectName.toLowerCase().includes(term)
        ) {
          return false;
        }
      }

      if (selectedProject !== 'all' && lead.projectId !== selectedProject) return false;
      if (selectedExecutive !== 'all' && lead.assignedExecutiveName !== selectedExecutive) return false;
      if (selectedPriority !== 'all' && lead.priority !== selectedPriority) return false;
      if (selectedSource !== 'all') {
        if (selectedSource === 'google_ads' && (lead.source === 'google_ads' || lead.source === 'google_search')) {
          // match
        } else if (selectedSource === '99acres' && (lead.source === '99acres' || lead.source === 'real_estate_portal')) {
          // match
        } else if (lead.source !== selectedSource) {
          return false;
        }
      }

      return true;
    });
  }, [leads, searchTerm, selectedProject, selectedExecutive, selectedPriority, selectedSource]);

  const hasActiveFilters =
    searchTerm !== '' ||
    selectedProject !== 'all' ||
    selectedExecutive !== 'all' ||
    selectedPriority !== 'all' ||
    selectedSource !== 'all';

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedProject('all');
    setSelectedExecutive('all');
    setSelectedPriority('all');
    setSelectedSource('all');
  };

  // Group filtered leads by stage
  const columnsData = useMemo(() => {
    return PIPELINE_STAGES_ORDER.map((stage) => {
      const stageLeads = filteredLeads.filter((l) => l.currentStage === stage);
      const totalVal = stageLeads.reduce(
        (sum, l) => sum + (l.budgetMaxInr || l.budgetMinInr || 0),
        0
      );
      return {
        stage,
        config: STAGE_CONFIG[stage],
        leads: stageLeads,
        totalValueInr: totalVal,
      };
    });
  }, [filteredLeads]);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.setData('text/plain', leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, stage: PipelineStage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStage !== stage) {
      setDragOverStage(stage);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStage: PipelineStage) => {
    e.preventDefault();
    setDragOverStage(null);
    const leadId = e.dataTransfer.getData('text/plain') || draggedLeadId;
    if (leadId) {
      updateLeadStage(leadId, targetStage, 'Moved via Visual Pipeline drag-and-drop');
      setDraggedLeadId(null);
    }
  };

  const handleOpenLeadDrawer = (lead: Lead) => {
    setSelectedLeadForDrawer(lead);
    setIsDrawerOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E5E8EB]">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            <span>Sales Operations</span>
            <span>&bull;</span>
            <span>Kanban Board</span>
          </div>
          <h1 className="text-lg font-semibold text-slate-900 tracking-tight mt-0.5">
            Sales Pipeline
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="h-8 px-2.5 rounded border border-[#E5E8EB] bg-white flex items-center gap-1.5 text-slate-700">
            <span className="text-[10px] text-slate-400 uppercase font-mono">Pipeline:</span>
            <span className="font-semibold font-mono text-slate-900">
              {formatIndianCurrency(totalPipelineValueInr)}
            </span>
          </div>

          <div className="h-8 px-2.5 rounded border border-[#E5E8EB] bg-white flex items-center gap-1.5 text-slate-700">
            <span className="text-[10px] text-slate-400 uppercase font-mono">Deals:</span>
            <span className="font-semibold font-mono text-slate-900">
              {leads.filter((l) => l.currentStage !== 'lost').length}
            </span>
          </div>

          {followUpStats.overdueCount > 0 && (
            <div className="h-8 px-2.5 rounded border border-rose-200 bg-rose-50 flex items-center gap-1.5 text-rose-700 font-medium">
              <span className="text-[10px] uppercase font-mono">Overdue:</span>
              <span className="font-semibold font-mono">
                {followUpStats.overdueCount}
              </span>
            </div>
          )}

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="h-8 px-3 inline-flex items-center gap-1.5 rounded bg-[#1E293B] hover:bg-slate-800 text-white font-medium text-xs transition"
          >
            <Plus size={13} />
            <span>New Lead</span>
          </button>
        </div>
      </div>

      {/* 2. Filter & Search Toolbar */}
      <div className="bg-white rounded-md border border-[#E5E8EB] p-2.5 space-y-2">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search prospects by customer name, mobile, or project..."
              className="w-full h-8 pl-8 pr-3 rounded border border-[#E5E8EB] bg-[#F8F9FA] text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-slate-400 transition"
            />
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 h-8 px-2.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition shrink-0"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1 border-t border-[#E5E8EB]">
          <div>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full h-8 px-2 rounded border border-[#E5E8EB] bg-[#F8F9FA] text-xs text-slate-700"
            >
              <option value="all">All Projects ({projects.length})</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedExecutive}
              onChange={(e) => setSelectedExecutive(e.target.value)}
              className="w-full h-8 px-2 rounded border border-[#E5E8EB] bg-[#F8F9FA] text-xs text-slate-700"
            >
              <option value="all">All Executives</option>
              {salesExecutives.map((exec) => (
                <option key={exec} value={exec}>
                  {exec}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full h-8 px-2 rounded border border-[#E5E8EB] bg-[#F8F9FA] text-xs text-slate-700"
            >
              <option value="all">All Priorities</option>
              <option value="hot">Hot</option>
              <option value="warm">Warm</option>
              <option value="cold">Cold</option>
            </select>
          </div>

          <div>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="w-full h-8 px-2 rounded border border-[#E5E8EB] bg-[#F8F9FA] text-xs text-slate-700"
            >
              <option value="all">All Sources</option>
              <option value="website">Website Direct</option>
              <option value="google_ads">Google Ads</option>
              <option value="meta_ads">Meta Ads</option>
              <option value="99acres">99acres</option>
              <option value="magicbricks">MagicBricks</option>
              <option value="channel_partner">Channel Partner</option>
              <option value="walk_in">Walk-in</option>
              <option value="referral">Referral</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. 9-Column Kanban Board */}
      <div className="overflow-x-auto pb-3">
        <div className="inline-flex gap-2.5 min-w-full items-start">
          {columnsData.map(({ stage, config, leads: colLeads, totalValueInr: colVal }) => {
            const isHovered = dragOverStage === stage;

            return (
              <div
                key={stage}
                onDragOver={(e) => handleDragOver(e, stage)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage)}
                className={`w-72 shrink-0 rounded-md border transition-colors flex flex-col bg-[#F8F9FA] ${
                  isHovered
                    ? 'border-slate-800 bg-slate-100'
                    : 'border-[#E5E8EB]'
                }`}
                style={{ minHeight: '600px' }}
              >
                {/* Column Header */}
                <div className="p-2.5 rounded-t-md border-b border-[#E5E8EB] bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs text-slate-900">{config.label}</span>
                      <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-[#E5E8EB]">
                        {colLeads.length}
                      </span>
                    </div>

                    <span className="text-[11px] font-mono font-medium text-slate-700">
                      {formatIndianCurrency(colVal)}
                    </span>
                  </div>
                </div>

                {/* Cards Container */}
                <div className="p-2 space-y-2 flex-1 overflow-y-auto max-h-[640px]">
                  {colLeads.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 text-xs select-none">
                      <p className="text-[11px] italic">No active prospects</p>
                    </div>
                  ) : (
                    colLeads.map((lead) => {
                      const isOverdue =
                        lead.nextFollowUpAt &&
                        new Date(lead.nextFollowUpAt).getTime() < Date.now();

                      return (
                        <div
                          key={lead.id}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, lead.id)}
                          onDragEnd={() => {
                            setDraggedLeadId(null);
                            setDragOverStage(null);
                          }}
                          className="bg-white rounded border border-[#E5E8EB] p-2.5 shadow-none hover:border-slate-400 transition-colors cursor-grab active:cursor-grabbing group relative"
                        >
                          {/* Card Header */}
                          <div className="flex items-start justify-between gap-1 mb-1">
                            <button
                              onClick={() => handleOpenLeadDrawer(lead)}
                              className="font-medium text-xs text-slate-900 hover:text-slate-700 text-left hover:underline truncate"
                            >
                              {lead.firstName} {lead.lastName}
                            </button>
                            <LeadPriorityBadge priority={lead.priority} showIcon={false} />
                          </div>

                          {/* Property & Configuration */}
                          <div className="text-[11px] text-slate-600 mb-1">
                            <div className="font-medium text-slate-900 truncate">
                              {lead.projectName}
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-500 mt-0.5 font-mono">
                              <span>{lead.preferredTypology.replace('_', ' ')}</span>
                              <span className="font-medium text-slate-900">
                                {formatIndianCurrency(lead.budgetMaxInr || lead.budgetMinInr)}
                              </span>
                            </div>
                          </div>

                          {/* Assigned Executive & Follow-up */}
                          <div className="pt-2 border-t border-[#E5E8EB] flex items-center justify-between text-[10px] text-slate-500">
                            <div className="flex items-center gap-1 truncate max-w-[120px]">
                              <User size={10} className="text-slate-400" />
                              <span className="truncate">{lead.assignedExecutiveName}</span>
                            </div>

                            {lead.nextFollowUpAt ? (
                              <div
                                className={`flex items-center gap-1 font-mono ${
                                  isOverdue
                                    ? 'text-rose-700 font-medium'
                                    : 'text-slate-500'
                                }`}
                                title={`Next Follow-up: ${formatDate(lead.nextFollowUpAt)}`}
                              >
                                <Clock size={10} />
                                <span>{formatRelativeTime(lead.nextFollowUpAt)}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400">No task</span>
                            )}
                          </div>

                          {/* Quick Stage Mover Selector */}
                          <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                            <button
                              onClick={() => handleOpenLeadDrawer(lead)}
                              className="text-slate-700 hover:text-slate-900 font-medium"
                            >
                              Details &rarr;
                            </button>

                            <select
                              value={lead.currentStage}
                              onChange={(e) =>
                                updateLeadStage(lead.id, e.target.value as PipelineStage)
                              }
                              className="text-[10px] py-0.5 px-1 rounded bg-[#F8F9FA] border border-[#E5E8EB] text-slate-700"
                            >
                              {PIPELINE_STAGES_ORDER.map((st) => (
                                <option key={st} value={st}>
                                  {getStageLabel(st)}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modals and Drawers */}
      <LeadDetailDrawer
        lead={selectedLeadForDrawer}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onEditLead={(lead) => {
          setIsDrawerOpen(false);
          setLeadToEdit(lead);
          setIsAddModalOpen(true);
        }}
      />

      <LeadFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        leadToEdit={leadToEdit}
      />
    </div>
  );
};

