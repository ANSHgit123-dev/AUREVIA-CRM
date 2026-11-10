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
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Confirmed (Sold)
          </span>
        );
      case 'token_received':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <CreditCard className="w-3.5 h-3.5" />
            Token Received
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3.5 h-3.5" />
            Pending Verification
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" />
            Cancelled (Unit Released)
          </span>
        );
      case 'refunded':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <RotateCcw className="w-3.5 h-3.5" />
            Refunded
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Bookings & Commercial Allotments
          </h1>
          <p className="text-sm text-slate-500">
            End-to-end transaction processing, agreement calculation, unit inventory lock, and allotment letters
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Booking</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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
          variant="emerald"
        />
        <MetricCard
          title="Token Received"
          value={bookingStats.tokenReceivedCount.toString()}
          subtitle="Inventory marked as Booked"
          icon={CreditCard}
          variant="gold"
        />
        <MetricCard
          title="Total Token Collected"
          value={formatIndianCurrency(bookingStats.totalTokenInr)}
          subtitle="Direct booking advances"
          icon={TrendingUp}
          variant="emerald"
        />
        <MetricCard
          title="Total Allotment Value"
          value={formatIndianCurrency(bookingStats.totalBookingValueInr)}
          subtitle="Total agreement pipeline"
          icon={Building}
          variant="gold"
        />
      </div>

      {/* Tab Controls & Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 overflow-x-auto">
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
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  activeTab === tab.key
                    ? 'bg-amber-400 text-slate-950 font-bold'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Select Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search reference, customer, unit..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-700"
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
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-700"
            >
              <option value="all">All Sales Executives</option>
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
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-700"
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
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900">No booking records found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            No bookings match your current filter criteria. Create a new booking or clear filters.
          </p>
          <button
            onClick={() => {
              setActiveTab('all');
              setSearchTerm('');
              setSelectedProject('all');
              setSelectedExecutive('all');
              setSelectedPaymentMode('all');
            }}
            className="mt-4 px-3.5 py-2 text-xs font-medium text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map(b => (
            <div
              key={b.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm hover:border-amber-400/80 transition-all p-5"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left: Reference, Customer, Project & Unit */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                      {b.bookingReference}
                    </span>
                    {getStatusBadge(b.status)}
                    <span className="text-xs text-slate-400">
                      Allotted on {formatDate(b.bookingDate)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="text-base font-bold text-slate-900">{b.leadName}</h3>
                    <span className="text-xs text-slate-500 font-mono">({b.leadPhone})</span>
                    {b.leadEmail && (
                      <span className="text-xs text-slate-400 hidden sm:inline">• {b.leadEmail}</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1 font-medium text-slate-800">
                      <Building className="w-3.5 h-3.5 text-amber-600" />
                      {b.projectName}
                    </span>
                    <span>•</span>
                    <span>{b.towerName}</span>
                    <span>•</span>
                    <span className="font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Unit {b.unitNumber} ({b.typology})
                    </span>
                    <span>•</span>
                    <span>{b.carpetAreaSqft.toLocaleString('en-IN')} sq. ft.</span>
                  </div>
                </div>

                {/* Center: Financial Commercials */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-wrap sm:flex-nowrap items-center gap-6 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total Agreement</span>
                    <span className="text-sm font-bold font-mono text-slate-900">
                      {formatIndianCurrency(b.agreedTotalPriceInr)}
                    </span>
                  </div>

                  <div className="border-l border-slate-200 pl-4">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Token Paid</span>
                    <span className="text-sm font-bold font-mono text-emerald-700">
                      {formatIndianCurrency(b.tokenAmountInr)}
                    </span>
                  </div>

                  <div className="border-l border-slate-200 pl-4">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Payment Instrument</span>
                    <span className="font-medium text-slate-800 uppercase block">
                      {b.paymentMode.replace('_', '/')}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Ref: {b.paymentReference}
                    </span>
                  </div>

                  <div className="border-l border-slate-200 pl-4 hidden md:block">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Closing Manager</span>
                    <span className="font-medium text-slate-800">{b.assignedExecutiveName}</span>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center lg:flex-col lg:items-end justify-end gap-2 shrink-0">
                  <button
                    onClick={() => setSelectedPrintBooking(b)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Allotment</span>
                  </button>

                  {/* Status Action Buttons */}
                  <div className="flex items-center gap-1.5">
                    {b.status === 'token_received' && (
                      <button
                        onClick={() => updateBookingStatus(b.id, 'confirmed')}
                        title="Confirm Allotment & Mark Unit as Sold"
                        className="px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
                      >
                        Confirm Allotment
                      </button>
                    )}

                    {b.status === 'pending' && (
                      <button
                        onClick={() => updateBookingStatus(b.id, 'token_received')}
                        title="Mark Token Received"
                        className="px-2.5 py-1.5 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors"
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
                        className="px-2.5 py-1.5 text-[11px] font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        Cancel Booking
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Special conditions or cancellation reason note */}
              {(b.specialConditions || b.cancellationReason) && (
                <div className="mt-3 pt-3 border-t border-slate-100 text-xs flex items-center justify-between">
                  {b.specialConditions && (
                    <p className="text-slate-500">
                      <strong className="text-slate-700">Remarks:</strong> {b.specialConditions}
                    </p>
                  )}
                  {b.cancellationReason && (
                    <p className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-[11px] border border-rose-200">
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-semibold">Cancel Allotment</h3>
              </div>
              <button
                onClick={() => setCancelModalBooking(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmCancel} className="p-6 space-y-4">
              <p className="text-xs text-slate-600">
                You are about to cancel booking{' '}
                <strong className="text-slate-900 font-mono">
                  {cancelModalBooking.bookingReference}
                </strong>{' '}
                for <strong className="text-slate-900">{cancelModalBooking.leadName}</strong>.
              </p>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
                <strong>Inventory Guard:</strong> Cancelling this booking will immediately restore{' '}
                <strong>Unit {cancelModalBooking.unitNumber}</strong> back to <strong>AVAILABLE</strong> in the floor stacking matrix.
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Cancellation Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={cancellationReason}
                  onChange={e => setCancellationReason(e.target.value)}
                  required
                  rows={3}
                  placeholder="e.g. Loan rejection, customer relocation, financial inability..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Refund Amount Processed (₹)
                </label>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={e => setRefundAmount(Number(e.target.value))}
                  min={0}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Initial token paid was: {formatIndianCurrency(cancelModalBooking.tokenAmountInr)}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCancelModalBooking(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Dismiss
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors"
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
