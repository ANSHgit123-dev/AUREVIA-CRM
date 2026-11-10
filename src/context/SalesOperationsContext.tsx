import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  SiteVisit,
  SiteVisitStatus,
  SiteVisitType,
  Booking,
  BookingStatus,
} from '../types';
import { MOCK_SITE_VISITS, MOCK_BOOKINGS } from '../lib/mockData';
import { useLeads } from './LeadContext';
import { useProjectInventory } from './ProjectInventoryContext';
import { useAuth } from './AuthContext';
import { formatIndianCurrency, formatDate } from '../lib/formatters';
import { supabase, isSupabaseConfigured, isMockFallbackEnabled } from '../lib/supabase';

export interface SiteVisitStats {
  total: number;
  todayCount: number;
  upcomingCount: number;
  completedCount: number;
  cancelledCount: number;
  noShowCount: number;
}

export interface BookingStats {
  total: number;
  pendingCount: number;
  tokenReceivedCount: number;
  confirmedCount: number;
  cancelledCount: number;
  totalTokenInr: number;
  totalBookingValueInr: number;
}

interface SalesOperationsContextType {
  siteVisits: SiteVisit[];
  bookings: Booking[];
  siteVisitStats: SiteVisitStats;
  bookingStats: BookingStats;
  isLoading: boolean;
  error: string | null;

  // Site Visit Actions
  scheduleSiteVisit: (data: Omit<SiteVisit, 'id' | 'createdAt'>) => Promise<SiteVisit>;
  updateSiteVisit: (id: string, updates: Partial<SiteVisit>) => Promise<void>;
  completeSiteVisit: (id: string, rating: number, outcome: string) => Promise<void>;
  cancelSiteVisit: (id: string, reason: string) => Promise<void>;
  rescheduleSiteVisit: (id: string, newDate: string, notes?: string) => Promise<void>;

  // Booking Actions
  createBooking: (data: Omit<Booking, 'id' | 'bookingReference' | 'createdAt'>) => Promise<Booking>;
  updateBookingStatus: (id: string, newStatus: BookingStatus, notes?: string) => Promise<void>;
  cancelBooking: (id: string, reason: string, refundAmount?: number) => Promise<void>;
  getBookingById: (id: string) => Booking | undefined;
  refreshSalesOperations: () => Promise<void>;
}

const SalesOperationsContext = createContext<SalesOperationsContextType | undefined>(undefined);

const SITE_VISITS_STORAGE_KEY = 'aurevia_site_visits_v2';
const BOOKINGS_STORAGE_KEY = 'aurevia_bookings_v2';

