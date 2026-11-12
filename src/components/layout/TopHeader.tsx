import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  Building,
  ChevronDown,
  LogOut,
  User,
  Plus,
  Check,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProjectInventory } from '../../context/ProjectInventoryContext';
import { UserRole } from '../../types';
import { getDefaultDashboardPath, ROLE_CONFIGS, normalizeRole } from '../../config/rbac';
import { isSupabaseConfigured, isMockFallbackEnabled } from '../../lib/supabase';

export const TopHeader: React.FC = () => {
  const navigate = useNavigate();
  const { user, role, switchRole, logout } = useAuth();
  const { projects, selectedProjectId, setSelectedProjectId } = useProjectInventory();
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const roles: UserRole[] = [
    'company_admin',
    'director',
    'sales_manager',
    'presales_agent',
    'sales_executive',
    'booking_operations',
  ];

  const activeProjectName = selectedProjectId === 'all'
    ? 'All Developments'
    : projects.find(p => p.id === selectedProjectId)?.name || 'All Developments';

  const activeRoleConfig = ROLE_CONFIGS[normalizeRole(role)];

  const handleRoleSwitch = (newRole: UserRole) => {
    switchRole(newRole);
    setShowProfileMenu(false);
    navigate(getDefaultDashboardPath(newRole));
  };

  const handleLogout = async () => {
    setShowProfileMenu(false);
    await logout();
    navigate('/login', { replace: true });
  };

  const getInitials = (name?: string) => {
    if (!name) return 'AU';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="h-[50px] bg-white border-b border-[#E5E8EB] px-5 flex items-center justify-between sticky top-0 z-20 shrink-0">
      {/* Project Selector & Search */}
      <div className="flex items-center space-x-3 flex-1 max-w-xl">
        {/* Project Selector */}
        <div className="relative">
          <button
            onClick={() => setShowProjectMenu(!showProjectMenu)}
            className="flex items-center space-x-2 h-8 px-2.5 text-xs font-medium text-slate-700 bg-[#F5F6F7] border border-[#E5E8EB] rounded hover:bg-slate-100 transition"
          >
            <Building size={13} className="text-slate-500 shrink-0" />
            <span className="truncate max-w-[140px]">{activeProjectName}</span>
            <ChevronDown size={12} className="text-slate-400 shrink-0" />
          </button>

          {showProjectMenu && (
            <div className="absolute left-0 mt-1.5 w-64 bg-white border border-[#E5E8EB] rounded-md shadow-lg py-1 z-50 text-xs">
              <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Active Development
              </div>
              <button
                onClick={() => {
                  setSelectedProjectId('all');
                  setShowProjectMenu(false);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-[#F5F6F7] transition text-slate-700"
              >
                <span className={selectedProjectId === 'all' ? 'font-semibold text-slate-900' : ''}>
                  All Developments (Pan-Org)
                </span>
                {selectedProjectId === 'all' && <Check size={13} className="text-slate-900" />}
              </button>
              <div className="my-1 border-t border-[#E5E8EB]" />
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedProjectId(p.id);
                    setShowProjectMenu(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-[#F5F6F7] transition text-slate-700"
                >
                  <div className="truncate pr-2">
                    <p className={`truncate ${selectedProjectId === p.id ? 'font-semibold text-slate-900' : ''}`}>{p.name}</p>
                    <p className="text-[10px] text-slate-400">{p.city} &bull; {p.totalUnits} Units</p>
                  </div>
                  {selectedProjectId === p.id && <Check size={13} className="text-slate-900 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Global Search Bar */}
        <div className="relative flex-1">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search leads, units, bookings..."
            className="w-full h-8 pl-8 pr-3 text-xs bg-[#F5F6F7] border border-[#E5E8EB] rounded text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Right Actions & Profile */}
      <div className="flex items-center space-x-2.5">
        {/* Quick Add Button */}
        <button
          onClick={() => navigate('/leads?action=new')}
          className="flex items-center space-x-1.5 h-8 px-3 bg-[#1E293B] text-white rounded text-xs font-medium hover:bg-slate-800 transition"
        >
          <Plus size={13} />
          <span>New Lead</span>
        </button>

        {/* Active Role Switcher Dropdown (Demo/Presentation Mode) */}
        {(!isSupabaseConfigured || isMockFallbackEnabled || user?.email.endsWith('.demo')) && (
          <div className="hidden sm:flex items-center gap-1.5 h-8 bg-[#F5F6F7] border border-[#E5E8EB] rounded px-2">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Role:</span>
            <select
              data-testid="role-selector-dropdown"
              value={normalizeRole(role)}
              onChange={(e) => handleRoleSwitch(e.target.value as UserRole)}
              className="text-xs font-medium bg-transparent text-slate-800 outline-none cursor-pointer"
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {ROLE_CONFIGS[r]?.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Notification Icon */}
        <button
          className="h-8 w-8 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-[#F5F6F7] rounded transition"
          title="Notifications"
        >
          <Bell size={15} />
        </button>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center space-x-2 p-1 rounded hover:bg-[#F5F6F7] transition"
          >
            <div className="w-7 h-7 rounded bg-[#1E293B] text-white flex items-center justify-center text-xs font-medium">
              {getInitials(user?.fullName)}
            </div>
            <ChevronDown size={12} className="text-slate-400" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-1.5 w-56 bg-white border border-[#E5E8EB] rounded-md shadow-lg py-1 z-50 text-xs">
              <div className="px-3 py-2 border-b border-[#E5E8EB]">
                <p className="font-semibold text-slate-900 truncate">{user?.fullName || 'Rajesh Sharma'}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email || 'admin@aurevia.demo'}</p>
                <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-medium text-slate-600">
                  <Shield size={10} />
                  <span>{activeRoleConfig?.title}</span>
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/settings');
                  }}
                  className="w-full flex items-center px-3 py-1.5 text-slate-700 hover:bg-[#F5F6F7] transition"
                >
                  <User size={13} className="mr-2 text-slate-400" />
                  Account Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center px-3 py-1.5 text-rose-600 hover:bg-rose-50 transition"
                >
                  <LogOut size={13} className="mr-2 text-rose-500" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
