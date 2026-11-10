export type UserRole = 
  | 'company_admin' 
  | 'director' 
  | 'sales_manager' 
  | 'presales_agent' 
  | 'sales_executive' 
  | 'booking_operations'
  | 'super_admin'; // Backwards compatibility alias for company_admin

export interface UserProfile {
  id: string;
  orgId: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  isActive: boolean;
  managerId?: string;
  managerName?: string;
  assignedProjectIds: string[];
  createdAt: string;
  avatarUrl?: string;
}

export type PipelineStage = 
  | 'new' 
  | 'contacted' 
  | 'qualified'
  | 'site_visit_scheduled' 
  | 'site_visit_conducted' 
  | 'negotiation' 
  | 'token_paid' 
  | 'booked' 
  | 'lost';

export type LeadSource =
  | 'website'
  | 'google_ads'
  | 'meta_ads'
  | '99acres'
  | 'magicbricks'
  | 'channel_partner'
  | 'walk_in'
  | 'referral'
  | 'other'
  | 'google_search'
  | 'real_estate_portal';

export interface LeadNote {
  id: string;
  leadId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface ContactHistoryItem {
  id: string;
  leadId: string;
  type: 'call' | 'whatsapp' | 'email' | 'meeting' | 'site_visit';
  summary: string;
  performedBy: string;
  date: string;
  outcome?: string;
}

export interface Lead {
  id: string;
  orgId: string;
  projectId: string;
  projectName: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  budgetMinInr: number;
  budgetMaxInr: number;
  preferredTypology: string;
  source: LeadSource;
  priority: 'hot' | 'warm' | 'cold';
  currentStage: PipelineStage;
  assignedExecutiveName: string;
  createdAt: string;
  lastContactedAt?: string;
  nextFollowUpAt?: string;
  city?: string;
  notes?: LeadNote[];
  contactHistory?: ContactHistoryItem[];
}

export interface Activity {
  id: string;
  leadId: string;
  leadName: string;
  actorName: string;
  activityType: 'phone_call' | 'whatsapp_message' | 'site_visit_update' | 'stage_change' | 'internal_note';
  title: string;
  description: string;
  createdAt: string;
}

export type SiteVisitType = 'site_visit' | 'virtual_tour' | 'show_flat_visit';
export type SiteVisitStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

export interface SiteVisit {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  projectId: string;
  projectName: string;
  assignedExecutiveName: string;
  visitDate: string;
  visitType: SiteVisitType;
  status: SiteVisitStatus;
  meetingLocation?: string;
  remarks: string;
  rating?: number;
  outcome?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  createdAt: string;
}

export type BookingStatus = 'pending' | 'token_received' | 'confirmed' | 'cancelled' | 'refunded';

export interface Booking {
  id: string;
  bookingReference: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  leadEmail?: string;
  projectId: string;
  projectName: string;
  towerId: string;
  towerName: string;
  unitId: string;
  unitNumber: string;
  typology: string;
  carpetAreaSqft: number;
  basePriceInr: number;
  plcInr: number;
  parkingChargesInr: number;
  agreedTotalPriceInr: number;
  tokenAmountInr: number;
  paymentMode: 'neft_rtgs' | 'cheque' | 'demand_draft' | 'upi';
  paymentReference: string;
  bankName?: string;
  bookingDate: string;
  assignedExecutiveName: string;
  status: BookingStatus;
  specialConditions?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  refundAmountInr?: number;
  createdAt: string;
}

export type FollowUpActivityType = 
  | 'phone_call' 
  | 'whatsapp_message' 
  | 'in_person_meeting' 
  | 'site_visit' 
  | 'email';

export type FollowUpStatus = 'pending' | 'overdue' | 'completed' | 'cancelled';

export interface FollowUpTask {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  assignedExecutiveName: string;
  projectName?: string;
  scheduledFor: string;
  activityType: FollowUpActivityType;
  status: FollowUpStatus;
  priority: 'hot' | 'warm' | 'cold';
  remarks: string;
  completedAt?: string;
  completionOutcome?: string;
  createdAt: string;
}

export interface ExecutivePerformance {
  executiveName: string;
  assignedLeads: number;
  contactedLeads: number;
  qualifiedLeads: number;
  siteVisitsGenerated: number;
  bookingsAchieved: number;
  pendingFollowUps: number;
  overdueFollowUps: number;
  conversionRate: number;
  totalSalesValueInr: number;
}

// ============================================================================
// PHASE 2: PROJECT & INVENTORY MANAGEMENT TYPES
// ============================================================================

export type ProjectStatus = 
  | 'planning' 
  | 'pre_launch' 
  | 'under_construction' 
  | 'ready_to_move' 
  | 'sold_out';

export interface Project {
  id: string;
  orgId: string;
  name: string;
  code: string;
  reraNumber: string;
  locationArea: string;
  city: string;
  projectType: string;
  description: string;
  configurations: string[];
  totalAreaAcres: number;
  totalUnits: number;
  status: ProjectStatus;
  launchDate: string;
  expectedCompletion: string;
  coverImageUrl?: string;
}

export interface Tower {
  id: string;
  projectId: string;
  name: string;
  totalFloors: number;
  totalUnits: number;
  reraPhaseNumber?: string;
}

export type UnitStatus = 'available' | 'reserved' | 'booked' | 'sold';

export type UnitTypology = 
  | '1_BHK' 
  | '2_BHK' 
  | '2.5_BHK' 
  | '3_BHK' 
  | '3.5_BHK' 
  | '4_BHK' 
  | 'penthouse' 
  | 'duplex';

export interface Unit {
  id: string;
  orgId: string;
  projectId: string;
  projectName: string;
  towerId: string;
  towerName: string;
  unitNumber: string;
  floorNumber: number;
  typology: UnitTypology;
  facing: string;
  carpetAreaSqft: number;
  superBuiltupAreaSqft: number;
  basePriceInr: number;
  plcInr: number;
  parkingChargesInr: number;
  totalPriceInr: number;
  status: UnitStatus;
  floorPlanUrl?: string;
  reservedBy?: string;
  reservedLeadName?: string;
  reservedUntil?: string;
}
