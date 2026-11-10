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
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Residential Projects</h1>
          <p className="text-xs text-slate-500 mt-1">
            Master catalog of luxury residential developments, acreage allocations, and inventory health.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center space-x-2 px-4 py-2 bg-navy-900 text-white rounded-xl text-xs font-semibold hover:bg-navy-800 transition shadow-card shrink-0"
        >
          <Plus size={16} />
          <span>New Project</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          variant="gold"
        />
        <MetricCard
          title="Available Inventory Value"
          value={formatIndianCurrency(overallStats.availableValueInr)}
          subtitle="Active unsold stock"
          icon={Grid3X3}
          variant="emerald"
        />
        <MetricCard
          title="Realized Sales Value"
          value={formatIndianCurrency(overallStats.soldValueInr)}
          subtitle="Booked & registered units"
          icon={ShieldCheck}
        />
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-surface-border p-4 shadow-card flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by project name, location, code, RERA ID..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center space-x-2 shrink-0">
            <Filter size={14} className="text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">Filter:</span>
          </div>

          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900 font-medium text-slate-700"
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
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900 font-medium text-slate-700"
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
        <div className="bg-white rounded-2xl border border-surface-border p-12 text-center shadow-card">
          <Building2 size={36} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">No projects match your filter criteria.</p>
          <p className="text-xs text-slate-400 mt-1">Try clearing filters or search terms.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const stats = getProjectStats(project.id);
            const soldPercent = stats.totalUnits > 0
              ? Math.round(((stats.bookedUnits + stats.soldUnits) / stats.totalUnits) * 100)
              : 0;

            return (
              <div
                key={project.id}
                className="bg-white rounded-2xl border border-surface-border overflow-hidden shadow-card hover:shadow-elevated hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                {/* Project Header Image & Status Badge */}
                <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                  <img
                    src={project.coverImageUrl || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80'}
                    alt={project.name}
                    className="w-full h-full object-cover transition duration-300 hover:scale-105"
                  />
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-navy-900/90 text-white backdrop-blur-sm border border-white/20">
                      {project.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3 flex items-center space-x-1.5 bg-white/90 backdrop-blur-sm p-1 rounded-lg border border-slate-200">
                    <button
                      onClick={() => handleOpenEditModal(project)}
                      className="p-1.5 text-slate-600 hover:text-navy-900 hover:bg-slate-100 rounded transition"
                      title="Edit Project"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => setDeletingProjectId(project.id)}
                      className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                      title="Delete Project"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Project Details */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>CODE: {project.code}</span>
                      <span>{project.totalAreaAcres} Acres</span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 mt-1 leading-snug">{project.name}</h3>

                    <div className="flex items-center text-xs text-slate-500 mt-1 gap-1">
                      <MapPin size={12} className="text-slate-400 shrink-0" />
                      <span className="truncate">{project.locationArea}, {project.city}</span>
                    </div>

                    <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                      {project.description}
                    </p>

                    {/* Configurations Pills */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {project.configurations.map((cfg) => (
                        <span
                          key={cfg}
                          className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                        >
                          {cfg}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Project Inventory Health Bar */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Absorption Rate:</span>
                      <span className="font-mono font-bold text-slate-900">{soldPercent}% Sold</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${(stats.soldUnits / (stats.totalUnits || 1)) * 100}%` }}
                        className="bg-slate-500"
                        title={`Sold: ${stats.soldUnits}`}
                      />
                      <div
                        style={{ width: `${(stats.bookedUnits / (stats.totalUnits || 1)) * 100}%` }}
                        className="bg-blue-500"
                        title={`Booked: ${stats.bookedUnits}`}
                      />
                      <div
                        style={{ width: `${(stats.reservedUnits / (stats.totalUnits || 1)) * 100}%` }}
                        className="bg-amber-500"
                        title={`Reserved: ${stats.reservedUnits}`}
                      />
                      <div
                        style={{ width: `${(stats.availableUnits / (stats.totalUnits || 1)) * 100}%` }}
                        className="bg-emerald-500"
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
        <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-navy-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">
                  {editingProject ? 'Edit Residential Project' : 'Register New Residential Project'}
                </h3>
                <p className="text-[11px] text-slate-300">
                  Configure project parameters, typology offerings, and RERA compliance metadata.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X size={18} />
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
        <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6 text-center">
            <div className="h-12 w-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Delete Residential Project?</h3>
            <p className="text-xs text-slate-500 mt-2">
              This action will remove the project and its associated inventory units from your demo session.
            </p>
            <div className="flex items-center space-x-3 mt-6">
              <button
                onClick={() => setDeletingProjectId(null)}
                className="flex-1 py-2 text-xs border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteProject(deletingProjectId);
                  setDeletingProjectId(null);
                }}
                className="flex-1 py-2 text-xs bg-rose-600 text-white rounded-xl font-semibold hover:bg-rose-700"
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

