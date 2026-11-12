import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Download,
  Flame,
  ArrowUpDown,
  MoreVertical,
  Eye,
  Edit2,
  Trash2,
  Clock,
  Phone,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Building,
} from 'lucide-react';
import { Lead, PipelineStage, LeadSource } from '../../../types';
import { useLeads } from '../../../context/LeadContext';
import { useProjectInventory } from '../../../context/ProjectInventoryContext';
import { MetricCard } from '../../../components/common/MetricCard';
import { LeadStageBadge } from '../components/LeadStageBadge';
import { LeadPriorityBadge } from '../components/LeadPriorityBadge';
import { LeadSourceBadge } from '../components/LeadSourceBadge';
import { LeadFormModal } from '../components/LeadFormModal';
import { LeadDetailDrawer } from '../components/LeadDetailDrawer';
import {
  formatIndianCurrency,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  getStageLabel,
  getSourceLabel,
} from '../../../lib/formatters';

type SortField = 'createdAt' | 'name' | 'priority' | 'nextFollowUp';
type SortOrder = 'asc' | 'desc';

const STAGES: { value: PipelineStage | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
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

const SOURCES: { value: LeadSource | 'all'; label: string }[] = [
  { value: 'all', label: 'All Sources' },
  { value: 'website', label: 'Website Direct' },
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'meta_ads', label: 'Meta Ads' },
  { value: '99acres', label: '99acres' },
  { value: 'magicbricks', label: 'MagicBricks' },
  { value: 'channel_partner', label: 'Channel Partner' },
  { value: 'walk_in', label: 'Walk-ins' },
  { value: 'referral', label: 'Referrals' },
  { value: 'other', label: 'Other Campaign' },
];

