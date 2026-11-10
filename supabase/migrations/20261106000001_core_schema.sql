-- ============================================================================
-- AUREVIA CRM — 001_CORE_SCHEMA.SQL
-- Multi-Tenant Relational Schema, Composite Isolation, & Invariant Constraints
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE public.user_role AS ENUM (
    'super_admin',
    'director',
    'sales_manager',
    'sales_executive',
    'presales_agent'
);

CREATE TYPE public.project_status AS ENUM (
    'planning',
    'pre_launch',
    'under_construction',
    'ready_to_move',
    'sold_out'
);

CREATE TYPE public.unit_status AS ENUM (
    'available',
    'reserved',
    'token_received',
    'booked',
    'sold',
    'quota_reserved'
);

CREATE TYPE public.unit_typology AS ENUM (
    '1_BHK',
    '2_BHK',
    '2.5_BHK',
    '3_BHK',
    '3.5_BHK',
    '4_BHK',
    'penthouse',
    'duplex'
);

CREATE TYPE public.lead_source AS ENUM (
    'meta_ads',
    'google_search',
    'real_estate_portal',
    'channel_partner',
    'walk_in',
    'referral',
    'corporate_campaign'
);

CREATE TYPE public.lead_priority AS ENUM ('hot', 'warm', 'cold');

CREATE TYPE public.pipeline_stage AS ENUM (
    'new',
    'contacted',
    'site_visit_scheduled',
    'site_visit_conducted',
    'negotiation',
    'token_paid',
    'booked',
    'lost'
);

CREATE TYPE public.activity_type AS ENUM (
    'phone_call',
    'whatsapp_message',
    'in_person_meeting',
    'email_sent',
    'site_visit_update',
    'stage_change',
    'internal_note',
    'cost_sheet_shared'
);

CREATE TYPE public.visit_status AS ENUM (
    'scheduled',
    'confirmed',
    'completed',
    'rescheduled',
    'cancelled',
    'no_show'
);

CREATE TYPE public.task_status AS ENUM ('pending', 'completed', 'overdue', 'cancelled');

CREATE TYPE public.booking_status AS ENUM (
    'token_received',
    'application_form_filled',
    'allotment_issued',
    'agreement_executed',
    'cancelled_refunded'
);

-- Organizations
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    rera_entity_id VARCHAR(100) NOT NULL,
    gstin VARCHAR(15),
    headquarters_city VARCHAR(100) DEFAULT 'Mumbai' NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR' NOT NULL,
    is_synthetic BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Profiles
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    role public.user_role NOT NULL DEFAULT 'sales_executive',
    reports_to UUID,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    monthly_sales_target_inr NUMERIC(15, 2) DEFAULT 0.00 NOT NULL CHECK (monthly_sales_target_inr >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_profiles_org_user UNIQUE (org_id, id),
    CONSTRAINT chk_profile_phone CHECK (phone ~ '^\+?[0-9]{10,15}$'),
    CONSTRAINT chk_profile_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT fk_profiles_reports_to FOREIGN KEY (org_id, reports_to) 
        REFERENCES public.profiles(org_id, id) ON DELETE SET NULL (reports_to)
);

-- Projects
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    rera_number VARCHAR(100) NOT NULL,
    location_area VARCHAR(150) NOT NULL,
    city VARCHAR(100) NOT NULL,
    project_type VARCHAR(50) NOT NULL,
    total_area_acres NUMERIC(6, 2) CHECK (total_area_acres > 0),
    total_units INT DEFAULT 0 NOT NULL CHECK (total_units >= 0),
    status public.project_status DEFAULT 'under_construction' NOT NULL,
    launch_date DATE,
    expected_completion DATE,
    brochure_url TEXT,
    cover_image_url TEXT,
    is_synthetic BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_projects_org_id UNIQUE (org_id, id),
    CONSTRAINT uq_projects_org_code UNIQUE (org_id, code)
);

-- Project Assignments (Project Scoping for Sales Managers)
CREATE TABLE public.project_assignments (
    org_id UUID NOT NULL,
    project_id UUID NOT NULL,
    profile_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (org_id, project_id, profile_id),
    CONSTRAINT fk_pa_project FOREIGN KEY (org_id, project_id) 
        REFERENCES public.projects(org_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_pa_profile FOREIGN KEY (org_id, profile_id) 
        REFERENCES public.profiles(org_id, id) ON DELETE CASCADE
);

-- Towers
CREATE TABLE public.towers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    project_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    total_floors INT NOT NULL CHECK (total_floors > 0),
    total_units INT NOT NULL CHECK (total_units >= 0),
    rera_phase_number VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT fk_towers_project FOREIGN KEY (org_id, project_id) 
        REFERENCES public.projects(org_id, id) ON DELETE CASCADE,
    CONSTRAINT uq_towers_org_project_id UNIQUE (org_id, project_id, id),
    CONSTRAINT uq_towers_project_name UNIQUE (project_id, name)
);

