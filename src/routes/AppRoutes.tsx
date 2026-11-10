import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { LoginPage } from '../modules/auth/pages/LoginPage';
import { RoleDashboardRouter } from '../modules/dashboard/pages/RoleDashboardRouter';
import { DashboardPage } from '../modules/dashboard/pages/DashboardPage';
import { ProjectsPage } from '../modules/projects/pages/ProjectsPage';
import { InventoryPage } from '../modules/inventory/pages/InventoryPage';
import { LeadsPage } from '../modules/leads/pages/LeadsPage';
import { PipelinePage } from '../modules/pipeline/pages/PipelinePage';
import { FollowUpsPage } from '../modules/followups/pages/FollowUpsPage';
import { EmployeesPage } from '../modules/employees/pages/EmployeesPage';
import { SiteVisitsPage } from '../modules/sitevisits/pages/SiteVisitsPage';
import { BookingsPage } from '../modules/bookings/pages/BookingsPage';
import { ReportsPage } from '../modules/reports/pages/ReportsPage';
import { SettingsPage } from '../modules/settings/pages/SettingsPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Authentication Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Enterprise CRM Routes */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        
        {/* Dynamic Role-Based Dashboard Root */}
        <Route path="/dashboard" element={<RoleDashboardRouter />} />

        {/* Explicit Role-Specific Dashboards */}
        <Route path="/dashboard/admin" element={<RoleDashboardRouter forcedRole="company_admin" />} />
        <Route path="/dashboard/executive" element={<RoleDashboardRouter forcedRole="director" />} />
        <Route path="/dashboard/manager" element={<RoleDashboardRouter forcedRole="sales_manager" />} />
        <Route path="/dashboard/presales" element={<RoleDashboardRouter forcedRole="presales_agent" />} />
        <Route path="/dashboard/sales" element={<RoleDashboardRouter forcedRole="sales_executive" />} />
        <Route path="/dashboard/operations" element={<RoleDashboardRouter forcedRole="booking_operations" />} />
        <Route path="/dashboard/overview" element={<DashboardPage />} />

        {/* Phase 2: Projects & Unit Inventory Modules */}
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/inventory" element={<InventoryPage />} />

        {/* Phase 3: Lead Management Hub */}
        <Route path="/leads" element={<LeadsPage />} />

        {/* Phase 4: Sales Pipeline, Follow-ups, and Executive Performance */}
        <Route path="/pipeline" element={<PipelinePage />} />
        <Route path="/follow-ups" element={<FollowUpsPage />} />
        <Route path="/employees" element={<EmployeesPage />} />

        {/* Phase 5: Site Visits, Bookings & Financial Transactions, Reports & Business Intelligence */}
        <Route path="/site-visits" element={<SiteVisitsPage />} />
        <Route path="/bookings" element={<BookingsPage />} />
        <Route path="/reports" element={<ReportsPage />} />

        {/* Phase 6: Organization Settings & RBAC */}
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Catch-all Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
