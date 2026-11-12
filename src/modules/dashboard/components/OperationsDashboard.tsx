import React from 'react';
import {
  Receipt,
  CheckCircle2,
  RotateCcw,
  CreditCard,
  FileCheck,
  TrendingUp,
  ChevronRight,
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
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E5E8EB]">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            <span>Commercial Operations</span>
            <span>&bull;</span>
            <span>Inventory Locks & Allotments</span>
          </div>
          <h1 className="text-lg font-semibold text-slate-900 tracking-tight mt-0.5">
            Booking Operations Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/bookings"
            className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-medium text-white bg-[#1E293B] rounded hover:bg-slate-800 transition"
          >
            <FileCheck size={13} />
            <span>Manage Allotments</span>
          </Link>
        </div>
      </div>

      {/* Operational Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Tokens Awaiting Clearance"
          value={pendingConfirmation.length.toString()}
          subtitle="Inventory locked under hold"
          icon={CreditCard}
        />
        <MetricCard
          title="Confirmed Allotments"
          value={bookingStats.confirmedCount.toString()}
          subtitle="Inventory marked as Sold"
          icon={CheckCircle2}
        />
        <MetricCard
          title="Total Token Advances"
          value={formatIndianCurrency(bookingStats.totalTokenInr)}
          subtitle="Liquid advance consideration"
          icon={TrendingUp}
        />
        <MetricCard
          title="Cancelled & Restored"
          value={cancelledBookings.length.toString()}
          subtitle="Units released back to stock"
          icon={RotateCcw}
        />
      </div>

      {/* Operational Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Pending Verification Table */}
        <div className="lg:col-span-2 bg-white border border-[#E5E8EB] rounded-md p-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E8EB] mb-3">
            <div>
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Pending Allotment Verifications
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Verify banking instrument and formalize unit sale</p>
            </div>
            <Link to="/bookings" className="text-xs font-medium text-slate-700 hover:text-slate-900 inline-flex items-center gap-1">
              <span>View All Bookings</span>
              <ChevronRight size={13} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E5E8EB] text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  <th className="pb-2 font-medium">Reference</th>
                  <th className="pb-2 font-medium">Buyer Name</th>
                  <th className="pb-2 font-medium">Unit & Project</th>
                  <th className="pb-2 font-medium text-right">Token Amount</th>
                  <th className="pb-2 font-medium text-right">Payment</th>
                  <th className="pb-2 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E8EB]">
                {pendingConfirmation.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-slate-500">
                      No allotments awaiting verification.
                    </td>
                  </tr>
                ) : (
                  pendingConfirmation.map((b) => (
                    <tr key={b.id} className="hover:bg-[#F8F9FA] transition-colors">
                      <td className="py-2.5 font-mono text-xs font-medium text-slate-900">
                        {b.bookingReference}
                      </td>
                      <td className="py-2.5 text-slate-900 font-medium">
                        <div>{b.leadName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{b.leadPhone}</div>
                      </td>
                      <td className="py-2.5 text-slate-600">
                        <div>{b.unitNumber} &bull; {b.projectName}</div>
                        <div className="text-[10px] text-slate-400">{b.typology.replace('_', ' ')}</div>
                      </td>
                      <td className="py-2.5 text-right font-mono font-medium text-slate-900">
                        {formatIndianCurrency(b.tokenAmountInr)}
                      </td>
                      <td className="py-2.5 text-right uppercase text-[10px] font-mono text-slate-600">
                        {b.paymentMode.replace(/_/g, ' ')}
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => updateBookingStatus(b.id, 'confirmed', 'Instrument cleared')}
                          className="px-2 py-1 text-[11px] font-medium bg-[#1E293B] text-white rounded hover:bg-slate-800 transition"
                        >
                          Confirm
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Confirmed Transactions Summary */}
        <div className="bg-white border border-[#E5E8EB] rounded-md p-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E8EB] mb-3">
            <div>
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Confirmed Allotments
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Recently executed agreements</p>
            </div>
            <Link to="/bookings" className="text-xs font-medium text-slate-700 hover:text-slate-900">
              All Bookings
            </Link>
          </div>

          <div className="divide-y divide-[#E5E8EB]">
            {confirmedAllotments.slice(0, 5).map((b) => (
              <div key={b.id} className="py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-medium text-slate-900">{b.bookingReference}</span>
                  <span className="text-xs font-mono font-semibold text-slate-900">{formatIndianCurrency(b.agreedTotalPriceInr)}</span>
                </div>
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                  <span className="truncate">{b.leadName} &bull; Unit {b.unitNumber}</span>
                  <span className="text-[10px] text-emerald-700 font-medium">Confirmed</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
