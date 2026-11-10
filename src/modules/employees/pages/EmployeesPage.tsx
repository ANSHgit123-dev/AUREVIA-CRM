import React, { useState } from 'react';
import {
  UserCheck,
  TrendingUp,
  Award,
  AlertTriangle,
  Calendar,
  Users,
  Target,
  Sparkles,
  Receipt,
  PhoneCall,
  CheckCircle,
  Plus,
  ShieldCheck,
  Mail,
  Phone,
  Building,
  UserPlus,
  X,
  AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useAuth } from '../../../context/AuthContext';
import { useLeads } from '../../../context/LeadContext';
import { useProjectInventory } from '../../../context/ProjectInventoryContext';
import { MetricCard } from '../../../components/common/MetricCard';
import { formatIndianCurrency, formatDate } from '../../../lib/formatters';
import { canManageEmployees, ROLE_CONFIGS, normalizeRole } from '../../../config/rbac';
import { UserRole, UserProfile } from '../../../types';

type TabKey = 'directory' | 'performance';

export const EmployeesPage: React.FC = () => {
  const { user, role, employees, provisionEmployee, toggleEmployeeStatus } = useAuth();
  const { executivePerformanceList, leadStats, leads } = useLeads();
  const { projects } = useProjectInventory();

  const [activeTab, setActiveTab] = useState<TabKey>('directory');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');

  // Provisioning Modal State
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('sales_executive');
  const [newManagerId, setNewManagerId] = useState('');
  const [newAssignedProjects, setNewAssignedProjects] = useState<string[]>([]);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canProvision = canManageEmployees(role);

  // Filtered employees
  const filteredEmployees = employees.filter(emp => {
    if (selectedRoleFilter !== 'all' && emp.role !== selectedRoleFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = emp.fullName.toLowerCase().includes(q);
      const matchEmail = emp.email.toLowerCase().includes(q);
      const matchRole = emp.role.toLowerCase().includes(q);
      return matchName || matchEmail || matchRole;
    }
    return true;
  });

  // Aggregate Team Totals for performance tab
  const totalAssigned = executivePerformanceList.reduce((acc, e) => acc + e.assignedLeads, 0);
  const totalVisits = executivePerformanceList.reduce((acc, e) => acc + e.siteVisitsGenerated, 0);
  const totalBookings = executivePerformanceList.reduce((acc, e) => acc + e.bookingsAchieved, 0);
  const totalSalesVal = executivePerformanceList.reduce((acc, e) => acc + e.totalSalesValueInr, 0);
  const totalOverdue = executivePerformanceList.reduce((acc, e) => acc + e.overdueFollowUps, 0);

  const chartData = executivePerformanceList.map((e) => ({
    name: e.executiveName.split(' ')[0],
    fullName: e.executiveName,
    Assigned: e.assignedLeads,
    Qualified: e.qualifiedLeads,
    Visits: e.siteVisitsGenerated,
    Booked: e.bookingsAchieved,
    ConversionRate: e.conversionRate.toFixed(1),
  }));

  const handleOpenProvisionModal = () => {
    setNewFullName('');
    setNewEmail('');
    setNewPhone('+91 ');
    setNewRole('sales_executive');
    setNewManagerId(employees.find(e => e.role === 'sales_manager')?.id || '');
    setNewAssignedProjects(projects.map(p => p.id));
    setProvisionError(null);
    setIsProvisionModalOpen(true);
  };

  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProvisionError(null);
    setIsSubmitting(true);

    try {
      if (!newFullName.trim()) throw new Error('Employee full name is required.');
      if (!newEmail.trim() || !newEmail.includes('@')) throw new Error('A valid corporate email is required.');
      if (!newPhone.trim()) throw new Error('Contact phone is required.');

      await provisionEmployee({
        fullName: newFullName.trim(),
        email: newEmail.trim().toLowerCase(),
        phone: newPhone.trim(),
        role: newRole,
        managerId: newManagerId || undefined,
        assignedProjectIds: newAssignedProjects,
      });

      setIsProvisionModalOpen(false);
    } catch (err: any) {
      setProvisionError(err.message || 'Failed to provision employee account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleProjectAssignment = (projectId: string) => {
    setNewAssignedProjects(prev =>
      prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId]
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-navy-950 via-navy-900 to-navy-800 p-6 rounded-2xl text-white shadow-card">
        <div>
          <div className="flex items-center space-x-2 text-gold-500 text-xs font-semibold uppercase tracking-wider">
            <Sparkles size={14} />
            <span>Staff Directory, RBAC & Productivity Console</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold mt-1">Staff & Employee Management</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Controlled staff provisioning, organizational hierarchy, project-level access scoping, and sales conversion velocity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canProvision && (
            <button
              onClick={handleOpenProvisionModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow transition"
            >
              <UserPlus size={15} />
              <span>Provision Employee</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('directory')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'directory'
              ? 'bg-navy-900 text-white shadow'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Users size={14} />
          <span>Employee Directory & Access Control ({employees.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('performance')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'performance'
              ? 'bg-navy-900 text-white shadow'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Award size={14} />
          <span>Sales Productivity & Conversion Analytics</span>
        </button>
      </div>

      {/* TAB 1: EMPLOYEE DIRECTORY & ACCESS CONTROL */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by staff name, email, or role..."
              className="px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 flex-1 max-w-sm"
            />

            <select
              value={selectedRoleFilter}
              onChange={e => setSelectedRoleFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-700"
            >
              <option value="all">All Roles ({employees.length})</option>
              <option value="company_admin">Company Admin</option>
              <option value="director">Director</option>
              <option value="sales_manager">Sales Manager</option>
              <option value="presales_agent">Presales Agent</option>
              <option value="sales_executive">Sales Executive</option>
              <option value="booking_operations">Booking Operations</option>
            </select>
          </div>

          {/* Directory Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Role & Access Scope</th>
                    <th className="py-3 px-4">Manager / Hierarchy</th>
                    <th className="py-3 px-4">Assigned Projects</th>
                    <th className="py-3 px-4 text-center">Account Status</th>
                    <th className="py-3 px-4 text-right">Provisioned Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.map(emp => {
                    const conf = ROLE_CONFIGS[normalizeRole(emp.role)];
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                              {emp.fullName.charAt(0)}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block">{emp.fullName}</span>
                              <span className="text-[11px] text-slate-500 font-mono">{emp.email}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`inline-block px-2.5 py-1 rounded text-[10px] font-bold border ${conf?.badgeClass || 'bg-slate-100'}`}>
                            {conf?.badge || emp.role}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">{conf?.title}</span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600">
                          {emp.managerName || (emp.role === 'company_admin' || emp.role === 'director' ? '— (Top Hierarchy)' : 'Vikram Mehta')}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {emp.assignedProjectIds && emp.assignedProjectIds.length > 0 ? (
                              emp.assignedProjectIds.map(pId => {
                                const p = projects.find(proj => proj.id === pId);
                                return (
                                  <span key={pId} className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium border border-slate-200">
                                    {p?.name.replace(' [DEMO]', '') || pId}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-slate-400 text-[11px]">All Projects</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {canProvision ? (
                            <button
                              onClick={() => toggleEmployeeStatus(emp.id)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition ${
                                emp.isActive
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                              }`}
                            >
                              {emp.isActive ? 'Active' : 'Deactivated'}
                            </button>
                          ) : (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              emp.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                              {emp.isActive ? 'Active' : 'Deactivated'}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right text-slate-500 font-mono text-[11px]">
                          {formatDate(emp.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SALES TEAM PRODUCTIVITY & CONVERSION ANALYTICS */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          {/* Top Level Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <MetricCard
              title="Assigned Accounts"
              value={totalAssigned.toString()}
              subtitle="Active customer inquiries"
              icon={Users}
            />
            <MetricCard
              title="Site Inspections"
              value={totalVisits.toString()}
              subtitle="Show flat & site tours"
              icon={Calendar}
              variant="gold"
            />
            <MetricCard
              title="Allotments Closed"
              value={totalBookings.toString()}
              subtitle="Secured agreements"
              icon={Receipt}
              variant="emerald"
            />
            <MetricCard
              title="Gross Sales Value"
              value={formatIndianCurrency(totalSalesVal)}
              subtitle="Closed booking pipeline"
              icon={TrendingUp}
              variant="emerald"
            />
            <MetricCard
              title="Overdue Tasks"
              value={totalOverdue.toString()}
              subtitle="Action required"
              icon={AlertTriangle}
              variant={totalOverdue > 0 ? 'rose' : 'emerald'}
            />
          </div>

          {/* Performance Comparison Bar Chart */}
          <div className="bg-white rounded-xl border border-surface-border p-5 shadow-card space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Executive Conversion Funnel & Volume
              </h2>
              <p className="text-xs text-slate-500">Comparative inspection generation and deal closing performance</p>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0B132B', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="Assigned" fill="#64748b" radius={[4, 4, 0, 0]} name="Assigned Leads" />
                  <Bar dataKey="Visits" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Site Visits" />
                  <Bar dataKey="Booked" fill="#10b981" radius={[4, 4, 0, 0]} name="Bookings Closed" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Provision Employee Account */}
      {isProvisionModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold">Provision New Employee Account</h3>
              </div>
              <button
                onClick={() => setIsProvisionModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProvisionSubmit} className="p-6 space-y-4 text-xs">
              {provisionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{provisionError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={e => setNewFullName(e.target.value)}
                  placeholder="e.g. Anand Mahindra"
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Corporate Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="name@aurevia.demo"
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Contact Phone <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    placeholder="+91 98000 00000"
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    RBAC Role <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newRole}
                    onChange={e => setNewRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                  >
                    <option value="sales_executive">Sales Executive</option>
                    <option value="presales_agent">Presales Agent</option>
                    <option value="sales_manager">Sales Manager</option>
                    <option value="booking_operations">Booking Operations</option>
                    <option value="director">Director</option>
                    <option value="company_admin">Company Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Reporting Manager
                  </label>
                  <select
                    value={newManagerId}
                    onChange={e => setNewManagerId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">-- No Direct Manager --</option>
                    {employees
                      .filter(e => e.role === 'sales_manager' || e.role === 'director' || e.role === 'company_admin')
                      .map(m => (
                        <option key={m.id} value={m.id}>
                          {m.fullName} ({m.role.replace('_', ' ')})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Assigned Projects */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Project Scoping Access
                </label>
                <div className="p-3 bg-slate-50 border rounded-lg space-y-1.5">
                  {projects.map(proj => (
                    <label key={proj.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newAssignedProjects.includes(proj.id)}
                        onChange={() => toggleProjectAssignment(proj.id)}
                        className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                      />
                      <span className="text-slate-800">{proj.name} ({proj.city})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsProvisionModalOpen(false)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl shadow transition"
                >
                  {isSubmitting ? 'Provisioning...' : 'Provision Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
