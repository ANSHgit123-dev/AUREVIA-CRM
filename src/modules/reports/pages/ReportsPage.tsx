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
    <div className="space-y-4 pb-8 print:p-0 print:space-y-4">
      {/* Header and Print/Export Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1 print:hidden">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[#1C2024]">
            Reports & Business Intelligence
          </h1>
          <p className="text-xs text-[#60646C] mt-0.5">
            Absorption analytics, closer sales velocity, acquisition channels, and revenue metrics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1C2024] bg-white hover:bg-[#F8F9FA] border border-[#E5E8EB] rounded transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#60646C]" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#1E293B] hover:bg-[#0F172A] rounded transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Printable Header (Visible only on Print) */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-3 mb-4">
        <h1 className="text-xl font-serif font-bold text-slate-950">AUREVIA REALTY DEVELOPERS</h1>
        <p className="text-xs uppercase font-semibold text-slate-700">Executive Real Estate Sales & Portfolio Performance Report</p>
        <p className="text-[11px] text-slate-500 mt-0.5">Generated: {formatDate(new Date().toISOString())} | Scope: Consolidated Portfolio</p>
      </div>

      {/* Global Filter Toolbar */}
      <div className="bg-white rounded-md border border-[#E5E8EB] p-3 print:hidden space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Perspective Tabs */}
          <div className="flex items-center space-x-1 overflow-x-auto">
            {[
              { key: 'overview', label: 'Executive Overview', icon: BarChart3 },
              { key: 'projects', label: 'Project Absorption', icon: Building },
              { key: 'executives', label: 'Closer Performance', icon: User },
              { key: 'sources', label: 'Acquisition Channels', icon: Compass },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as ReportTab)}
                  className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    activeTab === tab.key
                      ? 'bg-[#1E293B] text-white'
                      : 'bg-[#F1F3F5] text-[#60646C] hover:bg-[#E5E8EB]'
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
              className="px-2.5 py-1.5 bg-[#F8F9FA] border border-[#E5E8EB] rounded text-[#1C2024] focus:outline-none focus:border-[#1E293B]"
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
              className="px-2.5 py-1.5 bg-[#F8F9FA] border border-[#E5E8EB] rounded text-[#1C2024] focus:outline-none focus:border-[#1E293B]"
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
          subtitle={`${totalLeadsCount > 0 ? Math.round((qualifiedLeadsCount / totalLeadsCount) * 100) : 0}% rate`}
          icon={CheckCircle2}
        />
        <MetricCard
          title="Site Visits"
          value={siteVisitsConductedCount.toString()}
          subtitle="Inspections completed"
          icon={MapPin}
        />
        <MetricCard
          title="Bookings Closed"
          value={bookingsClosedCount.toString()}
          subtitle="Confirmed allotments"
          icon={CheckCircle2}
        />
        <MetricCard
          title="Conversion Rate"
          value={`${conversionRate}%`}
          subtitle="Lead to closure"
          icon={Percent}
        />
        <MetricCard
          title="Total Sales Value"
          value={formatIndianCurrency(totalSalesValueInr)}
          subtitle="Gross booked revenue"
          icon={TrendingUp}
        />
      </div>

      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {(activeTab === 'overview' || activeTab === 'projects') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Project Absorption Table */}
          <div className="lg:col-span-2 bg-white rounded-md border border-[#E5E8EB] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-[#1C2024] uppercase tracking-wider">Project Inventory Absorption</h3>
                <p className="text-[11px] text-[#60646C]">Commercial velocity and unit absorption across developments</p>
              </div>
              <span className="text-[11px] font-medium text-[#1C2024] bg-[#F1F3F5] border border-[#E5E8EB] px-2 py-0.5 rounded">
                {projects.length} Developments
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E8EB] text-[#80848D] font-semibold bg-[#F8F9FA]">
                    <th className="py-2 px-2.5">Project</th>
                    <th className="py-2 px-2.5 text-center">Total</th>
                    <th className="py-2 px-2.5 text-center">Available</th>
                    <th className="py-2 px-2.5 text-center">Booked/Sold</th>
                    <th className="py-2 px-2.5">Absorption</th>
                    <th className="py-2 px-2.5 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F3F5]">
                  {projectPerformanceData.map(proj => (
                    <tr key={proj.id} className="hover:bg-[#F8F9FA] transition-colors">
                      <td className="py-2.5 px-2.5">
                        <div className="font-semibold text-[#1C2024]">{proj.name}</div>
                        <div className="text-[10px] text-[#80848D]">{proj.city}</div>
                      </td>
                      <td className="py-2.5 px-2.5 text-center font-mono">{proj.totalUnits}</td>
                      <td className="py-2.5 px-2.5 text-center font-mono text-emerald-700 font-medium">{proj.availableUnits}</td>
                      <td className="py-2.5 px-2.5 text-center font-mono text-amber-700 font-medium">{proj.bookedUnits + proj.soldUnits}</td>
                      <td className="py-2.5 px-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-[#F1F3F5] h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-[#1E293B] h-full rounded-full transition-all"
                              style={{ width: `${Math.min(100, proj.absorptionRate)}%` }}
                            />
                          </div>
                          <span className="font-medium text-[#1C2024] font-mono text-xs">
                            {proj.absorptionRate}%
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono font-semibold text-[#1C2024]">
                        {formatIndianCurrency(proj.revenueGenerated)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Absorption Chart */}
          <div className="bg-white rounded-md border border-[#E5E8EB] p-4 space-y-3 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-semibold text-[#1C2024] uppercase tracking-wider">Absorption Comparison</h3>
              <p className="text-[11px] text-[#60646C]">Unit sales progress towards sell-out</p>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectPerformanceData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F3F5" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#80848D' }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10, fill: '#80848D' }} unit="%" domain={[0, 100]} />
                  <Tooltip
                    formatter={(val: any) => [`${val}%`, 'Absorption Rate']}
                    contentStyle={{ borderRadius: 4, borderColor: '#E5E8EB', fontSize: 11 }}
                  />
                  <Bar dataKey="absorptionRate" fill="#1E293B" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="text-[10px] text-[#80848D] text-center">
              Target absorption: 15% per quarter per development.
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SALES EXECUTIVE PERFORMANCE */}
      {(activeTab === 'overview' || activeTab === 'executives') && (
        <div className="bg-white rounded-md border border-[#E5E8EB] p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-xs font-semibold text-[#1C2024] uppercase tracking-wider">Closer Performance & Velocity</h3>
              <p className="text-[11px] text-[#60646C]">Pipeline management, inspection conversions, and closed deal volume</p>
            </div>
            <span className="text-[11px] font-medium text-[#1C2024] bg-[#F1F3F5] border border-[#E5E8EB] px-2 py-0.5 rounded">
              {executivePerformanceData.length} Active Closers
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E5E8EB] text-[#80848D] font-semibold bg-[#F8F9FA]">
                  <th className="py-2 px-2.5">Sales Closer</th>
                  <th className="py-2 px-2.5 text-center">Assigned Leads</th>
                  <th className="py-2 px-2.5 text-center">Qualified</th>
                  <th className="py-2 px-2.5 text-center">Site Visits</th>
                  <th className="py-2 px-2.5 text-center">Bookings Closed</th>
                  <th className="py-2 px-2.5 text-center">Conversion</th>
                  <th className="py-2 px-2.5 text-right">Deal Value (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F3F5]">
                {executivePerformanceData.map(exec => (
                  <tr key={exec.name} className="hover:bg-[#F8F9FA] transition-colors">
                    <td className="py-2.5 px-2.5 font-medium text-[#1C2024] flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#F1F3F5] border border-[#E5E8EB] text-[#60646C] flex items-center justify-center font-medium text-[9px]">
                        {exec.name.charAt(0)}
                      </div>
                      <span>{exec.name}</span>
                    </td>
                    <td className="py-2.5 px-2.5 text-center font-mono">{exec.assignedLeads}</td>
                    <td className="py-2.5 px-2.5 text-center font-mono text-emerald-700">{exec.qualified}</td>
                    <td className="py-2.5 px-2.5 text-center font-mono text-amber-700">{exec.siteVisitsConducted}</td>
                    <td className="py-2.5 px-2.5 text-center font-mono font-semibold text-[#1C2024]">{exec.bookingsClosed}</td>
                    <td className="py-2.5 px-2.5 text-center">
                      <span className="inline-block px-1.5 py-0.2 rounded text-[11px] font-mono font-medium bg-[#F1F3F5] text-[#1C2024] border border-[#E5E8EB]">
                        {exec.conversionRate}%
                      </span>
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono font-semibold text-[#1C2024]">
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Source Breakdown Table */}
          <div className="lg:col-span-2 bg-white rounded-md border border-[#E5E8EB] p-4 space-y-3">
            <div>
              <h3 className="text-xs font-semibold text-[#1C2024] uppercase tracking-wider">Acquisition Channels & Source ROI</h3>
              <p className="text-[11px] text-[#60646C]">Lead quality, conversion propensity, and closed value across channels</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E8EB] text-[#80848D] font-semibold bg-[#F8F9FA]">
                    <th className="py-2 px-2.5">Lead Source</th>
                    <th className="py-2 px-2.5 text-center">Inquiries</th>
                    <th className="py-2 px-2.5 text-center">Qualified</th>
                    <th className="py-2 px-2.5 text-center">Bookings</th>
                    <th className="py-2 px-2.5 text-center">Closure %</th>
                    <th className="py-2 px-2.5 text-right">Revenue Contributed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F3F5]">
                  {sourceAnalyticsData.map(src => (
                    <tr key={src.sourceKey} className="hover:bg-[#F8F9FA] transition-colors">
                      <td className="py-2.5 px-2.5 flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: src.color }}
                        />
                        <span className="font-medium text-[#1C2024]">{src.name}</span>
                      </td>
                      <td className="py-2.5 px-2.5 text-center font-mono">{src.leads}</td>
                      <td className="py-2.5 px-2.5 text-center font-mono text-emerald-700">{src.qualified}</td>
                      <td className="py-2.5 px-2.5 text-center font-mono font-semibold text-[#1C2024]">{src.bookings}</td>
                      <td className="py-2.5 px-2.5 text-center">
                        <span className="font-mono font-medium text-[#1C2024]">{src.conversionRate}%</span>
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono font-semibold text-[#1C2024]">
                        {formatIndianCurrency(src.revenueInr)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Source Distribution Donut Chart */}
          <div className="bg-white rounded-md border border-[#E5E8EB] p-4 space-y-3 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-semibold text-[#1C2024] uppercase tracking-wider">Source Share</h3>
              <p className="text-[11px] text-[#60646C]">Volume proportion of total inquiries</p>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceAnalyticsData}
                    dataKey="leads"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    innerRadius={42}
                    paddingAngle={3}
                  >
                    {sourceAnalyticsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any, name: any) => [`${val} Leads`, name]}
                    contentStyle={{ borderRadius: 4, borderColor: '#E5E8EB', fontSize: 11 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-[#E5E8EB] text-[10px]">
              {sourceAnalyticsData.slice(0, 4).map(src => (
                <div key={src.sourceKey} className="flex items-center gap-1 text-[#60646C]">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: src.color }} />
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
