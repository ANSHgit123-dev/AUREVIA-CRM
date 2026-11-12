import React, { useState } from 'react';
import {
  UserCheck,
  TrendingUp,
  Award,
  AlertTriangle,
  Calendar,
  Users,
  Target,
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
    <div className="space-y-4 pb-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[#1C2024]">Staff & Employee Management</h1>
          <p className="text-xs text-[#60646C] mt-0.5">
            Staff directory, organizational hierarchy, project access scoping, and sales productivity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canProvision && (
            <button
              onClick={handleOpenProvisionModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1E293B] hover:bg-[#0F172A] text-white font-medium text-xs rounded transition"
            >
              <UserPlus size={13} />
              <span>Provision Employee</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-1 border-b border-[#E5E8EB]">
        <button
          onClick={() => setActiveTab('directory')}
          className={`px-3 py-2 border-b-2 text-xs font-medium transition flex items-center gap-1.5 ${
            activeTab === 'directory'
              ? 'border-[#1E293B] text-[#1C2024] font-semibold'
              : 'border-transparent text-[#60646C] hover:text-[#1C2024]'
          }`}
        >
          <Users size={13} />
          <span>Staff Directory ({employees.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('performance')}
          className={`px-3 py-2 border-b-2 text-xs font-medium transition flex items-center gap-1.5 ${
            activeTab === 'performance'
              ? 'border-[#1E293B] text-[#1C2024] font-semibold'
              : 'border-transparent text-[#60646C] hover:text-[#1C2024]'
          }`}
        >
          <Award size={13} />
          <span>Sales Productivity & Analytics</span>
        </button>
      </div>

      {/* TAB 1: EMPLOYEE DIRECTORY & ACCESS CONTROL */}
      {activeTab === 'directory' && (
        <div className="space-y-3">
          {/* Filters */}
          <div className="bg-white p-2.5 rounded-md border border-[#E5E8EB] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search staff by name, email, or role..."
              className="px-2.5 py-1.5 text-xs bg-[#F8F9FA] border border-[#E5E8EB] rounded text-[#1C2024] placeholder-[#80848D] focus:outline-none focus:border-[#1E293B] focus:bg-white flex-1 max-w-sm"
            />

            <select
              value={selectedRoleFilter}
              onChange={e => setSelectedRoleFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-[#F8F9FA] border border-[#E5E8EB] rounded text-[#1C2024] focus:outline-none focus:border-[#1E293B]"
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
          <div className="bg-white rounded-md border border-[#E5E8EB] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F8F9FA] border-b border-[#E5E8EB] text-[#80848D] font-semibold">
                    <th className="py-2.5 px-3">Employee</th>
                    <th className="py-2.5 px-3">Role & Scope</th>
                    <th className="py-2.5 px-3">Manager</th>
                    <th className="py-2.5 px-3">Assigned Projects</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Provisioned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F3F5]">
                  {filteredEmployees.map(emp => {
                    const conf = ROLE_CONFIGS[normalizeRole(emp.role)];
                    return (
                      <tr key={emp.id} className="hover:bg-[#F8F9FA] transition">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-full bg-[#F1F3F5] border border-[#E5E8EB] text-[#60646C] flex items-center justify-center font-medium text-[10px] shrink-0">
                              {emp.fullName.charAt(0)}
                            </div>
                            <div>
                              <span className="font-medium text-[#1C2024] block">{emp.fullName}</span>
                              <span className="text-[10px] text-[#80848D] font-mono">{emp.email}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 px-3">
                          <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-medium border ${conf?.badgeClass || 'bg-slate-100'}`}>
                            {conf?.badge || emp.role}
                          </span>
                          <span className="text-[10px] text-[#80848D] block mt-0.5">{conf?.title}</span>
                        </td>

                        <td className="py-2.5 px-3 text-[#60646C]">
                          {emp.managerName || (emp.role === 'company_admin' || emp.role === 'director' ? '— (Top)' : 'Vikram Mehta')}
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {emp.assignedProjectIds && emp.assignedProjectIds.length > 0 ? (
                              emp.assignedProjectIds.map(pId => {
                                const p = projects.find(proj => proj.id === pId);
                                return (
                                  <span key={pId} className="px-1.5 py-0.2 bg-[#F1F3F5] text-[#60646C] rounded text-[10px] border border-[#E5E8EB]">
                                    {p?.name.replace(' [DEMO]', '') || pId}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-[#80848D] text-[11px]">All Projects</span>
                            )}
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          {canProvision ? (
                            <button
                              onClick={() => toggleEmployeeStatus(emp.id)}
                              className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                                emp.isActive
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                  : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                              }`}
                            >
                              {emp.isActive ? 'Active' : 'Deactivated'}
                            </button>
                          ) : (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                              emp.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                            }`}>
                              {emp.isActive ? 'Active' : 'Deactivated'}
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-right text-[#80848D] font-mono text-[11px]">
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
        <div className="space-y-4">
          {/* Top Level Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <MetricCard
              title="Assigned Accounts"
              value={totalAssigned.toString()}
              subtitle="Active inquiries"
              icon={Users}
            />
            <MetricCard
              title="Site Inspections"
              value={totalVisits.toString()}
              subtitle="Tours completed"
              icon={Calendar}
            />
            <MetricCard
              title="Allotments Closed"
              value={totalBookings.toString()}
              subtitle="Secured agreements"
              icon={Receipt}
            />
            <MetricCard
              title="Gross Sales Value"
              value={formatIndianCurrency(totalSalesVal)}
              subtitle="Closed booking pipeline"
              icon={TrendingUp}
            />
            <MetricCard
              title="Overdue Tasks"
              value={totalOverdue.toString()}
              subtitle="Action required"
              icon={AlertTriangle}
            />
          </div>

          {/* Performance Comparison Bar Chart */}
          <div className="bg-white rounded-md border border-[#E5E8EB] p-4 space-y-3">
            <div>
              <h2 className="text-xs font-semibold text-[#1C2024] uppercase tracking-wider">
                Funnel Conversion & Volume
              </h2>
              <p className="text-[11px] text-[#60646C]">Inspection generation and deal closing performance</p>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" />
                  <XAxis dataKey="name" stroke="#80848D" fontSize={11} />
                  <YAxis stroke="#80848D" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E8EB', borderRadius: '4px', color: '#1C2024', fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="Assigned" fill="#80848D" radius={[2, 2, 0, 0]} name="Assigned Leads" />
                  <Bar dataKey="Visits" fill="#D97706" radius={[2, 2, 0, 0]} name="Site Visits" />
                  <Bar dataKey="Booked" fill="#1E293B" radius={[2, 2, 0, 0]} name="Bookings Closed" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Provision Employee Account */}
      {isProvisionModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-white rounded-md shadow-lg border border-[#E5E8EB] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#1E293B] text-white">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-white" />
                <h3 className="text-sm font-semibold">Provision Employee Account</h3>
              </div>
              <button
                onClick={() => setIsProvisionModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleProvisionSubmit} className="p-5 space-y-3.5 text-xs">
              {provisionError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded text-red-700 flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{provisionError}</span>
                </div>
              )}

              <div>
                <label className="block text-[#1C2024] font-medium mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={e => setNewFullName(e.target.value)}
                  placeholder="e.g. Anand Mahindra"
                  required
                  className="w-full px-2.5 py-1.5 border border-[#E5E8EB] rounded text-[#1C2024] focus:outline-none focus:border-[#1E293B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[#1C2024] font-medium mb-1">
                    Corporate Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="name@aurevia.demo"
                    required
                    className="w-full px-2.5 py-1.5 border border-[#E5E8EB] rounded text-[#1C2024] focus:outline-none focus:border-[#1E293B] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[#1C2024] font-medium mb-1">
                    Contact Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    placeholder="+91 98000 00000"
                    required
                    className="w-full px-2.5 py-1.5 border border-[#E5E8EB] rounded text-[#1C2024] focus:outline-none focus:border-[#1E293B] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[#1C2024] font-medium mb-1">
                    RBAC Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newRole}
                    onChange={e => setNewRole(e.target.value as UserRole)}
                    className="w-full px-2.5 py-1.5 border border-[#E5E8EB] rounded text-[#1C2024] focus:outline-none focus:border-[#1E293B] font-medium"
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
                  <label className="block text-[#1C2024] font-medium mb-1">
                    Reporting Manager
                  </label>
                  <select
                    value={newManagerId}
                    onChange={e => setNewManagerId(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-[#E5E8EB] rounded text-[#1C2024] focus:outline-none focus:border-[#1E293B]"
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
                <label className="block text-[#1C2024] font-medium mb-1">
                  Project Access Scoping
                </label>
                <div className="p-2.5 bg-[#F8F9FA] border border-[#E5E8EB] rounded space-y-1.5">
                  {projects.map(proj => (
                    <label key={proj.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newAssignedProjects.includes(proj.id)}
                        onChange={() => toggleProjectAssignment(proj.id)}
                        className="rounded border-[#E5E8EB] text-[#1E293B] focus:ring-[#1E293B]"
                      />
                      <span className="text-[#1C2024]">{proj.name} ({proj.city})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E8EB]">
                <button
                  type="button"
                  onClick={() => setIsProvisionModalOpen(false)}
                  className="px-3 py-1.5 text-[#60646C] hover:bg-[#F8F9FA] rounded font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-[#1E293B] hover:bg-[#0F172A] text-white font-medium rounded transition"
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
