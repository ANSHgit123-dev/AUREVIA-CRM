import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import { normalizeRole } from '../../../config/rbac';
import { AdminDashboard } from '../components/AdminDashboard';
import { DirectorDashboard } from '../components/DirectorDashboard';
import { ManagerDashboard } from '../components/ManagerDashboard';
import { PresalesDashboard } from '../components/PresalesDashboard';
import { SalesExecutiveDashboard } from '../components/SalesExecutiveDashboard';
import { OperationsDashboard } from '../components/OperationsDashboard';
import { UserRole } from '../../../types';

interface RoleDashboardRouterProps {
  forcedRole?: UserRole;
}

export const RoleDashboardRouter: React.FC<RoleDashboardRouterProps> = ({ forcedRole }) => {
  const { user } = useAuth();
  const effectiveRole = normalizeRole(forcedRole || user?.role || 'sales_executive');

  switch (effectiveRole) {
    case 'company_admin':
      return <AdminDashboard />;
    case 'director':
      return <DirectorDashboard />;
    case 'sales_manager':
      return <ManagerDashboard />;
    case 'presales_agent':
      return <PresalesDashboard />;
    case 'sales_executive':
      return <SalesExecutiveDashboard />;
    case 'booking_operations':
      return <OperationsDashboard />;
    default:
      return <SalesExecutiveDashboard />;
  }
};

