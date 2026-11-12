import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Plus,
  Search,
  Filter,
  MapPin,
  Calendar,
  Grid3X3,
  Edit2,
  Trash2,
  X,
  Layers,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import { useProjectInventory } from '../../../context/ProjectInventoryContext';
import { Project, ProjectStatus } from '../../../types';
import { MetricCard } from '../../../components/common/MetricCard';
import { formatIndianCurrency } from '../../../lib/formatters';

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    projects,
    addProject,
    updateProject,
    deleteProject,
    getProjectStats,
    overallStats,
    setSelectedProjectId,
  } = useProjectInventory();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    reraNumber: '',
    locationArea: '',
    city: 'Mumbai',
    projectType: 'Ultra Luxury High-Rise',
    description: '',
    configurations: '3 BHK, 4 BHK',
    totalAreaAcres: 4.5,
    totalUnits: 40,
    status: 'under_construction' as ProjectStatus,
    launchDate: '2025-01-15',
    expectedCompletion: '2028-12-31',
    coverImageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80',
  });

  const cities = useMemo(() => {
    return Array.from(new Set(projects.map((p) => p.city)));
  }, [projects]);

  // Filtered Projects
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch =
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.locationArea.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.reraNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.code.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCity = cityFilter === 'all' || project.city === cityFilter;
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter;

      return matchesSearch && matchesCity && matchesStatus;
    });
  }, [projects, searchQuery, cityFilter, statusFilter]);

  const handleOpenAddModal = () => {
    setEditingProject(null);
    setFormData({
      name: '',
      code: `AUR-${Math.floor(100 + Math.random() * 900)}`,
      reraNumber: `SYNTHETIC-RERA-MAHA-P${Math.floor(10000 + Math.random() * 90000)}-DEMO`,
      locationArea: '',
      city: 'Mumbai',
      projectType: 'Ultra Luxury High-Rise',
      description: '',
      configurations: '2 BHK, 3 BHK, 4 BHK',
      totalAreaAcres: 5.0,
      totalUnits: 30,
      status: 'under_construction',
      launchDate: new Date().toISOString().split('T')[0],
      expectedCompletion: '2029-03-31',
      coverImageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      code: project.code,
      reraNumber: project.reraNumber,
      locationArea: project.locationArea,
      city: project.city,
      projectType: project.projectType,
      description: project.description,
      configurations: project.configurations.join(', '),
      totalAreaAcres: project.totalAreaAcres,
      totalUnits: project.totalUnits,
      status: project.status,
      launchDate: project.launchDate,
      expectedCompletion: project.expectedCompletion,
      coverImageUrl: project.coverImageUrl || '',
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const configArray = formData.configurations
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    if (editingProject) {
      updateProject(editingProject.id, {
        ...formData,
        configurations: configArray,
        totalAreaAcres: Number(formData.totalAreaAcres),
        totalUnits: Number(formData.totalUnits),
      });
    } else {
      addProject({
        ...formData,
        configurations: configArray,
        totalAreaAcres: Number(formData.totalAreaAcres),
        totalUnits: Number(formData.totalUnits),
      });
    }
    setIsModalOpen(false);
  };

  const handleViewInventory = (projectId: string) => {
    setSelectedProjectId(projectId);
    navigate(`/inventory?project=${projectId}`);
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E5E8EB]">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            <span>Portfolio</span>
            <span>&bull;</span>
            <span>Master Developments</span>
          </div>
          <h1 className="text-lg font-semibold text-slate-900 tracking-tight mt-0.5">
            Residential Projects
          </h1>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="h-8 px-3 inline-flex items-center gap-1.5 bg-[#1E293B] hover:bg-slate-800 text-white rounded text-xs font-medium transition shrink-0"
        >
          <Plus size={13} />
          <span>New Project</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Active Projects"
          value={projects.length.toString()}
          subtitle="Across 3 Metros"
          icon={Building2}
        />
        <MetricCard
          title="Total Development Units"
          value={overallStats.totalUnits.toString()}
          subtitle={`${overallStats.availableUnits} Available for Sale`}
          icon={Layers}
        />
        <MetricCard
          title="Available Inventory Value"
          value={formatIndianCurrency(overallStats.availableValueInr)}
          subtitle="Active unsold stock"
          icon={Grid3X3}
        />
        <MetricCard
          title="Realized Sales Value"
          value={formatIndianCurrency(overallStats.soldValueInr)}
          subtitle="Booked & registered units"
          icon={ShieldCheck}
        />
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-md border border-[#E5E8EB] p-3 flex flex-col md:flex-row items-center justify-between gap-2.5">
        <div className="relative flex-1 w-full">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by project name, location, code, RERA ID..."
            className="w-full h-8 pl-8 pr-3 text-xs bg-[#F8F9FA] border border-[#E5E8EB] rounded text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-slate-400 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="h-8 px-2 text-xs bg-[#F8F9FA] border border-[#E5E8EB] rounded text-slate-700"
          >
            <option value="all">All Cities</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-2 text-xs bg-[#F8F9FA] border border-[#E5E8EB] rounded text-slate-700"
          >
            <option value="all">All Statuses</option>
            <option value="under_construction">Under Construction</option>
            <option value="pre_launch">Pre Launch</option>
            <option value="ready_to_move">Ready to Move</option>
            <option value="planning">Planning</option>
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white rounded-md border border-[#E5E8EB] p-10 text-center">
          <Building2 size={32} className="text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-700">No projects match your filter criteria.</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Try clearing filters or search terms.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => {
            const stats = getProjectStats(project.id);
            const soldPercent = stats.totalUnits > 0
              ? Math.round(((stats.bookedUnits + stats.soldUnits) / stats.totalUnits) * 100)
              : 0;

            return (
              <div
                key={project.id}
                className="bg-white rounded-md border border-[#E5E8EB] overflow-hidden shadow-none hover:border-slate-400 transition-colors flex flex-col justify-between"
              >
                {/* Project Header Image & Status Badge */}
                <div className="relative h-40 w-full bg-slate-100 overflow-hidden">
                  <img
                    src={project.coverImageUrl || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80'}
                    alt={project.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase bg-[#1E293B] text-white">
                      {project.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="absolute top-2.5 right-2.5 flex items-center space-x-1 bg-white/95 p-0.5 rounded border border-[#E5E8EB]">
                    <button
                      onClick={() => handleOpenEditModal(project)}
                      className="p-1 text-slate-600 hover:text-slate-900 rounded transition"
                      title="Edit Project"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      onClick={() => setDeletingProjectId(project.id)}
                      className="p-1 text-slate-600 hover:text-rose-600 rounded transition"
                      title="Delete Project"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Project Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>CODE: {project.code}</span>
                      <span>{project.totalAreaAcres} Acres</span>
                    </div>

                    <h3 className="text-sm font-semibold text-slate-900 mt-0.5">{project.name}</h3>

                    <div className="flex items-center text-xs text-slate-500 mt-0.5 gap-1">
                      <MapPin size={11} className="text-slate-400 shrink-0" />
                      <span className="truncate">{project.locationArea}, {project.city}</span>
                    </div>

                    <p className="text-[11px] text-slate-600 mt-1.5 line-clamp-2">
                      {project.description}
                    </p>

                    {/* Configurations Pills */}
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {project.configurations.map((cfg) => (
                        <span
                          key={cfg}
                          className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-[#E5E8EB]"
                        >
                          {cfg}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Project Inventory Health Bar */}
                  <div className="pt-2.5 border-t border-[#E5E8EB] space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 text-[11px]">Absorption:</span>
                      <span className="font-mono text-xs font-medium text-slate-900">{soldPercent}% Sold</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${(stats.soldUnits / (stats.totalUnits || 1)) * 100}%` }}
                        className="bg-slate-600"
                        title={`Sold: ${stats.soldUnits}`}
                      />
                      <div
                        style={{ width: `${(stats.bookedUnits / (stats.totalUnits || 1)) * 100}%` }}
                        className="bg-blue-600"
                        title={`Booked: ${stats.bookedUnits}`}
                      />
                      <div
                        style={{ width: `${(stats.reservedUnits / (stats.totalUnits || 1)) * 100}%` }}
                        className="bg-amber-500"
                        title={`Reserved: ${stats.reservedUnits}`}
                      />
                      <div
                        style={{ width: `${(stats.availableUnits / (stats.totalUnits || 1)) * 100}%` }}
                        className="bg-emerald-600"
                        title={`Available: ${stats.availableUnits}`}
                      />
                    </div>

                    {/* Inventory Legend Numbers */}
                    <div className="grid grid-cols-4 gap-1 text-[10px] text-center pt-1 font-mono">
                      <div className="p-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200/50">
                        <span className="font-bold">{stats.availableUnits}</span> Avail
                      </div>
                      <div className="p-1 rounded bg-amber-50 text-amber-800 border border-amber-200/50">
                        <span className="font-bold">{stats.reservedUnits}</span> Hold
                      </div>
                      <div className="p-1 rounded bg-blue-50 text-blue-800 border border-blue-200/50">
                        <span className="font-bold">{stats.bookedUnits}</span> Booked
                      </div>
                      <div className="p-1 rounded bg-slate-100 text-slate-700 border border-slate-200/50">
                        <span className="font-bold">{stats.soldUnits}</span> Sold
                      </div>
                    </div>
                  </div>

                  {/* RERA and View Units CTA */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-[10px] text-slate-400 font-mono truncate max-w-[170px]" title={project.reraNumber}>
                      RERA: {project.reraNumber}
                    </div>

                    <button
                      onClick={() => handleViewInventory(project.id)}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-navy-900 text-white rounded-lg text-xs font-semibold hover:bg-navy-800 transition shadow-sm"
                    >
                      <span>Stacking Matrix</span>
                      <ArrowUpRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-md border border-[#E5E8EB] shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 bg-[#1E293B] text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">
                  {editingProject ? 'Edit Residential Project' : 'Register New Residential Project'}
                </h3>
                <p className="text-[11px] text-slate-300">
                  Configure project parameters, typology offerings, and RERA compliance metadata.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Project Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Aurevia Grandeur [DEMO]"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Project Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g. AUR-GRD"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900 focus:bg-white uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">RERA Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.reraNumber}
                    onChange={(e) => setFormData({ ...formData, reraNumber: e.target.value })}
                    placeholder="e.g. SYNTHETIC-RERA-MAHA-001"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900 focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. Mumbai, Bengaluru, Gurugram"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Location Area *</label>
                  <input
                    type="text"
                    required
                    value={formData.locationArea}
                    onChange={(e) => setFormData({ ...formData, locationArea: e.target.value })}
                    placeholder="e.g. Worli Sea Face, Whitefield"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Development Type *</label>
                  <select
                    value={formData.projectType}
                    onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900 focus:bg-white"
                  >
                    <option value="Ultra Luxury High-Rise">Ultra Luxury High-Rise</option>
                    <option value="Premium Eco Residences">Premium Eco Residences</option>
                    <option value="Luxury Plotted & Condominiums">Luxury Plotted & Condominiums</option>
                    <option value="Gated Villa Community">Gated Villa Community</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Configurations (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.configurations}
                    onChange={(e) => setFormData({ ...formData, configurations: e.target.value })}
                    placeholder="e.g. 2 BHK, 3 BHK, 4 BHK, Penthouse"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectStatus })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900 focus:bg-white"
                  >
                    <option value="planning">Planning</option>
                    <option value="pre_launch">Pre Launch</option>
                    <option value="under_construction">Under Construction</option>
                    <option value="ready_to_move">Ready to Move</option>
                    <option value="sold_out">Sold Out</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Total Acreage</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.totalAreaAcres}
                    onChange={(e) => setFormData({ ...formData, totalAreaAcres: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Total Units Count</label>
                  <input
                    type="number"
                    value={formData.totalUnits}
                    onChange={(e) => setFormData({ ...formData, totalUnits: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Launch Date</label>
                  <input
                    type="date"
                    value={formData.launchDate}
                    onChange={(e) => setFormData({ ...formData, launchDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Expected Completion</label>
                  <input
                    type="date"
                    value={formData.expectedCompletion}
                    onChange={(e) => setFormData({ ...formData, expectedCompletion: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Architectural overview, amenities, views and specifications..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Cover Image URL</label>
                <input
                  type="url"
                  value={formData.coverImageUrl}
                  onChange={(e) => setFormData({ ...formData, coverImageUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900 focus:bg-white font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-navy-900 text-white rounded-xl font-semibold hover:bg-navy-800 transition shadow-sm"
                >
                  {editingProject ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingProjectId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-md border border-[#E5E8EB] shadow-xl max-w-sm w-full p-6 text-center">
            <div className="h-10 w-10 rounded bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3 border border-rose-200">
              <Trash2 size={20} />
            </div>
            <h3 className="text-sm font-semibold text-[#1C2024]">Delete Residential Project?</h3>
            <p className="text-xs text-[#60646C] mt-2">
              This action will remove the project and its associated inventory units from your demo session.
            </p>
            <div className="flex items-center space-x-3 mt-6">
              <button
                onClick={() => setDeletingProjectId(null)}
                className="flex-1 py-1.5 text-xs border border-[#E5E8EB] rounded font-medium text-[#1C2024] hover:bg-[#F8F9FA] transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteProject(deletingProjectId);
                  setDeletingProjectId(null);
                }}
                className="flex-1 py-1.5 text-xs bg-rose-600 text-white rounded font-medium hover:bg-rose-700 transition"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