export const LeadsPage: React.FC = () => {
  const { leads, leadStats, deleteLead, updateLeadStage, salesExecutives } = useLeads();
  const { projects } = useProjectInventory();

  // Search and Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedStage, setSelectedStage] = useState<PipelineStage | 'all'>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<LeadSource | 'all'>('all');
  const [selectedExecutive, setSelectedExecutive] = useState('all');

  // Sorting and Pagination State
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modals & Drawers State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState<Lead | null>(null);
  const [selectedLeadForDrawer, setSelectedLeadForDrawer] = useState<Lead | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Quick stage switcher dropdown per lead
  const [quickStageDropdownLeadId, setQuickStageDropdownLeadId] = useState<string | null>(null);

  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'new') {
      setLeadToEdit(null);
      setIsFormModalOpen(true);
    }
  }, [location.search]);

  // Filtered and Sorted Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Search text filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const fullName = `${lead.firstName} ${lead.lastName}`.toLowerCase();
        const matchesName = fullName.includes(term);
        const matchesPhone = lead.phone.toLowerCase().includes(term);
        const matchesEmail = lead.email ? lead.email.toLowerCase().includes(term) : false;
        const matchesProject = lead.projectName.toLowerCase().includes(term);
        if (!matchesName && !matchesPhone && !matchesEmail && !matchesProject) {
          return false;
        }
      }

      // Project filter
      if (selectedProject !== 'all' && lead.projectId !== selectedProject) {
        return false;
      }

      // Stage filter
      if (selectedStage !== 'all' && lead.currentStage !== selectedStage) {
        return false;
      }

      // Priority filter
      if (selectedPriority !== 'all' && lead.priority !== selectedPriority) {
        return false;
      }

      // Source filter
      if (selectedSource !== 'all') {
        if (selectedSource === 'google_ads' && (lead.source === 'google_ads' || lead.source === 'google_search')) {
          // match
        } else if (selectedSource === '99acres' && (lead.source === '99acres' || lead.source === 'real_estate_portal')) {
          // match
        } else if (lead.source !== selectedSource) {
          return false;
        }
      }

      // Executive filter
      if (selectedExecutive !== 'all' && lead.assignedExecutiveName !== selectedExecutive) {
        return false;
      }

      return true;
    });
  }, [
    leads,
    searchTerm,
    selectedProject,
    selectedStage,
    selectedPriority,
    selectedSource,
    selectedExecutive,
  ]);

  const sortedLeads = useMemo(() => {
    const list = [...filteredLeads];
    list.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') {
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
        comparison = nameA.localeCompare(nameB);
      } else if (sortField === 'priority') {
        const rank = { hot: 3, warm: 2, cold: 1 };
        comparison = (rank[b.priority] || 0) - (rank[a.priority] || 0);
      } else if (sortField === 'nextFollowUp') {
        const timeA = a.nextFollowUpAt ? new Date(a.nextFollowUpAt).getTime() : 0;
        const timeB = b.nextFollowUpAt ? new Date(b.nextFollowUpAt).getTime() : 0;
        comparison = timeA - timeB;
      } else {
        // createdAt
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        comparison = timeA - timeB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return list;
  }, [filteredLeads, sortField, sortOrder]);

  // Pagination calculation
  const totalPages = Math.ceil(sortedLeads.length / pageSize) || 1;
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedLeads.slice(start, start + pageSize);
  }, [sortedLeads, currentPage]);

  const hasActiveFilters =
    searchTerm !== '' ||
    selectedProject !== 'all' ||
    selectedStage !== 'all' ||
    selectedPriority !== 'all' ||
    selectedSource !== 'all' ||
    selectedExecutive !== 'all';

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedProject('all');
    setSelectedStage('all');
    setSelectedPriority('all');
    setSelectedSource('all');
    setSelectedExecutive('all');
    setCurrentPage(1);
  };

  const handleOpenDrawer = (lead: Lead) => {
    setSelectedLeadForDrawer(lead);
    setIsDrawerOpen(true);
  };

  const handleOpenAddModal = () => {
    setLeadToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (lead: Lead) => {
    setLeadToEdit(lead);
    setIsFormModalOpen(true);
  };

  const handleDeleteLead = (id: string, name: string) => {
    if (confirm(`Are you sure you want to permanently delete lead "${name}"?`)) {
      deleteLead(id);
      if (selectedLeadForDrawer?.id === id) {
        setIsDrawerOpen(false);
      }
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Export filtered leads to CSV
  const handleExportCSV = () => {
    const headers = [
      'Customer Name',
      'Mobile Number',
      'Email',
      'City',
      'Project',
      'Preferred Typology',
      'Min Budget (INR)',
      'Max Budget (INR)',
      'Lead Source',
      'Priority',
      'Pipeline Status',
      'Assigned Executive',
      'Created At',
      'Next Follow-up',
    ];

    const rows = sortedLeads.map((l) => [
      `"${l.firstName} ${l.lastName}"`,
      `"${l.phone}"`,
      `"${l.email || ''}"`,
      `"${l.city || ''}"`,
      `"${l.projectName}"`,
      `"${l.preferredTypology}"`,
      l.budgetMinInr,
      l.budgetMaxInr,
      `"${getSourceLabel(l.source)}"`,
      `"${l.priority.toUpperCase()}"`,
      `"${getStageLabel(l.currentStage)}"`,
      `"${l.assignedExecutiveName}"`,
      `"${l.createdAt}"`,
      `"${l.nextFollowUpAt || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Aurevia_Leads_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E5E8EB]">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            <span>Sales Operations</span>
            <span>&bull;</span>
            <span>Inquiry Management</span>
          </div>
          <h1 className="text-lg font-semibold text-slate-900 tracking-tight mt-0.5">
            Leads
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="h-8 px-3 inline-flex items-center gap-1.5 rounded border border-[#E5E8EB] bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition"
          >
            <Download size={13} className="text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="h-8 px-3 inline-flex items-center gap-1.5 rounded bg-[#1E293B] hover:bg-slate-800 text-white text-xs font-medium transition"
          >
            <UserPlus size={13} />
            <span>New Lead</span>
          </button>
        </div>
      </div>

      {/* 2. Lead Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          title="Total Leads"
          value={leadStats.totalLeads.toString()}
          subtitle="Portfolio inquiry pool"
          icon={Users}
        />
        <MetricCard
          title="New Today"
          value={leadStats.newLeadsToday.toString()}
          subtitle="Past 24 hours"
          icon={Clock}
        />
        <MetricCard
          title="Uncontacted"
          value={leadStats.uncontactedLeads.toString()}
          subtitle="Pending initial screening"
          icon={Phone}
        />
        <MetricCard
          title="Qualified"
          value={leadStats.qualifiedLeads.toString()}
          subtitle="Budget & timeline verified"
          icon={Users}
        />
        <MetricCard
          title="Hot Prospects"
          value={leadStats.hotLeads.toString()}
          subtitle="High intent"
          icon={Flame}
        />
        <MetricCard
          title="Conversion Rate"
          value={`${leadStats.conversionRate.toFixed(1)}%`}
          subtitle="Inquiry to Booking"
          icon={Users}
        />
      </div>

      {/* 3. Search & Multi-Filter Toolbar */}
      <div className="bg-white rounded-md border border-[#E5E8EB] p-3 space-y-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search leads by customer name, phone number, email, or project..."
              className="w-full h-8 pl-8 pr-3 rounded border border-[#E5E8EB] bg-[#F8F9FA] text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-slate-400 transition"
            />
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 h-8 px-2.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition shrink-0"
            >
              <RotateCcw size={12} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Filters Dropdown Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-xs">
          {/* Project Filter */}
          <div>
            <select
              value={selectedProject}
              onChange={(e) => {
                setSelectedProject(e.target.value);
                setCurrentPage(1);
              }}
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

          {/* Stage Filter */}
          <div>
            <select
              value={selectedStage}
              onChange={(e) => {
                setSelectedStage(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full h-8 px-2 rounded border border-[#E5E8EB] bg-[#F8F9FA] text-xs text-slate-700"
            >
              {STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={selectedPriority}
              onChange={(e) => {
                setSelectedPriority(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-8 px-2 rounded border border-[#E5E8EB] bg-[#F8F9FA] text-xs text-slate-700"
            >
              <option value="all">All Priorities</option>
              <option value="hot">Hot</option>
              <option value="warm">Warm</option>
              <option value="cold">Cold</option>
            </select>
          </div>

          {/* Source Filter */}
          <div>
            <select
              value={selectedSource}
              onChange={(e) => {
                setSelectedSource(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full h-8 px-2 rounded border border-[#E5E8EB] bg-[#F8F9FA] text-xs text-slate-700"
            >
              {SOURCES.map((src) => (
                <option key={src.value} value={src.value}>
                  {src.label}
                </option>
              ))}
            </select>
          </div>

          {/* Assigned Executive Filter */}
          <div>
            <select
              value={selectedExecutive}
              onChange={(e) => {
                setSelectedExecutive(e.target.value);
                setCurrentPage(1);
              }}
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
        </div>
      </div>

      {/* 4. Leads Management Data Table */}
      <div className="bg-white rounded-md border border-[#E5E8EB] shadow-none overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#F8F9FA] text-slate-500 uppercase text-[11px] font-medium border-b border-[#E5E8EB]">
              <tr>
                <th
                  onClick={() => toggleSort('name')}
                  className="py-2.5 px-3 cursor-pointer hover:text-slate-900 transition select-none font-medium"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Customer Name</span>
                    <ArrowUpDown size={11} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-3 font-medium">Contact</th>
                <th className="py-2.5 px-3 font-medium">Interested Property</th>
                <th className="py-2.5 px-3 font-medium">Source</th>
                <th className="py-2.5 px-3 font-medium">Assigned To</th>
                <th className="py-2.5 px-3 font-medium">Status</th>
                <th
                  onClick={() => toggleSort('priority')}
                  className="py-2.5 px-3 cursor-pointer hover:text-slate-900 transition select-none font-medium"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Priority</span>
                    <ArrowUpDown size={11} className="text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('nextFollowUp')}
                  className="py-2.5 px-3 cursor-pointer hover:text-slate-900 transition select-none font-medium"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Next Follow-up</span>
                    <ArrowUpDown size={11} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-3 text-right font-medium">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {paginatedLeads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Users size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-slate-600">No leads matched your current criteria.</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Try adjusting the search query or clearing one of the filters.
                    </p>
                    {hasActiveFilters && (
                      <button
                        onClick={resetFilters}
                        className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                      >
                        Reset All Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-slate-50/80 transition group"
                  >
                    {/* Customer */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-6 h-6 rounded bg-slate-100 border border-[#E5E8EB] text-slate-700 flex items-center justify-center font-medium text-[10px] shrink-0">
                          {lead.firstName[0]}
                          {lead.lastName?.[0] || ''}
                        </div>
                        <div>
                          <button
                            onClick={() => handleOpenDrawer(lead)}
                            className="font-medium text-slate-900 hover:text-slate-700 hover:underline text-left block text-xs"
                          >
                            {lead.firstName} {lead.lastName}
                          </button>
                          <span className="text-[10px] text-slate-400">
                            {lead.city ? `${lead.city} • ` : ''}
                            {formatDate(lead.createdAt)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="py-2.5 px-3 font-mono">
                      <a
                        href={`tel:${lead.phone}`}
                        className="text-slate-800 hover:text-slate-900 flex items-center gap-1 text-xs"
                        title="Click to dial"
                      >
                        <Phone size={11} className="text-slate-400" />
                        <span>{lead.phone}</span>
                      </a>
                      <div className="text-[10px] text-slate-500 font-sans truncate max-w-[150px]">
                        {lead.email || '—'}
                      </div>
                    </td>

                    {/* Interested Property */}
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-900 truncate max-w-[170px]" title={lead.projectName}>
                        {lead.projectName}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {lead.preferredTypology.replace('_', ' ')} &bull;{' '}
                        <span className="font-mono text-slate-700 font-medium">
                          {formatIndianCurrency(lead.budgetMaxInr)}
                        </span>
                      </div>
                    </td>

                    {/* Source */}
                    <td className="py-2.5 px-3">
                      <LeadSourceBadge source={lead.source} />
                    </td>

                    {/* Assigned To */}
                    <td className="py-2.5 px-3 text-slate-700">
                      <span>{lead.assignedExecutiveName}</span>
                    </td>

                    {/* Status with Quick Transition Dropdown */}
                    <td className="py-2.5 px-3 relative">
                      <button
                        onClick={() =>
                          setQuickStageDropdownLeadId(
                            quickStageDropdownLeadId === lead.id ? null : lead.id
                          )
                        }
                        className="text-left group/btn"
                        title="Click to change status"
                      >
                        <LeadStageBadge stage={lead.currentStage} />
                      </button>

                      {/* Dropdown Menu */}
                      {quickStageDropdownLeadId === lead.id && (
                        <div
                          className="absolute left-0 mt-1 z-30 w-44 bg-white rounded-md shadow-md border border-[#E5E8EB] py-1 text-xs"
                          onMouseLeave={() => setQuickStageDropdownLeadId(null)}
                        >
                          <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-[#E5E8EB]">
                            Update Stage
                          </div>
                          {STAGES.filter((s) => s.value !== 'all').map((st) => (
                            <button
                              key={st.value}
                              onClick={() => {
                                updateLeadStage(lead.id, st.value as PipelineStage);
                                setQuickStageDropdownLeadId(null);
                              }}
                              className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-slate-50 ${
                                lead.currentStage === st.value
                                  ? 'font-medium text-slate-900 bg-slate-50'
                                  : 'text-slate-700'
                              }`}
                            >
                              <span>{st.label}</span>
                              {lead.currentStage === st.value && (
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Priority */}
                    <td className="py-2.5 px-3">
                      <LeadPriorityBadge priority={lead.priority} />
                    </td>

                    {/* Follow-up */}
                    <td className="py-2.5 px-3">
                      {lead.nextFollowUpAt ? (
                        <div className="text-slate-700">
                          <div className="font-medium text-xs">{formatDate(lead.nextFollowUpAt)}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {formatRelativeTime(lead.nextFollowUpAt)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">None scheduled</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => handleOpenDrawer(lead)}
                          className="p-1.5 text-slate-500 hover:text-navy-900 hover:bg-slate-100 rounded-lg transition"
                          title="View Details"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(lead)}
                          className="p-1.5 text-slate-500 hover:text-navy-900 hover:bg-slate-100 rounded-lg transition"
                          title="Edit Lead"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteLead(lead.id, `${lead.firstName} ${lead.lastName}`)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete Lead"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Pagination Bar */}
        <div className="px-5 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 bg-white">
          <div>
            Showing{' '}
            <strong className="text-slate-800">
              {sortedLeads.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </strong>{' '}
            to{' '}
            <strong className="text-slate-800">
              {Math.min(currentPage * pageSize, sortedLeads.length)}
            </strong>{' '}
            of <strong className="text-slate-800">{sortedLeads.length}</strong> leads
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft size={15} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`min-w-[28px] h-7 rounded-lg text-xs font-semibold transition ${
                  currentPage === page
                    ? 'bg-navy-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* 6. Modals and Drawers */}
      <LeadFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        leadToEdit={leadToEdit}
        onViewExistingLead={(lead) => {
          setSelectedLeadForDrawer(lead);
          setIsDrawerOpen(true);
        }}
      />

      <LeadDetailDrawer
        lead={selectedLeadForDrawer}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onEditLead={(lead) => {
          setIsDrawerOpen(false);
          handleOpenEditModal(lead);
        }}
      />
    </div>
  );
};

