import { UserRole } from '../types';

export interface RoleConfig {
  role: UserRole;
  title: string;
  badge: string;
  badgeClass: string;
  dashboardPath: string;
  description: string;
}

export const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  company_admin: {
    role: 'company_admin',
    title: 'Company Administrator',
    badge: 'Admin',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    dashboardPath: '/dashboard/admin',
    description: 'System administration, employee provisioning, security audit logs, and global organization control.',
  },
  director: {
    role: 'director',
    title: 'Managing Director / VP Sales',
    badge: 'Director',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    dashboardPath: '/dashboard/executive',
    description: 'High-level business velocity, macro absorption metrics, revenue realization, and strategic oversight.',
  },
  sales_manager: {
    role: 'sales_manager',
    title: 'Senior Sales Manager',
    badge: 'Manager',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    dashboardPath: '/dashboard/manager',
    description: 'Project-level sales management, closer pipeline allocation, inspection rates, and team targets.',
  },
  presales_agent: {
    role: 'presales_agent',
    title: 'Presales & Ingestion Specialist',
    badge: 'Presales',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    dashboardPath: '/dashboard/presales',
    description: 'Inbound channel lead qualification, instant call response, and site inspection booking.',
  },
  sales_executive: {
    role: 'sales_executive',
    title: 'Property Sales Consultant',
    badge: 'Executive',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    dashboardPath: '/dashboard/sales',
    description: 'Site visits conduction, customer negotiation, personal targets, and unit closure.',
  },
  booking_operations: {
    role: 'booking_operations',
    title: 'Booking & Inventory Operations Officer',
    badge: 'Operations',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    dashboardPath: '/dashboard/operations',
    description: 'Token collections, allotment document issuance, agreement processing, and unit release control.',
  },
  super_admin: {
    role: 'super_admin',
    title: 'System Super Administrator',
    badge: 'Super Admin',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    dashboardPath: '/dashboard/admin',
    description: 'Full unconstrained platform control and tenant provisioning.',
  },
};

/**
 * Normalized Role Check (handles super_admin alias)
 */
export function normalizeRole(role: UserRole): UserRole {
  if (role === 'super_admin') return 'company_admin';
  return role;
}

/**
 * Returns the automatic landing dashboard route for any given role.
 */
export function getDefaultDashboardPath(role: UserRole): string {
  const norm = normalizeRole(role);
  return ROLE_CONFIGS[norm]?.dashboardPath || '/dashboard';
}

/**
 * Route access control matrix.
 * True indicates the role is permitted to navigate to and view that route.
 */
export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  // Common dashboard root
  '/dashboard': [
    'company_admin',
    'director',
    'sales_manager',
    'presales_agent',
    'sales_executive',
    'booking_operations',
    'super_admin',
  ],
  // Role-Specific Dashboards
  '/dashboard/admin': ['company_admin', 'super_admin'],
  '/dashboard/executive': ['director', 'company_admin', 'super_admin'],
  '/dashboard/manager': ['sales_manager', 'director', 'company_admin', 'super_admin'],
  '/dashboard/presales': ['presales_agent', 'sales_manager', 'company_admin', 'super_admin'],
  '/dashboard/sales': ['sales_executive', 'sales_manager', 'director', 'company_admin', 'super_admin'],
  '/dashboard/operations': ['booking_operations', 'company_admin', 'director', 'super_admin'],

  // Core CRM Modules
  '/leads': [
    'company_admin',
    'director',
    'sales_manager',
    'presales_agent',
    'sales_executive',
    'super_admin',
  ],
  '/pipeline': [
    'company_admin',
    'director',
    'sales_manager',
    'sales_executive',
    'super_admin',
  ],
  '/follow-ups': [
    'company_admin',
    'director',
    'sales_manager',
    'presales_agent',
    'sales_executive',
    'super_admin',
  ],
  '/site-visits': [
    'company_admin',
    'director',
    'sales_manager',
    'presales_agent',
    'sales_executive',
    'super_admin',
  ],
  '/projects': [
    'company_admin',
    'director',
    'sales_manager',
    'presales_agent',
    'sales_executive',
    'booking_operations',
    'super_admin',
  ],
  '/inventory': [
    'company_admin',
    'director',
    'sales_manager',
    'presales_agent',
    'sales_executive',
    'booking_operations',
    'super_admin',
  ],
  '/bookings': [
    'booking_operations',
    'company_admin',
    'director',
    'sales_manager',
    'sales_executive',
    'super_admin',
  ],
  '/employees': [
    'company_admin',
    'director',
    'sales_manager',
    'super_admin',
  ],
  '/reports': [
    'company_admin',
    'director',
    'sales_manager',
    'booking_operations',
    'super_admin',
  ],
  '/settings': [
    'company_admin',
    'super_admin',
  ],
};

/**
 * Checks whether a given role has permission to access a specific path.
 */
export function canAccessRoute(role: UserRole, path: string): boolean {
  const norm = normalizeRole(role);
  // Match exact path or root prefix
  const allowedRoles = ROUTE_PERMISSIONS[path];
  if (!allowedRoles) {
    // If not explicitly listed, check if it starts with any defined route
    const matchingKey = Object.keys(ROUTE_PERMISSIONS).find(
      key => path === key || (key !== '/dashboard' && path.startsWith(`${key}/`))
    );
    if (matchingKey) {
      return ROUTE_PERMISSIONS[matchingKey].some(r => normalizeRole(r) === norm);
    }
    // Default open if not matched
    return true;
  }
  return allowedRoles.some(r => normalizeRole(r) === norm);
}

/**
 * Specific Action Permissions Matrix
 */
export function canManageEmployees(role: UserRole): boolean {
  const norm = normalizeRole(role);
  return norm === 'company_admin' || norm === 'director';
}

export function canManageProjects(role: UserRole): boolean {
  const norm = normalizeRole(role);
  return norm === 'company_admin' || norm === 'director';
}

export function canCreateBooking(role: UserRole): boolean {
  const norm = normalizeRole(role);
  return (
    norm === 'booking_operations' ||
    norm === 'sales_executive' ||
    norm === 'sales_manager' ||
    norm === 'company_admin' ||
    norm === 'director'
  );
}

export function canConfirmBooking(role: UserRole): boolean {
  const norm = normalizeRole(role);
  return norm === 'booking_operations' || norm === 'company_admin' || norm === 'director';
}

export function canCancelBooking(role: UserRole): boolean {
  const norm = normalizeRole(role);
  return norm === 'booking_operations' || norm === 'company_admin' || norm === 'director';
}

export function canReassignLeads(role: UserRole): boolean {
  const norm = normalizeRole(role);
  return norm === 'sales_manager' || norm === 'company_admin' || norm === 'director';
}

export function canViewFinancials(role: UserRole): boolean {
  const norm = normalizeRole(role);
  return (
    norm === 'company_admin' ||
    norm === 'director' ||
    norm === 'sales_manager' ||
    norm === 'booking_operations'
  );
}

export function canExportReports(role: UserRole): boolean {
  const norm = normalizeRole(role);
  return norm === 'company_admin' || norm === 'director' || norm === 'sales_manager';
}