export const SalesOperationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { updateLeadStage, updateLead, logContactHistory } = useLeads();
  const { updateUnitStatus, releaseUnit } = useProjectInventory();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [siteVisits, setSiteVisits] = useState<SiteVisit[]>(() => {
    if (isSupabaseConfigured && !isMockFallbackEnabled) return [];
    try {
      const saved = localStorage.getItem(SITE_VISITS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : MOCK_SITE_VISITS;
    } catch {
      return MOCK_SITE_VISITS;
    }
  });

  const [bookings, setBookings] = useState<Booking[]>(() => {
    if (isSupabaseConfigured && !isMockFallbackEnabled) return [];
    try {
      const saved = localStorage.getItem(BOOKINGS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : MOCK_BOOKINGS;
    } catch {
      return MOCK_BOOKINGS;
    }
  });

  // LocalStorage Persistence only for offline / demo mode
  useEffect(() => {
    if (isSupabaseConfigured && !isMockFallbackEnabled) return;
    try {
      localStorage.setItem(SITE_VISITS_STORAGE_KEY, JSON.stringify(siteVisits));
    } catch (e) {
      console.warn('Failed to save site visits to localStorage:', e);
    }
  }, [siteVisits]);

  useEffect(() => {
    if (isSupabaseConfigured && !isMockFallbackEnabled) return;
    try {
      localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(bookings));
    } catch (e) {
      console.warn('Failed to save bookings to localStorage:', e);
    }
  }, [bookings]);

  // Supabase Live Fetch (Phase 6.2.4: Clears stale mock data on empty array & surfaces errors)
  const refreshSalesOperations = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;

    setIsLoading(true);
    setError(null);

    try {
      const [visitsRes, bookingsRes] = await Promise.all([
        supabase.from('site_visits').select('*').order('scheduled_at', { ascending: true }),
        supabase.from('bookings').select('*').order('created_at', { ascending: false }),
      ]);

      if (visitsRes.error) {
        if (!isMockFallbackEnabled) {
          setError(`Failed to load site visits: ${visitsRes.error.message}`);
        }
      } else if (visitsRes.data) {
        if (visitsRes.data.length === 0 && isMockFallbackEnabled) {
          setSiteVisits(prev => (prev.length > 0 ? prev : MOCK_SITE_VISITS));
        } else {
          const liveVisits: SiteVisit[] = visitsRes.data.map(v => ({
            id: v.id,
            leadId: v.lead_id,
            leadName: v.lead_name || 'Client',
            leadPhone: v.lead_phone || '',
            projectId: v.project_id,
            projectName: v.project_name || 'Aurevia Grand Reserve',
            assignedExecutiveName: v.assigned_executive_name || 'Sales Executive',
            visitDate: v.scheduled_at,
            visitType: (v.visit_type as SiteVisitType) || 'site_visit',
            status: (v.status as SiteVisitStatus) || 'scheduled',
            meetingLocation: v.meeting_location,
            remarks: v.remarks || '',
            rating: v.customer_feedback_rating,
            outcome: v.executive_notes,
            completedAt: v.completed_at,
            cancelledAt: v.cancelled_at,
            cancellationReason: v.cancellation_reason,
            createdAt: v.created_at,
          }));
          setSiteVisits(liveVisits);
        }
      }

      if (bookingsRes.error) {
        if (!isMockFallbackEnabled) {
          setError(prev => (prev ? `${prev}; Failed to load bookings: ${bookingsRes.error!.message}` : `Failed to load bookings: ${bookingsRes.error!.message}`));
        }
      } else if (bookingsRes.data) {
        if (bookingsRes.data.length === 0 && isMockFallbackEnabled) {
          setBookings(prev => (prev.length > 0 ? prev : MOCK_BOOKINGS));
        } else {
          const liveBookings: Booking[] = bookingsRes.data.map(b => ({
            id: b.id,
            bookingReference: b.booking_reference,
            leadId: b.lead_id,
            leadName: b.lead_name || 'Client',
            leadPhone: b.lead_phone || '',
            leadEmail: b.lead_email,
            projectId: b.project_id,
            projectName: b.project_name || 'Aurevia Grand Reserve',
            towerId: b.tower_id || '',
            towerName: b.tower_name || 'Tower A',
            unitId: b.unit_id,
            unitNumber: b.unit_number || 'A-101',
            typology: b.typology || '3_BHK',
            carpetAreaSqft: Number(b.carpet_area_sqft) || 1850,
            basePriceInr: Number(b.base_price_inr) || 24500000,
            plcInr: Number(b.plc_inr) || 500000,
            parkingChargesInr: Number(b.parking_charges_inr) || 1000000,
            agreedTotalPriceInr: Number(b.agreed_total_price_inr) || 26000000,
            tokenAmountInr: Number(b.token_amount_inr) || 1000000,
            paymentMode: b.payment_mode || 'neft_rtgs',
            paymentReference: b.payment_reference || '',
            bankName: b.bank_name,
            bookingDate: b.booking_date || b.created_at,
            assignedExecutiveName: b.assigned_executive_name || 'Sales Executive',
            status: (b.status as BookingStatus) || 'token_received',
            specialConditions: b.special_conditions,
            cancelledAt: b.cancelled_at,
            cancellationReason: b.cancellation_reason,
            refundAmountInr: Number(b.refund_amount_inr) || 0,
            createdAt: b.created_at,
          }));
          setBookings(liveBookings);
        }
      }
    } catch (err: any) {
      if (!isMockFallbackEnabled) {
        setError(err?.message || 'Failed to fetch sales operations data.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSalesOperations();
  }, [refreshSalesOperations, user]);

  // =========================================================================
  // SITE VISIT OPERATIONS (Phase 6.2.4: Atomic rollback on partial failure)
  // =========================================================================
  const scheduleSiteVisit = async (data: Omit<SiteVisit, 'id' | 'createdAt'>): Promise<SiteVisit> => {
    let newVisit: SiteVisit = {
      ...data,
      id: `sv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured && !isMockFallbackEnabled && supabase) {
      const { data: svData, error: visitErr } = await supabase.from('site_visits').insert({
        project_id: data.projectId,
        project_name: data.projectName,
        lead_id: data.leadId,
        lead_name: data.leadName,
        lead_phone: data.leadPhone,
        assigned_executive_name: data.assignedExecutiveName,
        scheduled_at: data.visitDate,
        visit_type: data.visitType,
        meeting_location: data.meetingLocation,
        remarks: data.remarks,
        status: data.status,
      }).select().single();

      if (visitErr || !svData) {
        throw new Error(`Failed to schedule site visit in database: ${visitErr?.message || 'Insert failed'}`);
      }

      newVisit.id = svData.id;

      // Update lead stage with rollback guard to avoid misleading partial success
      try {
        await updateLeadStage(
          data.leadId,
          'site_visit_scheduled',
          `Inspection scheduled for ${formatDate(data.visitDate)} at ${data.meetingLocation || data.projectName}`
        );
      } catch (leadStageErr: any) {
        // Roll back the site visit insert
        await supabase.from('site_visits').delete().eq('id', svData.id);
        throw new Error(`Failed to update lead stage for site visit: ${leadStageErr?.message || 'Lead update failed'}. Site visit rolled back.`);
      }
    } else {
      // Offline Demo Mode
      await updateLeadStage(
        data.leadId,
        'site_visit_scheduled',
        `Inspection scheduled for ${formatDate(data.visitDate)} at ${data.meetingLocation || data.projectName}`
      );
    }

    setSiteVisits(prev => [newVisit, ...prev]);
    return newVisit;
  };

  const updateSiteVisit = async (id: string, updates: Partial<SiteVisit>) => {
    if (isSupabaseConfigured && !isMockFallbackEnabled && supabase) {
      const dbUpdates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.visitDate !== undefined) dbUpdates.scheduled_at = updates.visitDate;
      if (updates.remarks !== undefined) dbUpdates.remarks = updates.remarks;
      if (updates.rating !== undefined) dbUpdates.customer_feedback_rating = updates.rating;
      if (updates.outcome !== undefined) dbUpdates.executive_notes = updates.outcome;
      if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt;
      if (updates.cancelledAt !== undefined) dbUpdates.cancelled_at = updates.cancelledAt;
      if (updates.cancellationReason !== undefined) dbUpdates.cancellation_reason = updates.cancellationReason;

      const { data: updatedRows, error: updateErr } = await supabase
        .from('site_visits')
        .update(dbUpdates)
        .eq('id', id)
        .select();

      if (updateErr) {
        throw new Error(`Failed to update site visit in database: ${updateErr.message}`);
      }
      if (!updatedRows || updatedRows.length === 0) {
        throw new Error('Permission denied or site visit not found: Update rejected by security policy.');
      }
    }

    setSiteVisits(prev =>
      prev.map(v => (v.id === id ? { ...v, ...updates } : v))
    );
  };

  const completeSiteVisit = async (id: string, rating: number, outcome: string) => {
    const visit = siteVisits.find(v => v.id === id);
    if (!visit) return;

    const completedAt = new Date().toISOString();

    await updateSiteVisit(id, {
      status: 'completed',
      rating,
      outcome,
      completedAt,
    });

    await updateLeadStage(
      visit.leadId,
      'site_visit_conducted',
      `Site inspection conducted. Rating: ${rating}/5 — Outcome: ${outcome}`
    );

    await logContactHistory(visit.leadId, {
      type: 'site_visit',
      summary: `Conducted ${visit.visitType.replace('_', ' ')} for ${visit.projectName}. Rating: ${rating}/5`,
      outcome,
      performedBy: visit.assignedExecutiveName,
      date: completedAt,
    });
  };

  const cancelSiteVisit = async (id: string, reason: string) => {
    const visit = siteVisits.find(v => v.id === id);
    if (!visit) return;

    await updateSiteVisit(id, {
      status: 'cancelled',
      cancellationReason: reason,
      cancelledAt: new Date().toISOString(),
    });
  };

  const rescheduleSiteVisit = async (id: string, newDate: string, notes?: string) => {
    const visit = siteVisits.find(v => v.id === id);
    if (!visit) return;

    await updateSiteVisit(id, {
      visitDate: newDate,
      status: 'scheduled',
      remarks: notes ? `${visit.remarks} [Rescheduled: ${notes}]` : visit.remarks,
    });

    await updateLead(visit.leadId, {
      nextFollowUpAt: newDate,
    });
  };

  // =========================================================================
  // ATOMIC BOOKING CREATION & TRANSACTION INTEGRITY (Phase 6.2.4 Hardened)
  // Single Authority: create_booking_atomic handles units, leads, and bookings.
  // No redundant client-side writes after RPC success.
  // =========================================================================
  const createBooking = async (
    data: Omit<Booking, 'id' | 'bookingReference' | 'createdAt'>
  ): Promise<Booking> => {
    // 1. Double Booking Guard: Verify unit isn't already booked in active memory
    const existingActiveBooking = bookings.find(
      b => b.unitId === data.unitId && b.status !== 'cancelled' && b.status !== 'refunded'
    );
    if (existingActiveBooking) {
      throw new Error(
        `Unit ${data.unitNumber} is already reserved/booked under reference ${existingActiveBooking.bookingReference}.`
      );
    }

    let newBooking: Booking;

    if (isSupabaseConfigured && !isMockFallbackEnabled && supabase) {
      // Execute Atomic Database Stored Procedure with row-level unit locking (HIGH-02 & Phase 6.2.4)
      const { data: rpcResult, error: rpcError } = await supabase.rpc('create_booking_atomic', {
        p_project_id: data.projectId,
        p_tower_id: data.towerId,
        p_unit_id: data.unitId,
        p_lead_id: data.leadId,
        p_token_amount: data.tokenAmountInr,
        p_agreed_price: data.agreedTotalPriceInr,
        p_payment_mode: data.paymentMode,
        p_payment_reference: data.paymentReference || null,
        p_bank_name: data.bankName || null,
        p_special_conditions: data.specialConditions || null,
      });

      if (rpcError || !rpcResult?.success) {
        throw new Error(
          rpcError?.message || 'Database booking transaction failed. Target unit may no longer be available.'
        );
      }

      // Fetch canonical booking record directly from database (Phase 6.2.4)
      const { data: canonicalRow, error: fetchErr } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', rpcResult.booking_id)
        .single();

      if (canonicalRow && !fetchErr) {
        newBooking = {
          id: canonicalRow.id,
          bookingReference: canonicalRow.booking_reference,
          leadId: canonicalRow.lead_id,
          leadName: canonicalRow.lead_name || data.leadName,
          leadPhone: canonicalRow.lead_phone || data.leadPhone,
          leadEmail: canonicalRow.lead_email || data.leadEmail,
          projectId: canonicalRow.project_id,
          projectName: canonicalRow.project_name || data.projectName,
          towerId: canonicalRow.tower_id || data.towerId,
          towerName: canonicalRow.tower_name || data.towerName,
          unitId: canonicalRow.unit_id,
          unitNumber: canonicalRow.unit_number || data.unitNumber,
          typology: canonicalRow.typology || data.typology,
          carpetAreaSqft: Number(canonicalRow.carpet_area_sqft) || data.carpetAreaSqft,
          basePriceInr: Number(canonicalRow.base_price_inr) || data.basePriceInr,
          plcInr: Number(canonicalRow.plc_inr) || data.plcInr,
          parkingChargesInr: Number(canonicalRow.parking_charges_inr) || data.parkingChargesInr,
          agreedTotalPriceInr: Number(canonicalRow.agreed_total_price_inr) || data.agreedTotalPriceInr,
          tokenAmountInr: Number(canonicalRow.token_amount_inr) || data.tokenAmountInr,
          paymentMode: canonicalRow.payment_mode || data.paymentMode,
          paymentReference: canonicalRow.payment_reference || data.paymentReference,
          bankName: canonicalRow.bank_name || data.bankName,
          bookingDate: canonicalRow.booking_date || canonicalRow.created_at,
          assignedExecutiveName: canonicalRow.assigned_executive_name || data.assignedExecutiveName,
          status: (canonicalRow.status as BookingStatus) || 'token_received',
          specialConditions: canonicalRow.special_conditions || data.specialConditions,
          createdAt: canonicalRow.created_at,
        };
      } else {
        // Fall back to rpc canonical payload
        newBooking = {
          ...data,
          id: rpcResult.booking_id,
          bookingReference: rpcResult.booking_reference,
          status: 'token_received',
          createdAt: new Date().toISOString(),
        };
      }
      // Note: In Supabase mode, the RPC is the single authority that updated the unit and lead!
      // No duplicate client-side writes are performed.
    } else {
      // Offline Demo Mode
      const currentYear = new Date().getFullYear();
      const sequenceNumber = String(bookings.length + 42).padStart(4, '0');
      const bookingReference = `AUR-BK-${currentYear}-${sequenceNumber}`;

      newBooking = {
        ...data,
        id: `bk-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        bookingReference,
        status: 'token_received',
        createdAt: new Date().toISOString(),
      };

      // In offline demo mode, update local memory state
      await updateUnitStatus(newBooking.unitId, 'booked');
      await updateLeadStage(
        newBooking.leadId,
        'token_paid',
        `Allotment issued for Unit ${newBooking.unitNumber} (${newBooking.projectName}). Token: ${formatIndianCurrency(newBooking.tokenAmountInr)}`
      );
    }

    // Commit to state only after database transaction success (CRIT-03)
    setBookings(prev => [newBooking, ...prev]);
    return newBooking;
  };

  // Transactional booking status update (Phase 6.2.4)
  const updateBookingStatus = async (id: string, newStatus: BookingStatus, notes?: string) => {
    const booking = bookings.find(b => b.id === id);
    if (!booking) return;

    if (isSupabaseConfigured && !isMockFallbackEnabled && supabase) {
      // Call transactional stored procedure that keeps units, leads, and bookings synchronized
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('update_booking_status_transactional', {
        p_booking_id: id,
        p_new_status: newStatus,
        p_notes: notes || null,
      });

      if (rpcErr || !rpcRes?.success) {
        throw new Error(`Failed to update booking status in database: ${rpcErr?.message || 'Transaction rejected'}`);
      }
    } else {
      // Offline demo mode
      if (newStatus === 'confirmed') {
        await updateUnitStatus(booking.unitId, 'sold');
        await updateLeadStage(booking.leadId, 'booked', `Booking confirmed under Ref: ${booking.bookingReference}${notes ? ` — ${notes}` : ''}`);
      } else if (newStatus === 'token_received') {
        await updateUnitStatus(booking.unitId, 'booked');
        await updateLeadStage(booking.leadId, 'token_paid', `Token received: ${formatIndianCurrency(booking.tokenAmountInr)}`);
      } else if (newStatus === 'cancelled' || newStatus === 'refunded') {
        await releaseUnit(booking.unitId);
        await updateLeadStage(booking.leadId, 'negotiation', `Booking ${booking.bookingReference} cancelled/refunded. Unit released.`);
      }
    }

    setBookings(prev =>
      prev.map(b => (b.id === id ? { ...b, status: newStatus } : b))
    );
  };

  // Transactional booking cancellation (Phase 6.2.4)
  const cancelBooking = async (id: string, reason: string, refundAmount?: number) => {
    const booking = bookings.find(b => b.id === id);
    if (!booking) return;

    const cancelledAt = new Date().toISOString();

    if (isSupabaseConfigured && !isMockFallbackEnabled && supabase) {
      // Call transactional stored procedure that cancels booking, releases unit, and updates lead stage
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('cancel_booking_transactional', {
        p_booking_id: id,
        p_cancellation_reason: reason,
        p_refund_amount: refundAmount || 0,
      });

      if (rpcErr || !rpcRes?.success) {
        throw new Error(`Failed to cancel booking in database: ${rpcErr?.message || 'Transaction failed'}`);
      }
    } else {
      // Offline demo mode
      await releaseUnit(booking.unitId);
      await updateLeadStage(
        booking.leadId,
        'negotiation',
        `Booking ${booking.bookingReference} cancelled. Unit ${booking.unitNumber} restored to inventory.`
      );
    }

    setBookings(prev =>
      prev.map(b =>
        b.id === id
          ? {
              ...b,
              status: 'cancelled',
              cancellationReason: reason,
              cancelledAt,
              refundAmountInr: refundAmount || 0,
            }
          : b
      )
    );
  };

  const getBookingById = (id: string): Booking | undefined => {
    return bookings.find(b => b.id === id);
  };

  // Stats calculations
  const siteVisitStats: SiteVisitStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    let todayCount = 0;
    let upcomingCount = 0;
    let completedCount = 0;
    let cancelledCount = 0;
    let noShowCount = 0;

    for (const v of siteVisits) {
      if (v.status === 'completed') completedCount++;
      else if (v.status === 'cancelled') cancelledCount++;
      else if (v.status === 'no_show') noShowCount++;
      else if (v.status === 'scheduled' || v.status === 'confirmed') {
        const visitDateStr = v.visitDate ? v.visitDate.split('T')[0] : '';
        if (visitDateStr === todayStr) todayCount++;
        else upcomingCount++;
      }
    }

    return {
      total: siteVisits.length,
      todayCount,
      upcomingCount,
      completedCount,
      cancelledCount,
      noShowCount,
    };
  }, [siteVisits]);

  const bookingStats: BookingStats = useMemo(() => {
    let pendingCount = 0;
    let tokenReceivedCount = 0;
    let confirmedCount = 0;
    let cancelledCount = 0;
    let totalTokenInr = 0;
    let totalBookingValueInr = 0;

    for (const b of bookings) {
      if (b.status === 'pending') pendingCount++;
      else if (b.status === 'token_received') {
        tokenReceivedCount++;
        totalTokenInr += b.tokenAmountInr;
        totalBookingValueInr += b.agreedTotalPriceInr;
      } else if (b.status === 'confirmed') {
        confirmedCount++;
        totalTokenInr += b.tokenAmountInr;
        totalBookingValueInr += b.agreedTotalPriceInr;
      } else if (b.status === 'cancelled' || b.status === 'refunded') {
        cancelledCount++;
      }
    }

    return {
      total: bookings.length,
      pendingCount,
      tokenReceivedCount,
      confirmedCount,
      cancelledCount,
      totalTokenInr,
      totalBookingValueInr,
    };
  }, [bookings]);

  const value = {
    siteVisits,
    bookings,
    siteVisitStats,
    bookingStats,
    isLoading,
    error,
    scheduleSiteVisit,
    updateSiteVisit,
    completeSiteVisit,
    cancelSiteVisit,
    rescheduleSiteVisit,
    createBooking,
    updateBookingStatus,
    cancelBooking,
    getBookingById,
    refreshSalesOperations,
  };

  return (
    <SalesOperationsContext.Provider value={value}>
      {children}
    </SalesOperationsContext.Provider>
  );
};

export const useSalesOperations = () => {
  const context = useContext(SalesOperationsContext);
  if (!context) {
    throw new Error('useSalesOperations must be used within a SalesOperationsProvider');
  }
  return context;
};