-- Units
CREATE TABLE public.units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    project_id UUID NOT NULL,
    tower_id UUID NOT NULL,
    unit_number VARCHAR(50) NOT NULL,
    floor_number INT NOT NULL,
    typology public.unit_typology NOT NULL,
    facing VARCHAR(50),
    carpet_area_sqft NUMERIC(8, 2) NOT NULL CHECK (carpet_area_sqft > 0),
    super_builtup_area_sqft NUMERIC(8, 2) NOT NULL CHECK (super_builtup_area_sqft >= carpet_area_sqft),
    base_price_inr NUMERIC(14, 2) NOT NULL CHECK (base_price_inr > 0),
    plc_inr NUMERIC(12, 2) DEFAULT 0.00 NOT NULL CHECK (plc_inr >= 0),
    parking_charges_inr NUMERIC(10, 2) DEFAULT 0.00 NOT NULL CHECK (parking_charges_inr >= 0),
    total_price_inr NUMERIC(14, 2) GENERATED ALWAYS AS (
        base_price_inr + plc_inr + parking_charges_inr
    ) STORED,
    status public.unit_status DEFAULT 'available' NOT NULL,
    floor_plan_url TEXT,
    reserved_by UUID,
    reserved_lead_id UUID,
    reserved_at TIMESTAMPTZ,
    reserved_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT fk_units_tower FOREIGN KEY (org_id, project_id, tower_id) 
        REFERENCES public.towers(org_id, project_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_units_reserved_by FOREIGN KEY (org_id, reserved_by)
        REFERENCES public.profiles(org_id, id) ON DELETE SET NULL (reserved_by),
    CONSTRAINT uq_units_org_project_id UNIQUE (org_id, project_id, id),
    CONSTRAINT uq_units_tower_unit UNIQUE (tower_id, unit_number),
    -- Bidirectional Invariant: status = 'reserved' <==> all 4 fields NOT NULL
    CONSTRAINT chk_unit_reservation_exact_coherence CHECK (
        (status = 'reserved' AND 
         reserved_by IS NOT NULL AND 
         reserved_lead_id IS NOT NULL AND 
         reserved_at IS NOT NULL AND 
         reserved_until IS NOT NULL)
        OR
        (status != 'reserved' AND 
         reserved_by IS NULL AND 
         reserved_lead_id IS NULL AND 
         reserved_at IS NULL AND 
         reserved_until IS NULL)
    )
);

-- Leads
CREATE TABLE public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    project_id UUID NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    whatsapp_number VARCHAR(20),
    city VARCHAR(100) DEFAULT 'Mumbai' NOT NULL,
    budget_min_inr NUMERIC(14, 2) CHECK (budget_min_inr >= 0),
    budget_max_inr NUMERIC(14, 2) CHECK (budget_max_inr >= budget_min_inr),
    preferred_typology public.unit_typology,
    source public.lead_source DEFAULT 'walk_in' NOT NULL,
    channel_partner_name VARCHAR(255),
    priority public.lead_priority DEFAULT 'warm' NOT NULL,
    current_stage public.pipeline_stage DEFAULT 'new' NOT NULL,
    assigned_presales_id UUID,
    assigned_sales_executive_id UUID,
    interested_unit_id UUID,
    lost_reason VARCHAR(255),
    last_contacted_at TIMESTAMPTZ,
    next_follow_up_at TIMESTAMPTZ,
    is_synthetic BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT chk_lead_phone CHECK (phone ~ '^\+?[0-9]{10,15}$'),
    CONSTRAINT chk_lead_email CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT fk_leads_project FOREIGN KEY (org_id, project_id) 
        REFERENCES public.projects(org_id, id) ON DELETE RESTRICT,
    CONSTRAINT fk_leads_presales FOREIGN KEY (org_id, assigned_presales_id) 
        REFERENCES public.profiles(org_id, id) ON DELETE SET NULL (assigned_presales_id),
    CONSTRAINT fk_leads_sales_exec FOREIGN KEY (org_id, assigned_sales_executive_id) 
        REFERENCES public.profiles(org_id, id) ON DELETE SET NULL (assigned_sales_executive_id),
    CONSTRAINT fk_leads_interested_unit FOREIGN KEY (org_id, project_id, interested_unit_id) 
        REFERENCES public.units(org_id, project_id, id) ON DELETE SET NULL (interested_unit_id),
    CONSTRAINT uq_leads_org_id UNIQUE (org_id, id),
    CONSTRAINT uq_leads_org_project_id UNIQUE (org_id, project_id, id)
);

