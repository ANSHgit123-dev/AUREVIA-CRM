import React from 'react';
import {
  Receipt,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Building,
  CreditCard,
  FileCheck,
  TrendingUp,
  Printer,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useSalesOperations } from '../../../context/SalesOperationsContext';
import { useProjectInventory } from '../../../context/ProjectInventoryContext';
import { MetricCard } from '../../../components/common/MetricCard';
import { formatIndianCurrency, formatDate } from '../../../lib/formatters';
import { Link } from 'react-router-dom';

export const OperationsDashboard: React.FC = () => {
  const { bookings, bookingStats, updateBookingStatus } = useSalesOperations();
  const { overallStats, projects } = useProjectInventory();

  // Financial collections breakdown
  const pendingConfirmation = bookings.filter(b => b.status === 'token_received');
  const confirmedAllotments = bookings.filter(b => b.status === 'confirmed');
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled' || b.status === 'refunded');

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-navy-950 p-6 rounded-2xl text-white shadow-card border border-rose-900/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles size={14} />
              <span>Commercial Transactions & Inventory Reconciliation</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold mt-1">Booking Operations Dashboard</h1>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Unit inventory lock management, token instrument verification, formal allotment letter generation, and cancellation refund tracking.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/bookings"
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold rounded-xl shadow transition"
            >
              <FileCheck size={14} />
              <span>Manage Allotments</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Operational KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Tokens Awaiting Clearance"
          value={pendingConfirmation.length.toString()}
          subtitle="Inventory locked under hold"
          icon={CreditCard}
          variant="gold"
        />
        <MetricCard
          title="Confirmed Allotments"
          value={bookingStats.confirmedCount.toString()}
          subtitle="Inventory marked as Sold"
          icon={CheckCircle2}
          variant="emerald"
        />
        <MetricCard
          title="Total Token Advances"
          value={formatIndianCurrency(bookingStats.totalTokenInr)}
          subtitle="Realized financial consideration"
          icon={TrendingUp}
          variant="emerald"
        />
        <MetricCard
          title="Reconciled Cancellations"
          value={cancelledBookings.length.toString()}
          subtitle="Units restored to available"
          icon={RotateCcw}
        />
      </div>

      {/* Operations Ledger Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Agreement Allotments */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-surface-border p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Pending Allotment Verifications
              </h2>
              <p className="text-xs text-slate-500">Verify bank payment instrument and confirm unit sale</p>
            </div>
            <Link to="/bookings" className="text-xs font-semibold text-rose-700 hover:text-rose-900">
              Open Allotments &rarr;
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {pendingConfirmation.map(b => (
              <div key={b.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{b.bookingReference}</span>
                    <span className="text-[10px] bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded font-bold border border-amber-200">
                      Token Received
                    </span>
                  </div>
                  <p className="font-semibold text-slate-800 mt-0.5">{b.leadName} ({b.leadPhone})</p>
                  <p className="text-[11px] text-slate-500">
                    {b.projectName} • Unit {b.unitNumber} • Ref: {b.paymentReference} ({b.bankName || 'Bank'})
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right mr-2 hidden sm:block">
                    <span className="font-mono font-bold text-slate-900 block">
                      {formatIndianCurrency(b.tokenAmountInr)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      of {formatIndianCurrency(b.agreedTotalPriceInr)}
                    </span>
                  </div>
                  <button
                    onClick={() => updateBookingStatus(b.id, 'confirmed')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-xs transition"
                  >
                    Confirm Sale
                  </button>
                </div>
              </div>
            ))}
            {pendingConfirmation.length === 0 && (
              <div className="p-6 text-center text-slate-400 text-xs">
                All tokens have been reconciled and confirmed.
              </div>
            )}
          </div>
        </div>

        {/* Inventory Stock Status */}
        <div className="bg-white rounded-xl border border-surface-border p-5 shadow-card space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Inventory Absorption Stock
            </h2>
            <p className="text-xs text-slate-500">Status breakdown across portfolio</p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
              <span className="font-semibold text-emerald-900">Units Sold / Confirmed</span>
              <span className="font-mono font-bold text-emerald-800 text-sm">{overallStats.soldUnits}</span>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
              <span className="font-semibold text-amber-900">Units Booked / Under Token</span>
              <span className="font-mono font-bold text-amber-800 text-sm">{overallStats.bookedUnits}</span>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
              <span className="font-semibold text-blue-900">Units Available For Sale</span>
              <span className="font-mono font-bold text-blue-800 text-sm">{overallStats.availableUnits}</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
              <span className="font-semibold text-slate-700">Total Portfolio Units</span>
              <span className="font-mono font-bold text-slate-900 text-sm">{overallStats.totalUnits}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

