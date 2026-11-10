import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  Building,
  ChevronDown,
  LogOut,
  User,
  PlusCircle,
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
    ? 'All Projects'
    : projects.find(p => p.id === selectedProjectId)?.name || 'All Projects';

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

  return (
    <header className="h-16 bg-white border-b border-surface-border px-6 flex items-center justify-between sticky top-0 z-20 shadow-subtle shrink-0">
      {/* Search & Project Selector */}
      <div className="flex items-center space-x-4 flex-1 max-w-2xl">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search leads, phone numbers, units (e.g. A-1402)..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900 focus:bg-white transition"
          />
        </div>

        {/* Dynamic Project Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProjectMenu(!showProjectMenu)}
            className="flex items-center space-x-2 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition"
          >
            <Building size={14} className="text-slate-500 shrink-0" />
            <span className="truncate max-w-[150px]">{activeProjectName}</span>
            <ChevronDown size={14} className="text-slate-400 shrink-0" />
          </button>

          {showProjectMenu && (
            <div className="absolute left-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50 text-xs">
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Select Active Development
              </div>
              <button
                onClick={() => {
                  setSelectedProjectId('all');
                  setShowProjectMenu(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 transition text-slate-800"
              >
                <span className={selectedProjectId === 'all' ? 'font-bold text-navy-900' : ''}>
                  All Projects (Pan-Org)
                </span>
                {selectedProjectId === 'all' && <Check size={14} className="text-gold-500" />}
              </button>
              <div className="my-1 border-t border-slate-100" />
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedProjectId(p.id);
                    setShowProjectMenu(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 transition text-slate-800"
                >
                  <div className="truncate pr-2">
                    <p className={`truncate ${selectedProjectId === p.id ? 'font-bold text-navy-900' : ''}`}>{p.name}</p>
                    <p className="text-[10px] text-slate-400">{p.city} &bull; {p.totalUnits} Units</p>
                  </div>
                  {selectedProjectId === p.id && <Check size={14} className="text-gold-500 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-3.5">
        {/* Quick Add Button */}
        <button
          onClick={() => navigate('/leads?action=new')}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-navy-900 text-white rounded-lg text-xs font-semibold hover:bg-navy-800 transition shadow-sm"
        >
          <PlusCircle size={14} />
          <span>New Lead</span>
        </button>

        {/* Active Role Selector Dropdown - Demo Mode */}
        {(!isSupabaseConfigured || isMockFallbackEnabled || user?.email.endsWith('.demo')) && (
          <div className="hidden sm:flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Demo:</span>
            <select
              data-testid="role-selector-dropdown"
              value={normalizeRole(role)}
              onChange={(e) => handleRoleSwitch(e.target.value as UserRole)}
              className="text-xs font-semibold bg-transparent text-amber-900 outline-none cursor-pointer"
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {ROLE_CONFIGS[r]?.badge}: {ROLE_CONFIGS[r]?.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Notifications */}
        <button
          className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          title="Notifications"
        >
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
        </button>

        {/* Direct Sign Out Button */}
        <button
          onClick={handleLogout}
          data-testid="direct-logout-button"
          className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
          title="Sign Out"
        >
          <LogOut size={18} />
        </button>

        {/* Vertical Divider */}
        <div className="h-6 w-px bg-slate-200" />

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center space-x-2.5 p-1.5 rounded-lg hover:bg-slate-50 transition"
          >
            <img
              src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
              alt={user?.fullName}
              className="h-8 w-8 rounded-full object-cover border border-slate-300"
            />
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-slate-800 leading-tight">{user?.fullName}</p>
              <p className="text-[10px] text-slate-500 capitalize">{role.replace('_', ' ')}</p>
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50 text-xs">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="font-semibold text-slate-800">{user?.fullName}</p>
                <p className="text-slate-500 text-[11px] truncate">{user?.email}</p>
              </div>

              {/* Demo Role Switcher Section */}
              {(!isSupabaseConfigured || isMockFallbackEnabled || user?.email.endsWith('.demo')) && (
                <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Demo Role Switcher
                  </p>
                  <div className="grid grid-cols-1 gap-1">
                    {roles.map((r) => (
                      <button
                        key={r}
                        onClick={() => handleRoleSwitch(r)}
                        className={`text-left px-2 py-1 rounded text-[11px] capitalize transition flex items-center justify-between ${
                          normalizeRole(role) === r
                            ? 'bg-navy-900 text-white font-semibold'
                            : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <span>{ROLE_CONFIGS[r]?.title || r.replace('_', ' ')}</span>
                        {normalizeRole(role) === r && <Check size={12} className="text-amber-400" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-2 px-3 py-2 text-rose-600 hover:bg-rose-50 transition"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