ALTER TABLE public.units ADD CONSTRAINT fk_units_reserved_lead 
    FOREIGN KEY (org_id, project_id, reserved_lead_id) 
    REFERENCES public.leads(org_id, project_id, id) ON DELETE SET NULL (reserved_lead_id);

CREATE UNIQUE INDEX uq_active_lead_phone_project 
ON public.leads (org_id, project_id, phone) 
WHERE current_stage NOT IN ('booked', 'lost');

-- Lead Activities (Immutable Append-Only Ledger)
CREATE TABLE public.lead_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    lead_id UUID NOT NULL,
    actor_id UUID NOT NULL,
    activity_type public.activity_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT fk_lead_act_lead FOREIGN KEY (org_id, lead_id) 
        REFERENCES public.leads(org_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_lead_act_actor FOREIGN KEY (org_id, actor_id) 
        REFERENCES public.profiles(org_id, id) ON DELETE RESTRICT
);

-- Site Visits
CREATE TABLE public.site_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    project_id UUID NOT NULL,
    lead_id UUID NOT NULL,
    executive_id UUID NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    visit_type VARCHAR(50) DEFAULT 'first_visit' NOT NULL,
    pickup_required BOOLEAN DEFAULT FALSE NOT NULL,
    pickup_address TEXT,
    status public.visit_status DEFAULT 'scheduled' NOT NULL,
    customer_feedback_rating INT CHECK (customer_feedback_rating BETWEEN 1 AND 5),
    customer_notes TEXT,
    executive_notes TEXT,
    conducted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT fk_site_visits_lead_project FOREIGN KEY (org_id, project_id, lead_id) 
        REFERENCES public.leads(org_id, project_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_site_visits_project FOREIGN KEY (org_id, project_id) 
        REFERENCES public.projects(org_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_site_visits_exec FOREIGN KEY (org_id, executive_id) 
        REFERENCES public.profiles(org_id, id) ON DELETE RESTRICT
);

-- Tasks & Follow-ups
CREATE TABLE public.tasks_and_followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    lead_id UUID NOT NULL,
    assigned_to UUID NOT NULL,
    activity_type public.activity_type NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    status public.task_status DEFAULT 'pending' NOT NULL,
    remarks TEXT,
    completion_outcome TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT fk_tasks_lead FOREIGN KEY (org_id, lead_id) 
        REFERENCES public.leads(org_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_tasks_assigned_to FOREIGN KEY (org_id, assigned_to) 
        REFERENCES public.profiles(org_id, id) ON DELETE RESTRICT
);

-- Bookings
CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    project_id UUID NOT NULL,
    unit_id UUID NOT NULL,
    lead_id UUID NOT NULL,
    closing_executive_id UUID NOT NULL,
    booking_reference VARCHAR(100) NOT NULL,
    token_amount_inr NUMERIC(12, 2) NOT NULL CHECK (token_amount_inr > 0),
    agreed_total_price_inr NUMERIC(14, 2) NOT NULL CHECK (agreed_total_price_inr >= token_amount_inr),
    payment_mode VARCHAR(50) DEFAULT 'neft_rtgs' NOT NULL,
    transaction_reference VARCHAR(100),
    status public.booking_status DEFAULT 'token_received' NOT NULL,
    agreement_date DATE,
    notes TEXT,
    is_synthetic BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT fk_bookings_lead FOREIGN KEY (org_id, project_id, lead_id) 
        REFERENCES public.leads(org_id, project_id, id) ON DELETE RESTRICT,
    CONSTRAINT fk_bookings_unit FOREIGN KEY (org_id, project_id, unit_id) 
        REFERENCES public.units(org_id, project_id, id) ON DELETE RESTRICT,
    CONSTRAINT fk_bookings_exec FOREIGN KEY (org_id, closing_executive_id) 
        REFERENCES public.profiles(org_id, id) ON DELETE RESTRICT,
    CONSTRAINT uq_bookings_org_ref UNIQUE (org_id, booking_reference),
    CONSTRAINT uq_bookings_unit UNIQUE (unit_id)
);

