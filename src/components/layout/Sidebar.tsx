import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Kanban,
  CalendarCheck,
  MapPin,
  Building2,
  Grid3X3,
  Receipt,
  UserCheck,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { useLeads } from '../../context/LeadContext';
import { useSalesOperations } from '../../context/SalesOperationsContext';
import { canAccessRoute, ROLE_CONFIGS, normalizeRole } from '../../config/rbac';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  badge?: string;
  badgeVariant?: 'neutral' | 'urgent' | 'highlight';
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { role, user, logout } = useAuth();
  const { leadStats, followUpStats } = useLeads();
  const { siteVisitStats, bookingStats } = useSalesOperations();
  const navigate = useNavigate();

  const navGroups: NavGroup[] = [
    {
      label: 'Overview',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      label: 'Sales',
      items: [
        {
          name: 'Leads',
          path: '/leads',
          icon: Users,
          badge: leadStats.hotLeads > 0 ? `${leadStats.hotLeads}` : undefined,
          badgeVariant: 'neutral',
        },
        { name: 'Pipeline', path: '/pipeline', icon: Kanban },
        {
          name: 'Follow-ups',
          path: '/follow-ups',
          icon: CalendarCheck,
          badge: followUpStats.overdueCount > 0 ? `${followUpStats.overdueCount}` : undefined,
          badgeVariant: 'urgent',
        },
        {
          name: 'Site Visits',
          path: '/site-visits',
          icon: MapPin,
          badge: siteVisitStats.todayCount > 0 ? `${siteVisitStats.todayCount}` : undefined,
          badgeVariant: 'highlight',
        },
        {
          name: 'Bookings',
          path: '/bookings',
          icon: Receipt,
          badge: bookingStats.confirmedCount > 0 ? `${bookingStats.confirmedCount}` : undefined,
          badgeVariant: 'neutral',
        },
      ],
    },
    {
      label: 'Projects',
      items: [
        { name: 'Projects', path: '/projects', icon: Building2 },
        { name: 'Inventory', path: '/inventory', icon: Grid3X3 },
      ],
    },
    {
      label: 'Management',
      items: [
        { name: 'Employees', path: '/employees', icon: UserCheck },
        { name: 'Reports', path: '/reports', icon: BarChart3 },
        { name: 'Settings', path: '/settings', icon: Settings },
      ],
    },
  ];

  const activeRoleConfig = ROLE_CONFIGS[normalizeRole(role)];

  const handleLogout = async () => {
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
    <aside
      className={cn(
        'relative flex flex-col bg-[#1E2227] text-slate-300 transition-all duration-200 ease-in-out select-none border-r border-[#2A2F37] z-30 shrink-0 h-screen',
        collapsed ? 'w-14' : 'w-60'
      )}
    >
      {/* Brand Header */}
      <div className="flex h-14 items-center justify-between px-3 border-b border-[#2A2F37]">
        {!collapsed ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-7 w-7 rounded bg-[#2C323B] border border-[#3A414D] flex items-center justify-center shrink-0">
              <span className="font-semibold text-xs text-white tracking-tight">A</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-xs font-bold tracking-widest text-white uppercase truncate">AUREVIA</h1>
              <p className="text-[9px] text-slate-400 font-mono tracking-tight uppercase truncate">Developer CRM</p>
            </div>
          </div>
        ) : (
          <div className="mx-auto h-7 w-7 rounded bg-[#2C323B] border border-[#3A414D] flex items-center justify-center">
            <span className="font-semibold text-xs text-white">A</span>
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'hidden lg:flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:text-white hover:bg-[#2C323B] transition',
            collapsed && 'mx-auto'
          )}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => canAccessRoute(role, item.path));
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label} className="space-y-0.5">
              {!collapsed && (
                <div className="px-2 pt-1 pb-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  {group.label}
                </div>
              )}
              {visibleItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center gap-2.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors',
                        isActive
                          ? 'bg-[#2C323B] text-white font-medium shadow-none'
                          : 'text-slate-400 hover:bg-[#252A30] hover:text-slate-200'
                      )
                    }
                    title={collapsed ? item.name : undefined}
                  >
                    <Icon size={15} className="shrink-0 text-slate-400 group-hover:text-slate-200 transition-colors" />
                    {!collapsed && (
                      <div className="flex flex-1 items-center justify-between min-w-0">
                        <span className="truncate">{item.name}</span>
                        {item.badge && (
                          <span
                            className={cn(
                              'text-[10px] px-1.5 py-0.2 rounded font-mono font-medium shrink-0',
                              item.badgeVariant === 'urgent' && 'bg-rose-950/70 text-rose-300 border border-rose-800/40',
                              item.badgeVariant === 'highlight' && 'bg-amber-950/70 text-amber-300 border border-amber-800/40',
                              item.badgeVariant === 'neutral' && 'bg-slate-800 text-slate-300 border border-slate-700'
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User Account Controls */}
      <div className="p-2 border-t border-[#2A2F37] bg-[#1E2227]">
        {!collapsed ? (
          <div className="flex items-center justify-between p-1.5 rounded hover:bg-[#252A30] transition">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded bg-[#2C323B] border border-[#3A414D] flex items-center justify-center text-[11px] font-semibold text-slate-200 shrink-0">
                {getInitials(user?.fullName)}
              </div>
              <div className="min-w-0 overflow-hidden">
                <p className="text-xs font-medium text-slate-200 truncate">{user?.fullName || 'Rajesh Sharma'}</p>
                <p className="text-[10px] text-slate-400 capitalize truncate">{activeRoleConfig?.title || role.replace('_', ' ')}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-[#2C323B] rounded transition shrink-0"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full flex justify-center py-2 text-slate-400 hover:text-rose-400 transition"
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        )}
      </div>
    </aside>
  );
};
