import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
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
  ShieldCheck,
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
}

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { role, user } = useAuth();
  const { leadStats, followUpStats } = useLeads();
  const { siteVisitStats, bookingStats } = useSalesOperations();

  const allNavigationItems: NavItem[] = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Leads', path: '/leads', icon: Users, badge: `${leadStats.hotLeads} Hot` },
    { name: 'Sales Pipeline', path: '/pipeline', icon: Kanban },
    {
      name: 'Follow-ups',
      path: '/follow-ups',
      icon: CalendarCheck,
      badge: followUpStats.overdueCount > 0 ? `${followUpStats.overdueCount} Overdue` : undefined,
    },
    {
      name: 'Site Visits',
      path: '/site-visits',
      icon: MapPin,
      badge: siteVisitStats.todayCount > 0 ? `${siteVisitStats.todayCount} Today` : undefined,
    },
    { name: 'Projects', path: '/projects', icon: Building2 },
    { name: 'Unit Inventory', path: '/inventory', icon: Grid3X3 },
    {
      name: 'Bookings',
      path: '/bookings',
      icon: Receipt,
      badge: bookingStats.confirmedCount > 0 ? `${bookingStats.confirmedCount} Sold` : undefined,
    },
    { name: 'Employees', path: '/employees', icon: UserCheck },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  // Filter navigation items by RBAC permissions for active role
  const navigationItems = allNavigationItems.filter(item => canAccessRoute(role, item.path));
  const activeRoleConfig = ROLE_CONFIGS[normalizeRole(role)];

  return (
    <aside
      className={cn(
        'relative flex flex-col bg-navy-900 text-slate-300 transition-all duration-300 ease-in-out select-none border-r border-navy-800 z-30 shrink-0',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-navy-800">
        {!collapsed ? (
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-navy-800 border border-gold-500/40 flex items-center justify-center shadow-subtle">
              <span className="font-serif text-lg font-bold text-gold-500 tracking-wider">A</span>
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-widest text-white uppercase">AUREVIA</h1>
              <p className="text-[10px] text-slate-400 font-mono tracking-tight uppercase">REAL ESTATE CRM</p>
            </div>
          </div>
        ) : (
          <div className="mx-auto h-9 w-9 rounded-lg bg-navy-800 border border-gold-500/40 flex items-center justify-center">
            <span className="font-serif text-lg font-bold text-gold-500">A</span>
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'hidden lg:flex h-7 w-7 items-center justify-center rounded-md bg-navy-800 text-slate-400 hover:text-white hover:bg-navy-700 transition',
            collapsed && 'mx-auto'
          )}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-navy-700 text-white shadow-sm border-l-2 border-gold-500'
                    : 'text-slate-400 hover:bg-navy-800 hover:text-slate-200'
                )
              }
              title={collapsed ? item.name : undefined}
            >
              <Icon size={18} className="shrink-0 text-slate-400 group-hover:text-gold-500 transition-colors" />
              {!collapsed && (
                <div className="flex flex-1 items-center justify-between">
                  <span>{item.name}</span>
                  {item.badge && (
                    <span
                      className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded-full font-mono font-medium',
                        item.badge.includes('Overdue')
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
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
      </nav>

      {/* Footer Role Indicator */}
      <div className="p-3 border-t border-navy-800 bg-navy-900/60">
        {!collapsed ? (
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md bg-navy-800/80 border border-navy-700/50">
            <ShieldCheck size={16} className="text-gold-500 shrink-0" />
            <div className="overflow-hidden">
              <p className="text-[11px] font-semibold text-slate-200 uppercase tracking-wider">Access Scope</p>
              <p className="text-[10px] text-amber-400 font-semibold capitalize truncate">{activeRoleConfig?.title || role.replace('_', ' ')}</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center" title={`Role: ${activeRoleConfig?.title || role}`}>
            <ShieldCheck size={18} className="text-gold-500" />
          </div>
        )}
      </div>
    </aside>
  );
};

