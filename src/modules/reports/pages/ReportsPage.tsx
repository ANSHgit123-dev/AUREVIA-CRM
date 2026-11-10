import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  Building,
  User,
  TrendingUp,
  Percent,
  CheckCircle2,
  MapPin,
  Compass,
  DollarSign,
  PieChart as PieChartIcon,
  Filter,
  ArrowUpRight,
  FileSpreadsheet,
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
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { useLeads } from '../../../context/LeadContext';
import { useProjectInventory } from '../../../context/ProjectInventoryContext';
import { useSalesOperations } from '../../../context/SalesOperationsContext';
import { MetricCard } from '../../../components/common/MetricCard';
import { formatIndianCurrency, formatDate } from '../../../lib/formatters';

const SOURCE_COLORS: Record<string, string> = {
  website: '#3b82f6',
  google_ads: '#10b981',
  meta_ads: '#8b5cf6',
  '99acres': '#f59e0b',
  magicbricks: '#ef4444',
  channel_partner: '#06b6d4',
  walk_in: '#ec4899',
  referral: '#14b8a6',
};

type ReportTab = 'overview' | 'projects' | 'executives' | 'sources';

export const ReportsPage: React.FC = () => {
  const { leads, salesExecutives } = useLeads();
  const { projects, units } = useProjectInventory();
  const { siteVisits, bookings, siteVisitStats, bookingStats } = useSalesOperations();

  // Filters
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedExecutive, setSelectedExecutive] = useState('all');
  const [dateRange, setDateRange] = useState<'all' | '30d' | '90d' | 'year'>('all');

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      if (selectedProject !== 'all' && l.projectId !== selectedProject) return false;
      if (selectedExecutive !== 'all' && l.assignedExecutiveName !== selectedExecutive) return false;
      return true;
    });
  }, [leads, selectedProject, selectedExecutive]);

  // Filtered Bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      if (b.status === 'cancelled' || b.status === 'refunded') return false;
      if (selectedProject !== 'all' && b.projectId !== selectedProject) return false;
      if (selectedExecutive !== 'all' && b.assignedExecutiveName !== selectedExecutive) return false;
      return true;
    });
  }, [bookings, selectedProject, selectedExecutive]);

  // Filtered Site Visits
  const filteredSiteVisits = useMemo(() => {
    return siteVisits.filter(v => {
      if (selectedProject !== 'all' && v.projectId !== selectedProject) return false;
      if (selectedExecutive !== 'all' && v.assignedExecutiveName !== selectedExecutive) return false;
      return true;
    });
  }, [siteVisits, selectedProject, selectedExecutive]);

  // 1. Overall Sales Metrics
  const totalLeadsCount = filteredLeads.length;
  const qualifiedLeadsCount = filteredLeads.filter(l =>
    ['qualified', 'site_visit_scheduled', 'site_visit_conducted', 'negotiation', 'token_paid', 'booked'].includes(l.currentStage)
  ).length;
  const siteVisitsConductedCount = filteredSiteVisits.filter(v => v.status === 'completed').length;
  const bookingsClosedCount = filteredBookings.filter(b => b.status === 'confirmed' || b.status === 'token_received').length;
  const totalSalesValueInr = filteredBookings.reduce((sum, b) => sum + b.agreedTotalPriceInr, 0);
  const conversionRate = totalLeadsCount > 0 ? ((bookingsClosedCount / totalLeadsCount) * 100).toFixed(1) : '0.0';

  // 2. Project Performance Data
  const projectPerformanceData = useMemo(() => {
    return projects.map(proj => {
      const projUnits = units.filter(u => u.projectId === proj.id);
      const totalUnits = projUnits.length || proj.totalUnits;
      const bookedUnits = projUnits.filter(u => u.status === 'booked').length;
      const soldUnits = projUnits.filter(u => u.status === 'sold').length;
      const availableUnits = projUnits.filter(u => u.status === 'available').length;
      const reservedUnits = projUnits.filter(u => u.status === 'reserved').length;

      const absorptionRate = totalUnits > 0 ? Math.round(((soldUnits + bookedUnits) / totalUnits) * 100) : 0;

      const projLeads = leads.filter(l => l.projectId === proj.id);
      const projVisits = siteVisits.filter(v => v.projectId === proj.id);
      const projBookings = bookings.filter(b => b.projectId === proj.id && b.status !== 'cancelled' && b.status !== 'refunded');
      const revenueGenerated = projBookings.reduce((sum, b) => sum + b.agreedTotalPriceInr, 0);

      return {
        id: proj.id,
        name: proj.name,
        city: proj.city,
        totalUnits,
        availableUnits,
        reservedUnits,
        bookedUnits,
        soldUnits,
        absorptionRate,
        enquiries: projLeads.length,
        siteVisits: projVisits.length,
        bookingsCount: projBookings.length,
        revenueGenerated,
        revenueCr: (revenueGenerated / 10000000).toFixed(2),
      };
    });
  }, [projects, units, leads, siteVisits, bookings]);

  // 3. Sales Executive Performance Data
  const executivePerformanceData = useMemo(() => {
    return salesExecutives.map(execName => {
      const execLeads = leads.filter(l => l.assignedExecutiveName === execName);
      const execQualified = execLeads.filter(l =>
        ['qualified', 'site_visit_scheduled', 'site_visit_conducted', 'negotiation', 'token_paid', 'booked'].includes(l.currentStage)
      ).length;
      const execVisits = siteVisits.filter(v => v.assignedExecutiveName === execName && v.status === 'completed');
      const execBookings = bookings.filter(
        b => b.assignedExecutiveName === execName && (b.status === 'confirmed' || b.status === 'token_received')
      );
      const execSalesValue = execBookings.reduce((sum, b) => sum + b.agreedTotalPriceInr, 0);
      const execConversion = execLeads.length > 0 ? ((execBookings.length / execLeads.length) * 100).toFixed(1) : '0.0';

      return {
        name: execName,
        assignedLeads: execLeads.length,
        qualified: execQualified,
        siteVisitsConducted: execVisits.length,
        bookingsClosed: execBookings.length,
        totalSalesValueInr: execSalesValue,
        totalSalesCr: (execSalesValue / 10000000).toFixed(2),
        conversionRate: execConversion,
      };
    });
  }, [salesExecutives, leads, siteVisits, bookings]);

  // 4. Lead Source Analytics
  const sourceAnalyticsData = useMemo(() => {
    const sources: Array<{ key: string; label: string }> = [
      { key: 'website', label: 'Website Organic' },
      { key: 'google_ads', label: 'Google Search Ads' },
      { key: 'meta_ads', label: 'Meta (FB/Insta)' },
      { key: '99acres', label: '99acres Portal' },
      { key: 'magicbricks', label: 'MagicBricks' },
      { key: 'channel_partner', label: 'Channel Partners' },
      { key: 'walk_in', label: 'Direct Walk-in' },
      { key: 'referral', label: 'Customer Referral' },
    ];

    return sources.map(src => {
      const srcLeads = filteredLeads.filter(l => l.source === src.key);
      const srcQualified = srcLeads.filter(l =>
        ['qualified', 'site_visit_scheduled', 'site_visit_conducted', 'negotiation', 'token_paid', 'booked'].includes(l.currentStage)
      ).length;
      const srcBookings = filteredBookings.filter(b => {
        const lead = leads.find(l => l.id === b.leadId);
        return lead?.source === src.key;
      });
      const revenue = srcBookings.reduce((sum, b) => sum + b.agreedTotalPriceInr, 0);
      const conversion = srcLeads.length > 0 ? ((srcBookings.length / srcLeads.length) * 100).toFixed(1) : '0.0';

      return {
        sourceKey: src.key,
        name: src.label,
        leads: srcLeads.length,
        qualified: srcQualified,
        bookings: srcBookings.length,
        revenueInr: revenue,
        revenueCr: (revenue / 10000000).toFixed(2),
        conversionRate: conversion,
        color: SOURCE_COLORS[src.key] || '#64748b',
      };
    }).filter(s => s.leads > 0 || s.bookings > 0);
  }, [filteredLeads, filteredBookings, leads]);

  // Export to CSV Function
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (activeTab === 'projects') {
      csvContent += 'Project Name,City,Total Units,Available Units,Booked/Sold Units,Absorption Rate (%),Enquiries,Site Visits,Bookings,Revenue Generated (INR)\n';
      projectPerformanceData.forEach(p => {
        csvContent += `"${p.name}","${p.city}",${p.totalUnits},${p.availableUnits},${p.bookedUnits + p.soldUnits},${p.absorptionRate}%,${p.enquiries},${p.siteVisits},${p.bookingsCount},${p.revenueGenerated}\n`;
      });
    } else if (activeTab === 'executives') {
      csvContent += 'Executive Name,Assigned Leads,Qualified Leads,Site Visits Conducted,Bookings Closed,Conversion Rate (%),Total Sales Value (INR)\n';
      executivePerformanceData.forEach(e => {
        csvContent += `"${e.name}",${e.assignedLeads},${e.qualified},${e.siteVisitsConducted},${e.bookingsClosed},${e.conversionRate}%,${e.totalSalesValueInr}\n`;
      });
    } else if (activeTab === 'sources') {
      csvContent += 'Lead Source,Total Leads,Qualified Leads,Bookings,Conversion Rate (%),Revenue Generated (INR)\n';
      sourceAnalyticsData.forEach(s => {
        csvContent += `"${s.name}",${s.leads},${s.qualified},${s.bookings},${s.conversionRate}%,${s.revenueInr}\n`;
      });
    } else {
      // Overview CSV
      csvContent += 'Report: Aurevia CRM Enterprise Sales Intelligence Overview\n';
      csvContent += `Total Leads,${totalLeadsCount}\n`;
      csvContent += `Qualified Leads,${qualifiedLeadsCount}\n`;
      csvContent += `Site Visits Conducted,${siteVisitsConductedCount}\n`;
      csvContent += `Bookings Closed,${bookingsClosedCount}\n`;
      csvContent += `Overall Conversion Rate,${conversionRate}%\n`;
      csvContent += `Total Pipeline Sales Value,${totalSalesValueInr}\n\n`;

      csvContent += 'Project,Absorption Rate (%),Revenue (Cr),Bookings\n';
      projectPerformanceData.forEach(p => {
        csvContent += `"${p.name}",${p.absorptionRate}%,₹${p.revenueCr} Cr,${p.bookingsCount}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Aurevia_Sales_Report_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12 print:p-0 print:space-y-4">
      {/* Header and Print/Export Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Reports & Business Intelligence
          </h1>
          <p className="text-sm text-slate-500">
            Real estate absorption analytics, executive sales velocity, acquisition channels, and revenue metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-sm transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Printable Header (Visible only on Print) */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-6">
        <h1 className="text-2xl font-serif font-bold text-slate-950">AUREVIA REALTY DEVELOPERS</h1>
        <p className="text-xs uppercase font-semibold text-amber-700">Executive Real Estate Sales & Portfolio Performance Report</p>
        <p className="text-xs text-slate-500 mt-1">Generated: {formatDate(new Date().toISOString())} | Scope: Consolidated National Portfolio</p>
      </div>

      {/* Global Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 print:hidden space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Perspective Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { key: 'overview', label: 'Executive Overview', icon: BarChart3 },
              { key: 'projects', label: 'Project Absorption', icon: Building },
              { key: 'executives', label: 'Executive Performance', icon: User },
              { key: 'sources', label: 'Acquisition Channels', icon: Compass },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as ReportTab)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-2 ${
                    activeTab === tab.key
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 text-xs">
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-700"
            >
              <option value="all">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={selectedExecutive}
              onChange={e => setSelectedExecutive(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-700"
            >
              <option value="all">All Closers</option>
              {salesExecutives.map(exec => (
                <option key={exec} value={exec}>
                  {exec}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Top Level Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <MetricCard
          title="Total Inquiries"
          value={totalLeadsCount.toString()}
          subtitle="All captured leads"
          icon={Compass}
        />
        <MetricCard
          title="Qualified Leads"
          value={qualifiedLeadsCount.toString()}
          subtitle={`${totalLeadsCount > 0 ? Math.round((qualifiedLeadsCount / totalLeadsCount) * 100) : 0}% qualification rate`}
          icon={CheckCircle2}
          variant="emerald"
        />
        <MetricCard
          title="Site Visits"
          value={siteVisitsConductedCount.toString()}
          subtitle="Conducted inspections"
          icon={MapPin}
          variant="gold"
        />
        <MetricCard
          title="Bookings Closed"
          value={bookingsClosedCount.toString()}
          subtitle="Confirmed allotments"
          icon={CheckCircle2}
          variant="emerald"
        />
        <MetricCard
          title="Conversion Rate"
          value={`${conversionRate}%`}
          subtitle="Lead to booking closure"
          icon={Percent}
          variant="gold"
        />
        <MetricCard
          title="Total Sales Value"
          value={formatIndianCurrency(totalSalesValueInr)}
          subtitle="Gross booked revenue"
          icon={TrendingUp}
          variant="emerald"
        />
      </div>

      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {(activeTab === 'overview' || activeTab === 'projects') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Project Absorption Table */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Project Inventory Absorption</h3>
                <p className="text-xs text-slate-500">Commercial velocity and unit absorption across developments</p>
              </div>
              <span className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded">
                {projects.length} Active Developments
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50">
                    <th className="py-2.5 px-3">Project</th>
                    <th className="py-2.5 px-3 text-center">Total Units</th>
                    <th className="py-2.5 px-3 text-center">Available</th>
                    <th className="py-2.5 px-3 text-center">Booked/Sold</th>
                    <th className="py-2.5 px-3">Absorption</th>
                    <th className="py-2.5 px-3 text-right">Revenue Realized</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {projectPerformanceData.map(proj => (
                    <tr key={proj.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{proj.name}</div>
                        <div className="text-[11px] text-slate-400">{proj.city}</div>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-medium">{proj.totalUnits}</td>
                      <td className="py-3 px-3 text-center font-mono text-emerald-700 font-semibold">{proj.availableUnits}</td>
                      <td className="py-3 px-3 text-center font-mono text-amber-700 font-semibold">{proj.bookedUnits + proj.soldUnits}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-amber-500 h-full rounded-full transition-all"
                              style={{ width: `${Math.min(100, proj.absorptionRate)}%` }}
                            />
                          </div>
                          <span className="font-bold text-slate-800 font-mono text-xs">
                            {proj.absorptionRate}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {formatIndianCurrency(proj.revenueGenerated)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Absorption Chart */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Absorption % Comparison</h3>
              <p className="text-xs text-slate-500">Unit sales progress towards sell-out</p>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectPerformanceData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} unit="%" domain={[0, 100]} />
                  <Tooltip
                    formatter={(val: any) => [`${val}%`, 'Absorption Rate']}
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="absorptionRate" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="text-[11px] text-slate-400 text-center">
              Target absorption speed: 15% per quarter per development.
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SALES EXECUTIVE PERFORMANCE */}
      {(activeTab === 'overview' || activeTab === 'executives') && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900">Sales Executive Performance & Closure Velocity</h3>
              <p className="text-xs text-slate-500">Individual pipeline management, inspection conversions, and closed deal volume</p>
            </div>
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded">
              {executivePerformanceData.length} Active Sales Closers
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50">
                  <th className="py-2.5 px-3">Sales Closer</th>
                  <th className="py-2.5 px-3 text-center">Assigned Leads</th>
                  <th className="py-2.5 px-3 text-center">Qualified</th>
                  <th className="py-2.5 px-3 text-center">Site Visits Conducted</th>
                  <th className="py-2.5 px-3 text-center">Bookings Closed</th>
                  <th className="py-2.5 px-3 text-center">Conversion Rate</th>
                  <th className="py-2.5 px-3 text-right">Total Deal Value (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {executivePerformanceData.map(exec => (
                  <tr key={exec.name} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-300 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                        {exec.name.charAt(0)}
                      </div>
                      <span>{exec.name}</span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono">{exec.assignedLeads}</td>
                    <td className="py-3 px-3 text-center font-mono text-emerald-700 font-medium">{exec.qualified}</td>
                    <td className="py-3 px-3 text-center font-mono text-amber-700 font-medium">{exec.siteVisitsConducted}</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">{exec.bookingsClosed}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-50 text-amber-900 border border-amber-200">
                        {exec.conversionRate}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      {formatIndianCurrency(exec.totalSalesValueInr)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ACQUISITION CHANNELS & LEAD SOURCES */}
      {(activeTab === 'overview' || activeTab === 'sources') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Source Breakdown Table */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Acquisition Channels & Source ROI</h3>
              <p className="text-xs text-slate-500">Lead quality, conversion propensity, and closed value across channels</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50">
                    <th className="py-2.5 px-3">Lead Source</th>
                    <th className="py-2.5 px-3 text-center">Total Inquiries</th>
                    <th className="py-2.5 px-3 text-center">Qualified</th>
                    <th className="py-2.5 px-3 text-center">Bookings Closed</th>
                    <th className="py-2.5 px-3 text-center">Closure %</th>
                    <th className="py-2.5 px-3 text-right">Revenue Contributed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sourceAnalyticsData.map(src => (
                    <tr key={src.sourceKey} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: src.color }}
                        />
                        <span className="font-semibold text-slate-900">{src.name}</span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono">{src.leads}</td>
                      <td className="py-3 px-3 text-center font-mono text-emerald-700">{src.qualified}</td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">{src.bookings}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="font-mono font-semibold text-slate-800">{src.conversionRate}%</span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {formatIndianCurrency(src.revenueInr)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Source Distribution Donut Chart */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Source Share</h3>
              <p className="text-xs text-slate-500">Volume proportion of total inquiries</p>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceAnalyticsData}
                    dataKey="leads"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={46}
                    paddingAngle={3}
                  >
                    {sourceAnalyticsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any, name: any) => [`${val} Leads`, name]}
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-slate-100 text-[10px]">
              {sourceAnalyticsData.slice(0, 4).map(src => (
                <div key={src.sourceKey} className="flex items-center gap-1 text-slate-600">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: src.color }} />
                  <span>{src.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
