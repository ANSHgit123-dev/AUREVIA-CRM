import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Search,
  Filter,
  Plus,
  Printer,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building,
  CreditCard,
  User,
  Calendar,
  FileText,
  Clock,
  ArrowUpRight,
  TrendingUp,
  X,
  RotateCcw,
} from 'lucide-react';
import { Booking, BookingStatus } from '../../../types';
import { useSalesOperations } from '../../../context/SalesOperationsContext';
import { useLeads } from '../../../context/LeadContext';
import { useProjectInventory } from '../../../context/ProjectInventoryContext';
import { MetricCard } from '../../../components/common/MetricCard';
import { formatIndianCurrency, formatDate } from '../../../lib/formatters';
import { BookingCreateModal } from '../components/BookingCreateModal';
import { BookingPrintDocument } from '../components/BookingPrintDocument';

type TabKey = 'all' | 'confirmed' | 'token_received' | 'pending' | 'cancelled';

export const BookingsPage: React.FC = () => {
  const {
    bookings,
    bookingStats,
    updateBookingStatus,
    cancelBooking,
  } = useSalesOperations();
  const { salesExecutives } = useLeads();
  const { projects } = useProjectInventory();

  // State
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedExecutive, setSelectedExecutive] = useState('all');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('all');

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPrintBooking, setSelectedPrintBooking] = useState<Booking | null>(null);
  const [cancelModalBooking, setCancelModalBooking] = useState<Booking | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [refundAmount, setRefundAmount] = useState<number>(0);

  // Filtered Bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      // Tab filter
      if (activeTab === 'confirmed' && b.status !== 'confirmed') return false;
      if (activeTab === 'token_received' && b.status !== 'token_received') return false;
      if (activeTab === 'pending' && b.status !== 'pending') return false;
      if (activeTab === 'cancelled' && b.status !== 'cancelled' && b.status !== 'refunded') return false;

      // Project filter
      if (selectedProject !== 'all' && b.projectId !== selectedProject) return false;

      // Executive filter
      if (selectedExecutive !== 'all' && b.assignedExecutiveName !== selectedExecutive) return false;

      // Payment mode filter
      if (selectedPaymentMode !== 'all' && b.paymentMode !== selectedPaymentMode) return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesRef = b.bookingReference.toLowerCase().includes(q);
        const matchesLead = b.leadName.toLowerCase().includes(q);
        const matchesPhone = b.leadPhone.toLowerCase().includes(q);
        const matchesUnit = b.unitNumber.toLowerCase().includes(q);
        const matchesProject = b.projectName.toLowerCase().includes(q);
        const matchesPaymentRef = b.paymentReference.toLowerCase().includes(q);
        return matchesRef || matchesLead || matchesPhone || matchesUnit || matchesProject || matchesPaymentRef;
      }

      return true;
    });
  }, [bookings, activeTab, selectedProject, selectedExecutive, selectedPaymentMode, searchTerm]);

  // Handle Cancellation Submit
  const handleConfirmCancel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalBooking) return;
    if (!cancellationReason.trim()) {
      alert('Please specify the cancellation reason.');
      return;
    }

    cancelBooking(cancelModalBooking.id, cancellationReason.trim(), refundAmount);
    setCancelModalBooking(null);
    setCancellationReason('');
    setRefundAmount(0);
  };

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            Confirmed
          </span>
        );
      case 'token_received':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <CreditCard className="w-3 h-3" />
            Token Received
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3" />
            Pending Verification
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3" />
            Cancelled
          </span>
        );
      case 'refunded':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <RotateCcw className="w-3 h-3" />
            Refunded
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[#1C2024]">
            Bookings & Commercial Allotments
          </h1>
          <p className="text-xs text-[#60646C] mt-0.5">
            Transaction processing, agreement calculation, unit inventory lock, and allotment letters.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#1E293B] hover:bg-[#0F172A] rounded transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Booking</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <MetricCard
          title="Total Bookings"
          value={bookingStats.total.toString()}
          subtitle="All recorded allotments"
          icon={Receipt}
        />
        <MetricCard
          title="Confirmed Allotments"
          value={bookingStats.confirmedCount.toString()}
          subtitle="Inventory marked as Sold"
          icon={CheckCircle2}
        />
        <MetricCard
          title="Token Received"
          value={bookingStats.tokenReceivedCount.toString()}
          subtitle="Inventory marked as Booked"
          icon={CreditCard}
        />
        <MetricCard
          title="Total Token Collected"
          value={formatIndianCurrency(bookingStats.totalTokenInr)}
          subtitle="Direct booking advances"
          icon={TrendingUp}
        />
        <MetricCard
          title="Total Allotment Value"
          value={formatIndianCurrency(bookingStats.totalBookingValueInr)}
          subtitle="Total agreement pipeline"
          icon={Building}
        />
      </div>

      {/* Tab Controls & Filters */}
      <div className="bg-white rounded-md border border-[#E5E8EB] p-3 space-y-3">
        {/* Status Tabs */}
        <div className="flex items-center space-x-1 border-b border-[#E5E8EB] pb-0 overflow-x-auto">
          {[
            { key: 'all', label: 'All Bookings', count: bookingStats.total },
            { key: 'confirmed', label: 'Confirmed', count: bookingStats.confirmedCount },
            { key: 'token_received', label: 'Token Received', count: bookingStats.tokenReceivedCount },
            { key: 'pending', label: 'Pending', count: bookingStats.pendingCount },
            { key: 'cancelled', label: 'Cancelled / Refunded', count: bookingStats.cancelledCount },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabKey)}
              className={`px-3 py-2 border-b-2 text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === tab.key
                  ? 'border-[#1E293B] text-[#1C2024] font-semibold'
                  : 'border-transparent text-[#60646C] hover:text-[#1C2024]'
              }`}
            >
              <span>{tab.label}</span>
              <span className="px-1.5 py-0.2 rounded font-mono text-[10px] bg-[#F1F3F5] text-[#60646C]">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Select Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#80848D]" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search reference, customer, unit..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F8F9FA] border border-[#E5E8EB] rounded text-[#1C2024] placeholder-[#80848D] focus:outline-none focus:border-[#1E293B] focus:bg-white"
            />
          </div>

          <div>
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-[#F8F9FA] border border-[#E5E8EB] rounded text-[#1C2024] focus:outline-none focus:border-[#1E293B]"
            >
              <option value="all">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedExecutive}
              onChange={e => setSelectedExecutive(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-[#F8F9FA] border border-[#E5E8EB] rounded text-[#1C2024] focus:outline-none focus:border-[#1E293B]"
            >
              <option value="all">All Closers</option>
              {salesExecutives.map(exec => (
                <option key={exec} value={exec}>
                  {exec}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedPaymentMode}
              onChange={e => setSelectedPaymentMode(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-[#F8F9FA] border border-[#E5E8EB] rounded text-[#1C2024] focus:outline-none focus:border-[#1E293B]"
            >
              <option value="all">All Payment Modes</option>
              <option value="neft_rtgs">NEFT / RTGS</option>
              <option value="cheque">Cheque</option>
              <option value="demand_draft">Demand Draft</option>
              <option value="upi">UPI</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bookings Records List */}
      {filteredBookings.length === 0 ? (
        <div className="bg-white rounded-md border border-[#E5E8EB] p-10 text-center">
          <Receipt className="w-8 h-8 text-[#80848D] mx-auto mb-2 opacity-50" />
          <h3 className="text-xs font-semibold text-[#1C2024]">No booking records found</h3>
          <p className="text-[11px] text-[#60646C] max-w-sm mx-auto mt-0.5">
            No bookings match your current filter criteria.
          </p>
          <button
            onClick={() => {
              setActiveTab('all');
              setSearchTerm('');
              setSelectedProject('all');
              setSelectedExecutive('all');
              setSelectedPaymentMode('all');
            }}
            className="mt-3 px-3 py-1.5 text-xs font-medium text-[#1C2024] bg-[#F1F3F5] hover:bg-[#E5E8EB] rounded transition-colors"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredBookings.map(b => (
            <div
              key={b.id}
              className="bg-white rounded-md border border-[#E5E8EB] hover:border-[#1E293B] transition-all p-4"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Left: Reference, Customer, Project & Unit */}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-[#1C2024] bg-[#F1F3F5] px-2 py-0.5 rounded border border-[#E5E8EB]">
                      {b.bookingReference}
                    </span>
                    {getStatusBadge(b.status)}
                    <span className="text-[11px] text-[#80848D]">
                      {formatDate(b.bookingDate)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="text-sm font-semibold text-[#1C2024]">{b.leadName}</h3>
                    <span className="text-xs text-[#60646C] font-mono">{b.leadPhone}</span>
                    {b.leadEmail && (
                      <span className="text-[11px] text-[#80848D] hidden sm:inline">&bull; {b.leadEmail}</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#60646C]">
                    <span className="inline-flex items-center gap-1 font-medium text-[#1C2024]">
                      <Building className="w-3.5 h-3.5 text-[#1E293B]" />
                      {b.projectName}
                    </span>
                    <span>&bull;</span>
                    <span>{b.towerName}</span>
                    <span>&bull;</span>
                    <span className="font-medium text-[#1C2024] bg-[#F1F3F5] px-1.5 py-0.2 rounded border border-[#E5E8EB]">
                      Unit {b.unitNumber} ({b.typology})
                    </span>
                    <span>&bull;</span>
                    <span className="text-[11px] text-[#80848D]">{b.carpetAreaSqft.toLocaleString('en-IN')} sq. ft.</span>
                  </div>
                </div>

                {/* Center: Financial Commercials */}
                <div className="bg-[#F8F9FA] p-3 rounded border border-[#E5E8EB] flex flex-wrap sm:flex-nowrap items-center gap-5 text-xs">
                  <div>
                    <span className="text-[#80848D] block text-[10px] uppercase font-semibold">Total Agreement</span>
                    <span className="text-xs font-semibold font-mono text-[#1C2024]">
                      {formatIndianCurrency(b.agreedTotalPriceInr)}
                    </span>
                  </div>

                  <div className="border-l border-[#E5E8EB] pl-3.5">
                    <span className="text-[#80848D] block text-[10px] uppercase font-semibold">Token Paid</span>
                    <span className="text-xs font-semibold font-mono text-emerald-700">
                      {formatIndianCurrency(b.tokenAmountInr)}
                    </span>
                  </div>

                  <div className="border-l border-[#E5E8EB] pl-3.5">
                    <span className="text-[#80848D] block text-[10px] uppercase font-semibold">Instrument</span>
                    <span className="font-medium text-[#1C2024] uppercase block text-xs">
                      {b.paymentMode.replace('_', '/')}
                    </span>
                    <span className="text-[10px] text-[#80848D] font-mono">
                      Ref: {b.paymentReference}
                    </span>
                  </div>

                  <div className="border-l border-[#E5E8EB] pl-3.5 hidden md:block">
                    <span className="text-[#80848D] block text-[10px] uppercase font-semibold">Closer</span>
                    <span className="font-medium text-[#1C2024] text-xs">{b.assignedExecutiveName}</span>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center lg:flex-col lg:items-end justify-end gap-1.5 shrink-0">
                  <button
                    onClick={() => setSelectedPrintBooking(b)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white bg-[#1E293B] hover:bg-[#0F172A] rounded transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Allotment</span>
                  </button>

                  {/* Status Action Buttons */}
                  <div className="flex items-center gap-1">
                    {b.status === 'token_received' && (
                      <button
                        onClick={() => updateBookingStatus(b.id, 'confirmed')}
                        title="Confirm Allotment & Mark Unit as Sold"
                        className="px-2 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors"
                      >
                        Confirm Allotment
                      </button>
                    )}

                    {b.status === 'pending' && (
                      <button
                        onClick={() => updateBookingStatus(b.id, 'token_received')}
                        title="Mark Token Received"
                        className="px-2 py-1 text-[11px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200 transition-colors"
                      >
                        Mark Token Received
                      </button>
                    )}

                    {b.status !== 'cancelled' && b.status !== 'refunded' && (
                      <button
                        onClick={() => {
                          setCancelModalBooking(b);
                          setCancellationReason('');
                          setRefundAmount(b.tokenAmountInr);
                        }}
                        title="Cancel Booking & Release Unit to Inventory"
                        className="px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Special conditions or cancellation reason note */}
              {(b.specialConditions || b.cancellationReason) && (
                <div className="mt-2.5 pt-2.5 border-t border-[#E5E8EB] text-xs flex items-center justify-between">
                  {b.specialConditions && (
                    <p className="text-[#60646C]">
                      <strong className="text-[#1C2024] font-medium">Remarks:</strong> {b.specialConditions}
                    </p>
                  )}
                  {b.cancellationReason && (
                    <p className="text-red-600 bg-red-50 px-2 py-0.5 rounded text-[11px] border border-red-200">
                      <strong>Cancellation Reason:</strong> {b.cancellationReason}
                      {b.refundAmountInr ? ` (Refunded: ${formatIndianCurrency(b.refundAmountInr)})` : ''}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Booking Create Modal */}
      <BookingCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onBookingSuccess={newBooking => {
          setSelectedPrintBooking(newBooking);
        }}
      />

      {/* Print Allotment Document Modal */}
      {selectedPrintBooking && (
        <BookingPrintDocument
          booking={selectedPrintBooking}
          onClose={() => setSelectedPrintBooking(null)}
        />
      )}

      {/* Cancel Booking Confirmation Modal */}
      {cancelModalBooking && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-md shadow-lg border border-[#E5E8EB] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#1E293B] text-white">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <h3 className="text-sm font-semibold">Cancel Allotment</h3>
              </div>
              <button
                onClick={() => setCancelModalBooking(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmCancel} className="p-5 space-y-3.5">
              <p className="text-xs text-[#60646C]">
                You are about to cancel booking{' '}
                <strong className="text-[#1C2024] font-mono">
                  {cancelModalBooking.bookingReference}
                </strong>{' '}
                for <strong className="text-[#1C2024]">{cancelModalBooking.leadName}</strong>.
              </p>

              <div className="p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                <strong>Inventory Guard:</strong> Cancelling this booking will immediately restore{' '}
                <strong>Unit {cancelModalBooking.unitNumber}</strong> back to <strong>AVAILABLE</strong> in the floor stacking matrix.
              </div>

              <div>
                <label className="block text-xs font-medium text-[#1C2024] mb-1">
                  Cancellation Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={cancellationReason}
                  onChange={e => setCancellationReason(e.target.value)}
                  required
                  rows={3}
                  placeholder="e.g. Loan rejection, customer relocation, financial inability..."
                  className="w-full px-2.5 py-1.5 text-xs border border-[#E5E8EB] rounded text-[#1C2024] focus:border-[#1E293B] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#1C2024] mb-1">
                  Refund Amount Processed (₹)
                </label>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={e => setRefundAmount(Number(e.target.value))}
                  min={0}
                  className="w-full px-2.5 py-1.5 text-xs border border-[#E5E8EB] rounded text-[#1C2024] focus:border-[#1E293B] focus:outline-none font-mono"
                />
                <p className="text-[11px] text-[#80848D] mt-0.5">
                  Initial token paid was: {formatIndianCurrency(cancelModalBooking.tokenAmountInr)}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E8EB]">
                <button
                  type="button"
                  onClick={() => setCancelModalBooking(null)}
                  className="px-3 py-1.5 text-xs font-medium text-[#60646C] hover:bg-[#F8F9FA] rounded transition-colors"
                >
                  Dismiss
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
                >
                  Confirm Cancellation & Release Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
