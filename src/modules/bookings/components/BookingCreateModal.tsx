import React, { useState, useEffect, useMemo } from 'react';
import { Lead, Project, Tower, Unit, Booking } from '../../../types';
import { useSalesOperations } from '../../../context/SalesOperationsContext';
import { useLeads } from '../../../context/LeadContext';
import { useProjectInventory } from '../../../context/ProjectInventoryContext';
import { formatIndianCurrency } from '../../../lib/formatters';
import {
  X,
  Building,
  KeyRound,
  CreditCard,
  User,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Search,
  Sparkles,
} from 'lucide-react';

interface BookingCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedLeadId?: string;
  onBookingSuccess?: (booking: Booking) => void;
}

export const BookingCreateModal: React.FC<BookingCreateModalProps> = ({
  isOpen,
  onClose,
  preselectedLeadId,
  onBookingSuccess,
}) => {
  const { createBooking } = useSalesOperations();
  const { leads, salesExecutives } = useLeads();
  const { projects, towers, units } = useProjectInventory();

  // Form State
  const [selectedLeadId, setSelectedLeadId] = useState(preselectedLeadId || '');
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedTowerId, setSelectedTowerId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');

  // Commercial Pricing State
  const [basePrice, setBasePrice] = useState<number>(0);
  const [plc, setPlc] = useState<number>(0);
  const [parkingCharges, setParkingCharges] = useState<number>(0);
  const [tokenAmount, setTokenAmount] = useState<number>(500000); // Default ₹5 Lakhs

  // Payment State
  const [paymentMode, setPaymentMode] = useState<'neft_rtgs' | 'cheque' | 'demand_draft' | 'upi'>('neft_rtgs');
  const [paymentReference, setPaymentReference] = useState('');
  const [bankName, setBankName] = useState('HDFC Bank');
  const [bookingDate, setBookingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [assignedExecutive, setAssignedExecutive] = useState(salesExecutives[0] || 'Arjun Verma');
  const [specialConditions, setSpecialConditions] = useState('');
  const [bookingStatus, setBookingStatus] = useState<'token_received' | 'confirmed' | 'pending'>('token_received');

  const [formError, setFormError] = useState<string | null>(null);

  // Initialize preselected lead if provided
  useEffect(() => {
    if (preselectedLeadId) {
      setSelectedLeadId(preselectedLeadId);
      const lead = leads.find(l => l.id === preselectedLeadId);
      if (lead && lead.projectId) {
        setSelectedProjectId(lead.projectId);
      }
    }
  }, [preselectedLeadId, leads]);

  // Lead selection details
  const selectedLead = useMemo(() => {
    return leads.find(l => l.id === selectedLeadId);
  }, [leads, selectedLeadId]);

  // Filtered Leads for dropdown/search
  const filteredLeads = useMemo(() => {
    if (!leadSearchQuery.trim()) return leads.slice(0, 20);
    const q = leadSearchQuery.toLowerCase();
    return leads.filter(
      l =>
        l.firstName.toLowerCase().includes(q) ||
        l.lastName.toLowerCase().includes(q) ||
        l.phone.toLowerCase().includes(q) ||
        (l.email && l.email.toLowerCase().includes(q))
    ).slice(0, 20);
  }, [leads, leadSearchQuery]);

  // Filtered Towers based on Selected Project
  const availableTowers = useMemo(() => {
    if (!selectedProjectId) return [];
    return towers.filter(t => t.projectId === selectedProjectId);
  }, [towers, selectedProjectId]);

  // Filtered Units: MUST be in selected tower and STATUS MUST BE AVAILABLE!
  const availableUnits = useMemo(() => {
    if (!selectedTowerId) return [];
    return units.filter(u => u.towerId === selectedTowerId && u.status === 'available');
  }, [units, selectedTowerId]);

  // Selected Unit Details
  const selectedUnit = useMemo(() => {
    return units.find(u => u.id === selectedUnitId);
  }, [units, selectedUnitId]);

  // Auto-populate pricing when unit changes
  useEffect(() => {
    if (selectedUnit) {
      setBasePrice(selectedUnit.basePriceInr || 0);
      setPlc(selectedUnit.plcInr || 0);
      setParkingCharges(selectedUnit.parkingChargesInr || 0);
      // Auto-set 5% or 10% token recommendation
      const total = (selectedUnit.basePriceInr || 0) + (selectedUnit.plcInr || 0) + (selectedUnit.parkingChargesInr || 0);
      if (tokenAmount === 0 || tokenAmount === 500000) {
        setTokenAmount(Math.min(1000000, Math.round(total * 0.05)));
      }
    }
  }, [selectedUnit]);

  // Total Agreement Value
  const totalAgreementValue = useMemo(() => {
    return (Number(basePrice) || 0) + (Number(plc) || 0) + (Number(parkingCharges) || 0);
  }, [basePrice, plc, parkingCharges]);

  // When project changes, reset tower and unit
  const handleProjectChange = (projId: string) => {
    setSelectedProjectId(projId);
    setSelectedTowerId('');
    setSelectedUnitId('');
  };

  // When tower changes, reset unit
  const handleTowerChange = (twrId: string) => {
    setSelectedTowerId(twrId);
    setSelectedUnitId('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedLead) {
      setFormError('Please select a valid customer lead.');
      return;
    }

    if (!selectedProjectId) {
      setFormError('Please select a project.');
      return;
    }

    const proj = projects.find(p => p.id === selectedProjectId);
    if (!proj) {
      setFormError('Invalid project selected.');
      return;
    }

    const twr = towers.find(t => t.id === selectedTowerId);
    if (!twr) {
      setFormError('Please select a tower.');
      return;
    }

    if (!selectedUnit) {
      setFormError('Please select an available unit for booking.');
      return;
    }

    if (totalAgreementValue <= 0) {
      setFormError('Total Agreement Value must be greater than zero.');
      return;
    }

    if (tokenAmount <= 0) {
      setFormError('Token amount must be greater than zero.');
      return;
    }

    if (!paymentReference.trim()) {
      setFormError('Please provide a payment reference / instrument number (e.g. UTR or Cheque No).');
      return;
    }

    try {
      const leadFullName = `${selectedLead.firstName} ${selectedLead.lastName}`.trim();
      const created = await createBooking({
        leadId: selectedLead.id,
        leadName: leadFullName,
        leadPhone: selectedLead.phone,
        leadEmail: selectedLead.email,
        projectId: proj.id,
        projectName: proj.name,
        towerId: twr.id,
        towerName: twr.name,
        unitId: selectedUnit.id,
        unitNumber: selectedUnit.unitNumber,
        typology: selectedUnit.typology.replace('_', ' '),
        carpetAreaSqft: selectedUnit.carpetAreaSqft,
        basePriceInr: Number(basePrice),
        plcInr: Number(plc),
        parkingChargesInr: Number(parkingCharges),
        agreedTotalPriceInr: totalAgreementValue,
        tokenAmountInr: Number(tokenAmount),
        paymentMode,
        paymentReference: paymentReference.trim(),
        bankName: bankName.trim(),
        bookingDate,
        assignedExecutiveName: assignedExecutive,
        status: bookingStatus,
        specialConditions: specialConditions.trim() || undefined,
      });

      if (onBookingSuccess) {
        onBookingSuccess(created);
      }
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create booking.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">
                Execute Property Allotment & Booking
              </h2>
              <p className="text-xs text-slate-300">
                Generate formal commercial agreement and assign residential unit
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
          {formError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          {/* Section 1: Customer Lead Selection */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-amber-600" />
              1. Customer Allottee
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Search & Select Lead <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedLeadId}
                    onChange={e => {
                      setSelectedLeadId(e.target.value);
                      const lead = leads.find(l => l.id === e.target.value);
                      if (lead?.projectId) {
                        setSelectedProjectId(lead.projectId);
                      }
                    }}
                    required
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="">-- Choose Customer Lead --</option>
                    {leads.map(lead => (
                      <option key={lead.id} value={lead.id}>
                        {lead.firstName} {lead.lastName} ({lead.phone}) — {lead.currentStage}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedLead && (
                <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs flex flex-col justify-center">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{selectedLead.firstName} {selectedLead.lastName}</span>
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-medium border border-emerald-200">
                      {selectedLead.currentStage.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-slate-500 mt-0.5">Phone: {selectedLead.phone}</p>
                  <p className="text-slate-500">Budget: {formatIndianCurrency(selectedLead.budgetMaxInr)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Property & Inventory Unit Selection */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
              <Building className="w-4 h-4 text-amber-600" />
              2. Project, Tower & Unit Inventory
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Project Select */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Project <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedProjectId}
                  onChange={e => handleProjectChange(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="">-- Select Project --</option>
                  {projects.map(proj => (
                    <option key={proj.id} value={proj.id}>
                      {proj.name} ({proj.city})
                    </option>
                  ))}
                </select>
              </div>

              {/* Tower Select */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Tower / Wing <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedTowerId}
                  onChange={e => handleTowerChange(e.target.value)}
                  disabled={!selectedProjectId}
                  required
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">-- Select Tower --</option>
                  {availableTowers.map(twr => (
                    <option key={twr.id} value={twr.id}>
                      {twr.name} ({twr.totalFloors} floors)
                    </option>
                  ))}
                </select>
              </div>

              {/* Unit Select (ONLY AVAILABLE UNITS) */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Available Unit <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedUnitId}
                  onChange={e => setSelectedUnitId(e.target.value)}
                  disabled={!selectedTowerId || availableUnits.length === 0}
                  required
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 font-medium"
                >
                  <option value="">
                    {availableUnits.length === 0
                      ? selectedTowerId
                        ? 'No available units in tower'
                        : '-- Select Tower First --'
                      : `-- Select Unit (${availableUnits.length} available) --`}
                  </option>
                  {availableUnits.map(u => (
                    <option key={u.id} value={u.id}>
                      Unit {u.unitNumber} • {u.typology.replace('_', ' ')} • {u.carpetAreaSqft} sqft ({formatIndianCurrency(u.totalPriceInr)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedUnit && (
              <div className="mt-3 p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <span className="text-slate-500">Typology:</span>
                  <p className="font-bold text-slate-900">{selectedUnit.typology.replace('_', ' ')}</p>
                </div>
                <div>
                  <span className="text-slate-500">Floor & Facing:</span>
                  <p className="font-bold text-slate-900">Floor {selectedUnit.floorNumber} • {selectedUnit.facing}</p>
                </div>
                <div>
                  <span className="text-slate-500">Carpet Area:</span>
                  <p className="font-bold text-slate-900">{selectedUnit.carpetAreaSqft} sq. ft.</p>
                </div>
                <div>
                  <span className="text-slate-500">Catalog Price:</span>
                  <p className="font-bold text-amber-900">{formatIndianCurrency(selectedUnit.totalPriceInr)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Commercial Consideration & Pricing Breakdown */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-600" />
              3. Commercial Consideration Breakdown (INR)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Base Price (₹)
                </label>
                <input
                  type="number"
                  value={basePrice}
                  onChange={e => setBasePrice(Number(e.target.value))}
                  min={0}
                  step="any"
                  required
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-0.5">{formatIndianCurrency(basePrice)}</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Preferential Location Charges (PLC) (₹)
                </label>
                <input
                  type="number"
                  value={plc}
                  onChange={e => setPlc(Number(e.target.value))}
                  min={0}
                  step="any"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-0.5">{formatIndianCurrency(plc)}</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Parking Charges (₹)
                </label>
                <input
                  type="number"
                  value={parkingCharges}
                  onChange={e => setParkingCharges(Number(e.target.value))}
                  min={0}
                  step="any"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-0.5">{formatIndianCurrency(parkingCharges)}</p>
              </div>
            </div>

            {/* Total Agreement Value Card */}
            <div className="bg-slate-900 text-white p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Total Agreement Value (AV)</p>
                <p className="text-xs text-amber-400 font-normal">Base + PLC + Parking (exclusive of Stamp Duty & GST)</p>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold font-mono text-amber-300">
                  {formatIndianCurrency(totalAgreementValue)}
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Token & Payment Details */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-600" />
              4. Payment & Token Consideration
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Token Amount Received (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  value={tokenAmount}
                  onChange={e => setTokenAmount(Number(e.target.value))}
                  min={0}
                  step="any"
                  required
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono font-semibold"
                />
                <p className="text-[11px] text-emerald-700 font-medium mt-0.5">{formatIndianCurrency(tokenAmount)}</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Payment Mode <span className="text-rose-500">*</span>
                </label>
                <select
                  value={paymentMode}
                  onChange={e => setPaymentMode(e.target.value as any)}
                  required
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="neft_rtgs">NEFT / RTGS</option>
                  <option value="cheque">Cheque</option>
                  <option value="demand_draft">Demand Draft (DD)</option>
                  <option value="upi">UPI / Instant Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Payment Ref / Cheque No. <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={e => setPaymentReference(e.target.value)}
                  placeholder="e.g. UTR8472910482 / CHQ 004128"
                  required
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  placeholder="e.g. HDFC Bank, ICICI Bank"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Booking Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={bookingDate}
                  onChange={e => setBookingDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Booking Status
                </label>
                <select
                  value={bookingStatus}
                  onChange={e => setBookingStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium"
                >
                  <option value="token_received">Token Received (Unit Reserved)</option>
                  <option value="confirmed">Confirmed Allotment (Unit Sold)</option>
                  <option value="pending">Pending Verification</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Assigned Closing Executive <span className="text-rose-500">*</span>
                </label>
                <select
                  value={assignedExecutive}
                  onChange={e => setAssignedExecutive(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  {salesExecutives.map(exec => (
                    <option key={exec} value={exec}>
                      {exec}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Special Allotment Remarks / Notes
                </label>
                <input
                  type="text"
                  value={specialConditions}
                  onChange={e => setSpecialConditions(e.target.value)}
                  placeholder="e.g. 10% subvention payment scheme; includes modular kitchen"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm & Issue Booking</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
