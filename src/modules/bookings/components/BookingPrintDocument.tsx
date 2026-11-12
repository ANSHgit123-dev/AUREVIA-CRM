import React from 'react';
import { Booking } from '../../../types';
import { formatIndianCurrency, formatDate } from '../../../lib/formatters';
import { Printer, X, Download, ShieldCheck, Building2, CheckCircle, FileText } from 'lucide-react';

interface BookingPrintDocumentProps {
  booking: Booking;
  onClose: () => void;
}

export const BookingPrintDocument: React.FC<BookingPrintDocumentProps> = ({ booking, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const balanceDue = Math.max(0, booking.agreedTotalPriceInr - booking.tokenAmountInr);
  const carpetAreaSqm = (booking.carpetAreaSqft * 0.092903).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 flex justify-center p-4 sm:p-6 print:p-0 print:bg-white print:fixed print:inset-0">
      {/* Container */}
      <div className="relative w-full max-w-4xl bg-white rounded-md border border-[#E5E8EB] shadow-xl overflow-hidden my-auto print:m-0 print:w-full print:max-w-none print:shadow-none print:rounded-none">
        {/* Screen Action Bar (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-[#1E293B] text-white border-b border-[#0F172A] print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-white/10 text-white flex items-center justify-center font-bold text-xs border border-white/20">
              AV
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                Official Allotment Certificate & Receipt
              </h2>
              <p className="text-[11px] text-slate-300">
                Reference: <span className="text-white font-mono font-medium">{booking.bookingReference}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Document</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Allotment Certificate Sheet */}
        <div className="p-8 sm:p-12 print:p-8 bg-white text-slate-900 leading-relaxed font-sans printable-allotment-sheet">
          {/* Header & Logo */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-6 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-lg bg-slate-950 text-amber-400 flex items-center justify-center font-bold text-lg tracking-wider border border-amber-500/40">
                  AUR
                </div>
                <div>
                  <h1 className="text-2xl font-serif font-bold text-slate-950 tracking-tight">
                    AUREVIA REALTY DEVELOPERS
                  </h1>
                  <p className="text-xs font-semibold tracking-wider text-amber-700 uppercase">
                    Luxury & Sustainable Living
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-600 mt-2 max-w-sm">
                Corporate Office: Aurevia Signature Tower, Level 24, Senapati Bapat Marg, Lower Parel, Mumbai 400013. CIN: U70100MH2021PTC368921
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold rounded uppercase tracking-wider mb-2">
                Provisional Allotment Letter
              </span>
              <p className="text-xs text-slate-500">
                Allotment Ref: <strong className="text-slate-900 font-mono">{booking.bookingReference}</strong>
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Date: <strong className="text-slate-900">{formatDate(booking.bookingDate || booking.createdAt)}</strong>
              </p>
              <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>RERA Registered Project</span>
              </div>
            </div>
          </div>

          {/* Salutation & Allottee Details */}
          <div className="mb-6">
            <p className="text-sm font-medium text-slate-700">To,</p>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Primary Allottee</p>
                <p className="text-base font-bold text-slate-900 mt-0.5">{booking.leadName}</p>
                <p className="text-xs text-slate-600 mt-0.5">Contact: {booking.leadPhone}</p>
                {booking.leadEmail && (
                  <p className="text-xs text-slate-600">Email: {booking.leadEmail}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Project & Development</p>
                <p className="text-base font-bold text-slate-900 mt-0.5">{booking.projectName}</p>
                <p className="text-xs text-slate-600 mt-0.5">Tower / Wing: {booking.towerName}</p>
                <p className="text-xs text-slate-600">Assigned Relationship Manager: {booking.assignedExecutiveName}</p>
              </div>
            </div>
          </div>

          {/* Subject Line */}
          <div className="mb-6 text-sm">
            <p className="font-semibold text-slate-900">
              Subject: Provisional Allotment of Apartment/Unit No. <span className="font-mono text-amber-700">{booking.unitNumber}</span> in "{booking.projectName}".
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Dear Sir/Madam, we take immense pleasure in confirming the provisional allotment of the undermentioned residential unit in your favor, against receipt of the initial booking consideration.
            </p>
          </div>

          {/* Unit Specifications Table */}
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-amber-600" />
              Schedule I: Unit Specifications & Particulars
            </h3>
            <table className="w-full text-xs border border-slate-300 border-collapse">
              <tbody>
                <tr className="bg-slate-100 border-b border-slate-300 font-semibold text-slate-700">
                  <td className="p-2.5 border-r border-slate-300 w-1/4">Unit Number</td>
                  <td className="p-2.5 border-r border-slate-300 w-1/4 font-mono font-bold text-slate-900">{booking.unitNumber}</td>
                  <td className="p-2.5 border-r border-slate-300 w-1/4">Typology / Configuration</td>
                  <td className="p-2.5 w-1/4 font-semibold text-slate-900">{booking.typology}</td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="p-2.5 border-r border-slate-300 font-medium text-slate-600">RERA Carpet Area</td>
                  <td className="p-2.5 border-r border-slate-300 text-slate-900">
                    <strong>{booking.carpetAreaSqft.toLocaleString('en-IN')} sq. ft.</strong> ({carpetAreaSqm} sq. mtrs)
                  </td>
                  <td className="p-2.5 border-r border-slate-300 font-medium text-slate-600">Tower / Sector</td>
                  <td className="p-2.5 text-slate-900">{booking.towerName}</td>
                </tr>
                <tr>
                  <td className="p-2.5 border-r border-slate-300 font-medium text-slate-600">Allotment Status</td>
                  <td className="p-2.5 border-r border-slate-300">
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 uppercase text-[11px]">
                      <CheckCircle className="w-3.5 h-3.5" />
                      {booking.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-2.5 border-r border-slate-300 font-medium text-slate-600">Designated Parking</td>
                  <td className="p-2.5 text-slate-900">1 Covered Reserved Bay Included</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Commercial Breakdown */}
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-600" />
              Schedule II: Commercial Consideration & Financial Summary
            </h3>
            <table className="w-full text-xs border border-slate-300 border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-semibold text-left">
                  <th className="p-2.5 border-r border-slate-300">Component</th>
                  <th className="p-2.5 border-r border-slate-300">Description</th>
                  <th className="p-2.5 text-right">Amount (INR)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="p-2 border-r border-slate-300 font-medium">Base Unit Consideration</td>
                  <td className="p-2 border-r border-slate-300 text-slate-600">Carpet area base rate</td>
                  <td className="p-2 text-right font-mono text-slate-800">{formatIndianCurrency(booking.basePriceInr)}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="p-2 border-r border-slate-300 font-medium">Preferential Location Charge (PLC)</td>
                  <td className="p-2 border-r border-slate-300 text-slate-600">Floor rise & view premium</td>
                  <td className="p-2 text-right font-mono text-slate-800">{formatIndianCurrency(booking.plcInr)}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="p-2 border-r border-slate-300 font-medium">Reserved Car Parking Charges</td>
                  <td className="p-2 border-r border-slate-300 text-slate-600">Exclusive basement podium rights</td>
                  <td className="p-2 text-right font-mono text-slate-800">{formatIndianCurrency(booking.parkingChargesInr)}</td>
                </tr>
                <tr className="bg-amber-50/60 border-b-2 border-slate-900 font-bold text-slate-950">
                  <td className="p-2.5 border-r border-slate-300 text-sm">Total Agreement Value (AV)</td>
                  <td className="p-2.5 border-r border-slate-300 text-xs font-normal text-slate-600">Exclusive of statutory stamp duty & GST</td>
                  <td className="p-2.5 text-right font-mono text-sm text-slate-950">{formatIndianCurrency(booking.agreedTotalPriceInr)}</td>
                </tr>
                <tr className="bg-emerald-50/70 border-b border-slate-200 text-emerald-900 font-medium">
                  <td className="p-2 border-r border-slate-300">Token Amount Received (Paid)</td>
                  <td className="p-2 border-r border-slate-300 text-xs">
                    Mode: <strong className="uppercase">{booking.paymentMode.replace('_', '/')}</strong> | Ref: <strong className="font-mono">{booking.paymentReference}</strong> {booking.bankName ? `(${booking.bankName})` : ''}
                  </td>
                  <td className="p-2 text-right font-mono font-bold text-emerald-700">{formatIndianCurrency(booking.tokenAmountInr)}</td>
                </tr>
                <tr className="bg-slate-50 font-semibold text-slate-800">
                  <td className="p-2 border-r border-slate-300">Balance Consideration Payable</td>
                  <td className="p-2 border-r border-slate-300 text-xs font-normal text-slate-600">Payable as per the standard construction linked payment milestone plan</td>
                  <td className="p-2 text-right font-mono text-slate-900">{formatIndianCurrency(balanceDue)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Statutory Terms & Conditions */}
          <div className="mb-8 p-3.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600 space-y-1">
            <p className="font-semibold text-slate-800 uppercase tracking-wider mb-1">Standard Allotment Terms & Conditions:</p>
            <p>1. This provisional allotment is subject to realization of the booking payment instrument and execution of the Agreement for Sale within 30 days.</p>
            <p>2. Stamp duty, registration fees, GST, electricity meter and water connection infrastructure deposits are payable additionally as per state government notifications.</p>
            <p>3. Timely payment of balance consideration installments as per construction milestones is the essence of this allotment contract.</p>
            <p>4. This document is system-generated and certified under AUREVIA CRM Enterprise Real Estate Core Engine.</p>
          </div>

          {/* Signature Blocks */}
          <div className="pt-6 border-t-2 border-slate-900 grid grid-cols-2 gap-12">
            <div>
              <div className="h-16 flex items-end">
                <div className="font-serif italic text-slate-600 border-b border-slate-400 w-48 pb-1">
                  Vikram Mehta
                </div>
              </div>
              <p className="text-xs font-bold text-slate-900 mt-1">Authorized Developer Signatory</p>
              <p className="text-[10px] text-slate-500">For Aurevia Realty Developers Pvt. Ltd.</p>
            </div>
            <div className="text-right">
              <div className="h-16 flex items-end justify-end">
                <div className="border-b border-slate-400 w-48 pb-1 text-slate-400 text-xs italic">
                  (Signature of Allottee)
                </div>
              </div>
              <p className="text-xs font-bold text-slate-900 mt-1">{booking.leadName}</p>
              <p className="text-[10px] text-slate-500">Primary Allottee / Applicant</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

