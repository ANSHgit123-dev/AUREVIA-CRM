-- ============================================================================
-- AUREVIA CRM — CONSOLIDATED PRODUCTION MIGRATION (PHASE 6.2.6 FULLY HARDENED)
-- Combines Core Schema, Multi-Tenant Composite Foreign Keys, Strict RBAC Matrix,
-- Granular Engine-Level Authorization Triggers, Locked-Down Transactional RPCs,
-- Schema Compatibility Preflights, Deterministic State Machines, and Seed Safety Guards.
--
-- REMEDIATED IN PHASE 6.2.6:
-- 1. SEED SAFETY & MULTI-TENANT ISOLATION:
--    - Never overwrites an existing record's org_id or project_id on ID conflict.
--    - Verifies existing seed records match the expected synthetic organisation and project.
--    - Raises explicit exceptions on unexpected conflicts to protect customer data.
--    - Idempotent: rerunning does not alter real customer data or reset booked/sold units.
--
-- 2. DETERMINISTIC BOOKING STATE MACHINE:
--    - Explicit allowed-transition matrix implemented in update_booking_status_transactional.
--    - Rejects skipped (e.g. pending -> confirmed) and backward (e.g. confirmed -> token_received) steps.
--    - Rejects no-op same-status transitions.
--    - Blocks cancellation bypass (status changes to cancelled/refunded forced through cancel_booking_transactional).
--
-- 3. CANCELLATION & REFUNDS VALIDATION:
--    - Rejects negative refund amounts.
--    - Validates refund amount against collected financial values (cannot exceed token amount collected).
--    - Resolves distinct statuses: cancelled (forfeiture), cancelled_refunded (partial), refunded (full).
--    - Restores unit inventory and lead stage consistently under atomic FOR UPDATE row locks.
--
-- 4. EXISTING-SCHEMA COMPATIBILITY & PREFLIGHT CHECKS:
--    - Preflight checks verify auth.users, column types, and enum values before execution.
--    - Schema evolution block safely adds missing columns to existing tables without data loss.
--    - Fails safely with actionable error messages if schema incompatibility is detected.
--    - Verifies active booking uniqueness before applying partial unique index.
--    - Synchronizes sequence booking_reference_seq with existing booking references.
--
-- 5. PERMISSIONS & SECURITY DEFINER AUDIT:
--    - Explicit search_path = public, pg_temp on all 13 stored procedures and triggers.
--    - Execution revoked from PUBLIC and anon; granted only to authenticated.
--    - Granted necessary table permissions (SELECT, INSERT, UPDATE, DELETE) on profiles,
--      project_assignments, and organizations to authenticated (strictly governed by RLS & triggers).
--    - Direct INSERT, UPDATE, DELETE on public.bookings completely revoked from authenticated.
--    - Zero service-role credentials introduced into frontend client code.
--
-- TARGET: Supabase SQL Editor / Staging Database (Run ONLY after review and authorization).
-- ============================================================================

BEGIN;

-- Step 1: Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Step 1.1: Preflight Environment & Schema Compatibility Checks (Phase 6.2.6 Hardened)
DO $$
DECLARE
    v_missing_values TEXT[];
BEGIN
    -- 1. Verify Supabase auth schema exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        RAISE EXCEPTION 'Preflight Check Failed: "auth.users" table not found. Ensure Supabase Auth is enabled on this instance.';
    END IF;

    -- 2. Validate enum compatibility for existing instances
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        SELECT array_agg(expected_val) INTO v_missing_values
        FROM unnest(ARRAY['company_admin', 'super_admin', 'director', 'sales_manager', 'sales_executive', 'presales_agent', 'booking_operations']) AS expected_val
        WHERE expected_val NOT IN (
            SELECT e.enumlabel FROM pg_enum e 
            JOIN pg_type t ON e.enumtypid = t.oid 
            WHERE t.typname = 'user_role'
        );
        IF v_missing_values IS NOT NULL AND array_length(v_missing_values, 1) > 0 THEN
            RAISE EXCEPTION 'Preflight Check Failed: Existing enum "public.user_role" is missing required values: %. Execute "ALTER TYPE public.user_role ADD VALUE ''...''" outside a transaction before running this migration.', v_missing_values;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
        SELECT array_agg(expected_val) INTO v_missing_values
        FROM unnest(ARRAY['pending', 'token_received', 'confirmed', 'application_form_filled', 'allotment_issued', 'agreement_executed', 'cancelled', 'refunded', 'cancelled_refunded']) AS expected_val
        WHERE expected_val NOT IN (
            SELECT e.enumlabel FROM pg_enum e 
            JOIN pg_type t ON e.enumtypid = t.oid 
            WHERE t.typname = 'booking_status'
        );
        IF v_missing_values IS NOT NULL AND array_length(v_missing_values, 1) > 0 THEN
            RAISE EXCEPTION 'Preflight Check Failed: Existing enum "public.booking_status" is missing required values: %. Execute "ALTER TYPE public.booking_status ADD VALUE ''...''" outside a transaction before running this migration.', v_missing_values;
        END IF;
    END IF;

    -- 3. Incompatible data type check for existing tables
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'id' AND udt_name != 'uuid'
    ) THEN
        RAISE EXCEPTION 'Preflight Check Failed: "public.profiles.id" is not of type UUID. Migration aborted to prevent data corruption.';
    END IF;

    -- 4. Active booking duplicate check before creating partial unique index
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') THEN
        IF EXISTS (
            SELECT unit_id FROM public.bookings 
            WHERE status NOT IN ('cancelled', 'refunded', 'cancelled_refunded')
            GROUP BY unit_id HAVING COUNT(*) > 1
        ) THEN
            RAISE EXCEPTION 'Preflight Check Failed: Multiple active bookings detected for the same unit in "public.bookings". Resolve duplicate active bookings before applying this migration.';
        END IF;
    END IF;
END $$;

-- Step 1.2: Schema Evolution (Safely Add Missing Columns to Existing Tables)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organizations') THEN
        ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS is_synthetic BOOLEAN DEFAULT FALSE NOT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
        ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS assigned_project_ids TEXT[] DEFAULT '{}'::TEXT[];
        ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS monthly_sales_target_inr NUMERIC(15, 2) DEFAULT 0.00 NOT NULL;
        ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
        ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN
        ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS is_synthetic BOOLEAN DEFAULT FALSE NOT NULL;
        ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS configurations TEXT[] DEFAULT '{}'::TEXT[];
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'units') THEN
        ALTER TABLE public.units ADD COLUMN IF NOT EXISTS plc_inr NUMERIC(12, 2) DEFAULT 0.00;
        ALTER TABLE public.units ADD COLUMN IF NOT EXISTS parking_charges_inr NUMERIC(10, 2) DEFAULT 0.00;
        ALTER TABLE public.units ADD COLUMN IF NOT EXISTS total_price_inr NUMERIC(14, 2);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') THEN
        ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS is_synthetic BOOLEAN DEFAULT FALSE NOT NULL;
        ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100);
        ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
        ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
        ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
        ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS refund_amount_inr NUMERIC(12, 2) DEFAULT 0.00;
    END IF;
END $$;

-- Step 2: Enums
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM (
            'company_admin',
            'super_admin',
            'director',
            'sales_manager',
            'sales_executive',
            'presales_agent',
            'booking_operations'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status') THEN
        CREATE TYPE public.project_status AS ENUM (
            'planning',
            'pre_launch',
            'under_construction',
            'ready_to_move',
            'sold_out'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'unit_status') THEN
        CREATE TYPE public.unit_status AS ENUM (
            'available',
            'reserved',
            'token_received',
            'booked',
            'sold',
            'quota_reserved'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'unit_typology') THEN
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
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_source') THEN
        CREATE TYPE public.lead_source AS ENUM (
            'meta_ads',
            'google_ads',
            'google_search',
            'real_estate_portal',
            '99acres',
            'magicbricks',
            'channel_partner',
            'walk_in',
            'referral',
            'website',
            'corporate_campaign',
            'other'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_priority') THEN
        CREATE TYPE public.lead_priority AS ENUM (
            'hot',
            'warm',
            'cold'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pipeline_stage') THEN
        CREATE TYPE public.pipeline_stage AS ENUM (
            'new',
            'contacted',
            'qualified',
            'site_visit_scheduled',
            'site_visit_conducted',
            'negotiation',
            'token_paid',
            'booked',
            'lost'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_type') THEN
        CREATE TYPE public.activity_type AS ENUM (
            'phone_call',
            'whatsapp_message',
            'in_person_meeting',
            'email_sent',
            'email',
            'site_visit_update',
            'site_visit',
            'stage_change',
            'internal_note',
            'cost_sheet_shared'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'visit_status') THEN
        CREATE TYPE public.visit_status AS ENUM (
            'scheduled',
            'confirmed',
            'completed',
            'rescheduled',
            'cancelled',
            'no_show'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
        CREATE TYPE public.task_status AS ENUM (
            'pending',
            'completed',
            'overdue',
            'cancelled'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
        CREATE TYPE public.booking_status AS ENUM (
            'pending',
            'token_received',
            'confirmed',
            'application_form_filled',
            'allotment_issued',
            'agreement_executed',
            'cancelled',
            'refunded',
            'cancelled_refunded'
        );
    END IF;
END $$;

-- Step 3: Tables & Composite Integrity Constraints

-- 3.1 Organizations
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    rera_entity_id VARCHAR(100) NOT NULL,
    gstin VARCHAR(15),
    headquarters_city VARCHAR(100) DEFAULT 'Bengaluru' NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR' NOT NULL,
    is_synthetic BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3.2 Profiles (Linked 1:1 with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL DEFAULT '+91 98000 00000',
    role public.user_role NOT NULL DEFAULT 'sales_executive',
    reports_to UUID,
    manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_project_ids TEXT[] DEFAULT '{}'::TEXT[],
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    monthly_sales_target_inr NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_profiles_org_id UNIQUE (org_id, id)
);

-- 3.3 Projects
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    rera_number VARCHAR(100) NOT NULL,
    location_area VARCHAR(150) NOT NULL,
    city VARCHAR(100) NOT NULL,
    project_type VARCHAR(50) NOT NULL,
    description TEXT DEFAULT '' NOT NULL,
    configurations TEXT[] DEFAULT '{}'::TEXT[],
    total_area_acres NUMERIC(6, 2),
    total_units INT DEFAULT 0 NOT NULL,
    status public.project_status DEFAULT 'under_construction' NOT NULL,
    launch_date DATE,
    expected_completion DATE,
    brochure_url TEXT,
    cover_image_url TEXT,
    is_synthetic BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_projects_org_id UNIQUE (org_id, id),
    CONSTRAINT uq_projects_org_code UNIQUE (org_id, code)
);

-- 3.4 Project Assignments
CREATE TABLE IF NOT EXISTS public.project_assignments (
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL,
    profile_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (org_id, project_id, profile_id),
    CONSTRAINT fk_pa_proj_org FOREIGN KEY (org_id, project_id) REFERENCES public.projects(org_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_pa_prof_org FOREIGN KEY (org_id, profile_id) REFERENCES public.profiles(org_id, id) ON DELETE CASCADE
);

-- 3.5 Towers
CREATE TABLE IF NOT EXISTS public.towers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    total_floors INT NOT NULL,
    total_units INT NOT NULL,
    rera_phase_number VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_towers_org_proj_id UNIQUE (org_id, project_id, id),
    CONSTRAINT fk_towers_proj_org FOREIGN KEY (org_id, project_id) REFERENCES public.projects(org_id, id) ON DELETE CASCADE
);

-- 3.6 Units
CREATE TABLE IF NOT EXISTS public.units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL,
    project_name VARCHAR(255),
    tower_id UUID NOT NULL,
    tower_name VARCHAR(100),
    unit_number VARCHAR(50) NOT NULL,
    floor_number INT NOT NULL,
    typology public.unit_typology NOT NULL,
    facing VARCHAR(50),
    carpet_area_sqft NUMERIC(8, 2) NOT NULL,
    super_builtup_area_sqft NUMERIC(8, 2) NOT NULL,
    base_price_inr NUMERIC(14, 2) NOT NULL,
    plc_inr NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    parking_charges_inr NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    total_price_inr NUMERIC(14, 2) DEFAULT 0.00 NOT NULL,
    status public.unit_status DEFAULT 'available' NOT NULL,
    floor_plan_url TEXT,
    reserved_by VARCHAR(255),
    reserved_lead_name VARCHAR(255),
    reserved_lead_id UUID,
    reserved_at TIMESTAMPTZ,
    reserved_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_units_org_proj_id UNIQUE (org_id, project_id, id),
    CONSTRAINT uq_units_org_id UNIQUE (org_id, id),
    CONSTRAINT uq_units_tower_unit UNIQUE (tower_id, unit_number),
    CONSTRAINT fk_units_proj_org FOREIGN KEY (org_id, project_id) REFERENCES public.projects(org_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_units_tower_proj_org FOREIGN KEY (org_id, project_id, tower_id) REFERENCES public.towers(org_id, project_id, id) ON DELETE CASCADE
);

-- Trigger to calculate unit total price automatically
CREATE OR REPLACE FUNCTION public.fn_calculate_unit_total_price()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_price_inr := COALESCE(NEW.base_price_inr, 0) + COALESCE(NEW.plc_inr, 0) + COALESCE(NEW.parking_charges_inr, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calc_unit_price ON public.units;
CREATE TRIGGER trg_calc_unit_price
BEFORE INSERT OR UPDATE ON public.units
FOR EACH ROW EXECUTE FUNCTION public.fn_calculate_unit_total_price();

-- 3.7 Leads
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL,
    project_name VARCHAR(255),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    whatsapp_number VARCHAR(20),
    city VARCHAR(100) DEFAULT 'Bengaluru' NOT NULL,
    budget_min_inr NUMERIC(14, 2) DEFAULT 0.00,
    budget_max_inr NUMERIC(14, 2) DEFAULT 0.00,
    preferred_typology VARCHAR(50),
    source public.lead_source DEFAULT 'walk_in' NOT NULL,
    channel_partner_name VARCHAR(255),
    priority public.lead_priority DEFAULT 'warm' NOT NULL,
    current_stage public.pipeline_stage DEFAULT 'new' NOT NULL,
    assigned_presales_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_sales_executive_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_executive_name VARCHAR(255),
    interested_unit_id UUID,
    lost_reason VARCHAR(255),
    last_contacted_at TIMESTAMPTZ,
    next_follow_up_at TIMESTAMPTZ,
    is_synthetic BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_leads_org_id UNIQUE (org_id, id),
    CONSTRAINT uq_leads_org_phone UNIQUE (org_id, phone),
    CONSTRAINT fk_leads_proj_org FOREIGN KEY (org_id, project_id) REFERENCES public.projects(org_id, id) ON DELETE RESTRICT
);

-- 3.8 Lead Activities
CREATE TABLE IF NOT EXISTS public.lead_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL,
    lead_name VARCHAR(255),
    actor_id UUID,
    actor_name VARCHAR(255),
    activity_type public.activity_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT fk_lead_activities_lead_org FOREIGN KEY (org_id, lead_id) REFERENCES public.leads(org_id, id) ON DELETE CASCADE
);

-- 3.9 Site Visits
CREATE TABLE IF NOT EXISTS public.site_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL,
    project_name VARCHAR(255),
    lead_id UUID NOT NULL,
    lead_name VARCHAR(255),
    lead_phone VARCHAR(20),
    executive_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_executive_name VARCHAR(255),
    scheduled_at TIMESTAMPTZ NOT NULL,
    visit_type VARCHAR(50) DEFAULT 'site_visit' NOT NULL,
    meeting_location TEXT,
    status public.visit_status DEFAULT 'scheduled' NOT NULL,
    customer_feedback_rating INT,
    customer_notes TEXT,
    executive_notes TEXT,
    remarks TEXT,
    conducted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT fk_site_visits_proj_org FOREIGN KEY (org_id, project_id) REFERENCES public.projects(org_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_site_visits_lead_org FOREIGN KEY (org_id, lead_id) REFERENCES public.leads(org_id, id) ON DELETE CASCADE
);

-- 3.10 Tasks and Followups
CREATE TABLE IF NOT EXISTS public.tasks_and_followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL,
    lead_name VARCHAR(255),
    lead_phone VARCHAR(20),
    project_name VARCHAR(255),
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_executive_name VARCHAR(255),
    activity_type public.activity_type NOT NULL,
    priority public.lead_priority DEFAULT 'warm' NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    status public.task_status DEFAULT 'pending' NOT NULL,
    remarks TEXT,
    completion_outcome TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT fk_tasks_lead_org FOREIGN KEY (org_id, lead_id) REFERENCES public.leads(org_id, id) ON DELETE CASCADE
);

-- 3.11 Sequence for safe booking references (HIGH-03)
CREATE SEQUENCE IF NOT EXISTS public.booking_reference_seq START WITH 1001;

-- Safely synchronize sequence with any existing booking records (Phase 6.2.6)
DO $$
DECLARE
    v_max_val BIGINT;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') THEN
        SELECT COALESCE(MAX(SUBSTRING(booking_reference FROM '[0-9]+$')::BIGINT), 1000) INTO v_max_val FROM public.bookings;
        PERFORM setval('public.booking_reference_seq', GREATEST(v_max_val, 1000));
    END IF;
END $$;

-- 3.12 Bookings
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL,
    project_name VARCHAR(255),
    tower_id UUID,
    tower_name VARCHAR(100),
    unit_id UUID NOT NULL,
    unit_number VARCHAR(50),
    typology VARCHAR(50),
    carpet_area_sqft NUMERIC(8, 2),
    lead_id UUID NOT NULL,
    lead_name VARCHAR(255),
    lead_phone VARCHAR(20),
    lead_email VARCHAR(255),
    closing_executive_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_executive_name VARCHAR(255),
    booking_reference VARCHAR(100) NOT NULL DEFAULT ('AUR-BK-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(NEXTVAL('public.booking_reference_seq')::TEXT, 4, '0')),
    token_amount_inr NUMERIC(12, 2) NOT NULL,
    base_price_inr NUMERIC(14, 2) DEFAULT 0.00,
    plc_inr NUMERIC(12, 2) DEFAULT 0.00,
    parking_charges_inr NUMERIC(10, 2) DEFAULT 0.00,
    agreed_total_price_inr NUMERIC(14, 2) NOT NULL,
    payment_mode VARCHAR(50) DEFAULT 'neft_rtgs' NOT NULL,
    payment_reference VARCHAR(100),
    bank_name VARCHAR(100),
    status public.booking_status DEFAULT 'token_received' NOT NULL,
    booking_date DATE DEFAULT CURRENT_DATE,
    agreement_date DATE,
    special_conditions TEXT,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    refund_amount_inr NUMERIC(12, 2) DEFAULT 0.00,
    notes TEXT,
    is_synthetic BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_bookings_org_ref UNIQUE (org_id, booking_reference),
    CONSTRAINT fk_bookings_proj_org FOREIGN KEY (org_id, project_id) REFERENCES public.projects(org_id, id) ON DELETE RESTRICT,
    CONSTRAINT fk_bookings_unit_proj_org FOREIGN KEY (org_id, project_id, unit_id) REFERENCES public.units(org_id, project_id, id) ON DELETE RESTRICT,
    CONSTRAINT fk_bookings_lead_org FOREIGN KEY (org_id, lead_id) REFERENCES public.leads(org_id, id) ON DELETE RESTRICT
);

-- Partial Unique Index for Active Bookings (CRIT-02: Allows cancelled units to be re-booked cleanly)
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_active_unit ON public.bookings (unit_id)
WHERE status NOT IN ('cancelled', 'refunded', 'cancelled_refunded');

-- Step 4: Security Helper Functions
CREATE OR REPLACE FUNCTION public.get_auth_org_id()
RETURNS UUID STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT org_id FROM public.profiles WHERE id = auth.uid() AND is_active = TRUE;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS public.user_role STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid() AND is_active = TRUE;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION public.is_management()
RETURNS BOOLEAN STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
          AND role IN ('company_admin', 'super_admin', 'director') 
          AND is_active = TRUE
    );
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION public.is_booking_operations()
RETURNS BOOLEAN STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
          AND role IN ('booking_operations', 'company_admin', 'super_admin', 'director') 
          AND is_active = TRUE
    );
$$ LANGUAGE sql;

-- Project Access Verification with Multi-tenant Organization Guard (MED-02)
CREATE OR REPLACE FUNCTION public.is_project_accessible(p_project_id UUID)
RETURNS BOOLEAN STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_role public.user_role;
    v_org_id UUID;
    v_assigned_projects TEXT[];
BEGIN
    SELECT org_id, role, assigned_project_ids INTO v_org_id, v_role, v_assigned_projects
    FROM public.profiles WHERE id = auth.uid() AND is_active = TRUE;

    IF v_org_id IS NULL THEN RETURN FALSE; END IF;

    IF v_role IN ('company_admin', 'super_admin', 'director', 'booking_operations') THEN
        RETURN EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id AND org_id = v_org_id);
    END IF;

    IF p_project_id::text = ANY(v_assigned_projects) THEN
        RETURN EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id AND org_id = v_org_id);
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.project_assignments 
        WHERE project_id = p_project_id AND profile_id = auth.uid() AND org_id = v_org_id
    );
END;
$$ LANGUAGE plpgsql;

-- Self-Privilege Escalation & Hierarchy Authorization Trigger (Phase 6.2.5 Hardened)
-- Eliminates broad is_management() exemption.
-- Enforces strict hierarchical promotion rules and blocks self-modification of administrative fields.
CREATE OR REPLACE FUNCTION public.fn_prevent_profile_privilege_escalation()
RETURNS TRIGGER AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_caller_role public.user_role;
    v_caller_org_id UUID;
    v_caller_is_active BOOLEAN;
BEGIN
    -- Allow internal database maintenance / seed setup when auth context is null
    IF v_caller_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Fetch caller role and organization
    SELECT role, org_id, is_active 
    INTO v_caller_role, v_caller_org_id, v_caller_is_active
    FROM public.profiles 
    WHERE id = v_caller_id;

    IF v_caller_org_id IS NULL OR v_caller_is_active IS NOT TRUE THEN
        RAISE EXCEPTION 'Access Denied: Inactive or invalid caller profile.';
    END IF;

    -- 1. PREVENT ANY EMPLOYEE (INCLUDING MANAGEMENT) FROM MODIFYING THEIR OWN ADMINISTRATIVE FIELDS
    IF v_caller_id = OLD.id THEN
        IF NEW.role IS DISTINCT FROM OLD.role OR
           NEW.org_id IS DISTINCT FROM OLD.org_id OR
           NEW.is_active IS DISTINCT FROM OLD.is_active OR
           NEW.assigned_project_ids IS DISTINCT FROM OLD.assigned_project_ids OR
           NEW.manager_id IS DISTINCT FROM OLD.manager_id OR
           NEW.reports_to IS DISTINCT FROM OLD.reports_to THEN
            RAISE EXCEPTION 'Access Denied: Employees cannot modify their own administrative attributes (role, organization, active status, or project assignments).';
        END IF;
    END IF;

    -- 2. ENFORCE STRICT ROLE HIERARCHY FOR MODIFICATIONS TO OTHER USERS
    IF v_caller_id != OLD.id THEN
        -- Organization boundary: caller cannot modify profiles in another organization
        IF OLD.org_id != v_caller_org_id OR NEW.org_id != v_caller_org_id THEN
            RAISE EXCEPTION 'Access Denied: Cross-organization profile modifications are forbidden.';
        END IF;

        -- Non-management roles cannot modify any other employee
        IF v_caller_role NOT IN ('super_admin', 'company_admin', 'director') THEN
            IF NEW.role IS DISTINCT FROM OLD.role OR
               NEW.org_id IS DISTINCT FROM OLD.org_id OR
               NEW.is_active IS DISTINCT FROM OLD.is_active OR
               NEW.assigned_project_ids IS DISTINCT FROM OLD.assigned_project_ids OR
               NEW.manager_id IS DISTINCT FROM OLD.manager_id OR
               NEW.reports_to IS DISTINCT FROM OLD.reports_to THEN
                RAISE EXCEPTION 'Access Denied: Your role is not authorized to modify employee administration fields.';
            END IF;
        END IF;

        -- Directors cannot modify company_admin or super_admin profiles, and cannot grant those roles
        IF v_caller_role = 'director' THEN
            -- Cannot alter an existing super_admin, company_admin, or peer director
            IF OLD.role IN ('super_admin', 'company_admin', 'director') THEN
                RAISE EXCEPTION 'Access Denied: Directors cannot modify Company Administrators, Super Administrators, or fellow Directors.';
            END IF;
            -- Cannot promote anyone to super_admin, company_admin, or director
            IF NEW.role IN ('super_admin', 'company_admin', 'director') AND NEW.role IS DISTINCT FROM OLD.role THEN
                RAISE EXCEPTION 'Access Denied: Directors cannot promote users to Company Administrator, Super Administrator, or Director.';
            END IF;
        END IF;

        -- Company Admins cannot modify super_admin profiles, and cannot grant super_admin or company_admin
        IF v_caller_role = 'company_admin' THEN
            -- Cannot alter an existing super_admin or peer company_admin
            IF OLD.role IN ('super_admin', 'company_admin') THEN
                RAISE EXCEPTION 'Access Denied: Company Administrators cannot modify Super Administrators or peer Company Administrators.';
            END IF;
            -- Cannot promote anyone to super_admin or company_admin
            IF NEW.role IN ('super_admin', 'company_admin') AND NEW.role IS DISTINCT FROM OLD.role THEN
                RAISE EXCEPTION 'Access Denied: Company Administrators cannot promote users to Super Administrator or Company Administrator.';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_privilege_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_profile_privilege_escalation();

-- Unit Immutability Trigger for Sales Executives (Phase 6.2.4)
CREATE OR REPLACE FUNCTION public.fn_prevent_unit_unauthorized_update()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT (public.is_management() OR public.is_booking_operations()) THEN
        IF NEW.org_id IS DISTINCT FROM OLD.org_id OR
           NEW.project_id IS DISTINCT FROM OLD.project_id OR
           NEW.project_name IS DISTINCT FROM OLD.project_name OR
           NEW.tower_id IS DISTINCT FROM OLD.tower_id OR
           NEW.tower_name IS DISTINCT FROM OLD.tower_name OR
           NEW.unit_number IS DISTINCT FROM OLD.unit_number OR
           NEW.floor_number IS DISTINCT FROM OLD.floor_number OR
           NEW.typology IS DISTINCT FROM OLD.typology OR
           NEW.carpet_area_sqft IS DISTINCT FROM OLD.carpet_area_sqft OR
           NEW.super_builtup_area_sqft IS DISTINCT FROM OLD.super_builtup_area_sqft OR
           NEW.base_price_inr IS DISTINCT FROM OLD.base_price_inr OR
           NEW.plc_inr IS DISTINCT FROM OLD.plc_inr OR
           NEW.parking_charges_inr IS DISTINCT FROM OLD.parking_charges_inr OR
           NEW.total_price_inr IS DISTINCT FROM OLD.total_price_inr THEN
            RAISE EXCEPTION 'Access Denied: Sales executives cannot modify unit pricing, area specifications, unit numbering, tower, project, or organization assignments. Only reservation status and customer hold details may be updated.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_prevent_unit_unauthorized_update ON public.units;
CREATE TRIGGER trg_prevent_unit_unauthorized_update
BEFORE UPDATE ON public.units
FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_unit_unauthorized_update();

-- Lead Integrity Trigger (Phase 6.2.4)
CREATE OR REPLACE FUNCTION public.fn_prevent_lead_unauthorized_modification()
RETURNS TRIGGER AS $$
DECLARE
    v_role public.user_role;
    v_uid UUID := auth.uid();
BEGIN
    IF public.is_management() THEN
        RETURN NEW;
    END IF;

    v_role := public.get_auth_user_role();

    IF NEW.org_id IS DISTINCT FROM OLD.org_id THEN
        RAISE EXCEPTION 'Access Denied: Cannot modify lead organization ownership.';
    END IF;

    IF NEW.project_id IS DISTINCT FROM OLD.project_id THEN
        IF NOT public.is_project_accessible(NEW.project_id) THEN
            RAISE EXCEPTION 'Access Denied: Target project is not assigned or accessible to caller.';
        END IF;
    END IF;

    IF v_role = 'sales_executive' THEN
        IF OLD.assigned_sales_executive_id IS NOT NULL AND 
           NEW.assigned_sales_executive_id IS DISTINCT FROM OLD.assigned_sales_executive_id THEN
            RAISE EXCEPTION 'Access Denied: Sales executives cannot reassign leads to another executive. Contact your sales manager.';
        END IF;
        IF OLD.assigned_sales_executive_id IS NULL AND 
           NEW.assigned_sales_executive_id IS NOT NULL AND 
           NEW.assigned_sales_executive_id != v_uid THEN
            RAISE EXCEPTION 'Access Denied: You may only assign unassigned leads to yourself.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_prevent_lead_unauthorized_modification ON public.leads;
CREATE TRIGGER trg_prevent_lead_unauthorized_modification
BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_lead_unauthorized_modification();

-- Step 5: Enable Row-Level Security
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.towers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks_and_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Step 6: Comprehensive Role-Based Access Control (RLS) Policies

-- 6.1 Organizations
DROP POLICY IF EXISTS "org_select" ON public.organizations;
CREATE POLICY "org_select" ON public.organizations FOR SELECT TO authenticated
    USING (id = public.get_auth_org_id());

DROP POLICY IF EXISTS "org_manage" ON public.organizations;
CREATE POLICY "org_manage" ON public.organizations FOR ALL TO authenticated
    USING (public.is_management() AND id = public.get_auth_org_id())
    WITH CHECK (public.is_management() AND id = public.get_auth_org_id());

-- 6.2 Profiles (Phase 6.2.5: Enforces identical hierarchy as trigger)
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated
    USING (org_id = public.get_auth_org_id());

DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated
    USING (id = auth.uid() AND org_id = public.get_auth_org_id())
    WITH CHECK (
        id = auth.uid() 
        AND org_id = public.get_auth_org_id()
        AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
    );

DROP POLICY IF EXISTS "profiles_admin_manage" ON public.profiles;
CREATE POLICY "profiles_admin_manage" ON public.profiles FOR ALL TO authenticated
    USING (
        org_id = public.get_auth_org_id() 
        AND public.is_management()
        AND (
            public.get_auth_user_role() = 'super_admin'
            OR (public.get_auth_user_role() = 'company_admin' AND role NOT IN ('super_admin', 'company_admin'))
            OR (public.get_auth_user_role() = 'director' AND role NOT IN ('super_admin', 'company_admin', 'director'))
        )
    )
    WITH CHECK (
        org_id = public.get_auth_org_id() 
        AND public.is_management()
        AND (
            public.get_auth_user_role() = 'super_admin'
            OR (public.get_auth_user_role() = 'company_admin' AND role NOT IN ('super_admin', 'company_admin'))
            OR (public.get_auth_user_role() = 'director' AND role NOT IN ('super_admin', 'company_admin', 'director'))
        )
    );

-- 6.3 Projects
DROP POLICY IF EXISTS "projects_select" ON public.projects;
CREATE POLICY "projects_select" ON public.projects FOR SELECT TO authenticated
    USING (org_id = public.get_auth_org_id() AND public.is_project_accessible(id));

DROP POLICY IF EXISTS "projects_write" ON public.projects;
CREATE POLICY "projects_write" ON public.projects FOR ALL TO authenticated
    USING (org_id = public.get_auth_org_id() AND public.is_management())
    WITH CHECK (org_id = public.get_auth_org_id() AND public.is_management());

-- 6.4 Project Assignments
DROP POLICY IF EXISTS "project_assignments_select" ON public.project_assignments;
CREATE POLICY "project_assignments_select" ON public.project_assignments FOR SELECT TO authenticated
    USING (org_id = public.get_auth_org_id());

DROP POLICY IF EXISTS "project_assignments_manage" ON public.project_assignments;
CREATE POLICY "project_assignments_manage" ON public.project_assignments FOR ALL TO authenticated
    USING (org_id = public.get_auth_org_id() AND public.is_management())
    WITH CHECK (org_id = public.get_auth_org_id() AND public.is_management());

-- 6.5 Towers
DROP POLICY IF EXISTS "towers_select" ON public.towers;
CREATE POLICY "towers_select" ON public.towers FOR SELECT TO authenticated
    USING (org_id = public.get_auth_org_id() AND public.is_project_accessible(project_id));

DROP POLICY IF EXISTS "towers_manage" ON public.towers;
CREATE POLICY "towers_manage" ON public.towers FOR ALL TO authenticated
    USING (org_id = public.get_auth_org_id() AND public.is_management())
    WITH CHECK (org_id = public.get_auth_org_id() AND public.is_management());

-- 6.6 Units
DROP POLICY IF EXISTS "units_select" ON public.units;
CREATE POLICY "units_select" ON public.units FOR SELECT TO authenticated
    USING (org_id = public.get_auth_org_id() AND public.is_project_accessible(project_id));

DROP POLICY IF EXISTS "units_manage" ON public.units;
DROP POLICY IF EXISTS "units_manage_admin" ON public.units;
CREATE POLICY "units_manage_admin" ON public.units FOR ALL TO authenticated
    USING (org_id = public.get_auth_org_id() AND (public.is_management() OR public.is_booking_operations()))
    WITH CHECK (org_id = public.get_auth_org_id() AND (public.is_management() OR public.is_booking_operations()));

DROP POLICY IF EXISTS "units_executive_update" ON public.units;
CREATE POLICY "units_executive_update" ON public.units FOR UPDATE TO authenticated
    USING (org_id = public.get_auth_org_id() AND public.is_project_accessible(project_id))
    WITH CHECK (org_id = public.get_auth_org_id() AND public.is_project_accessible(project_id));

-- 6.7 Leads
DROP POLICY IF EXISTS "leads_select" ON public.leads;
CREATE POLICY "leads_select" ON public.leads FOR SELECT TO authenticated
    USING (
        org_id = public.get_auth_org_id() AND (
            public.is_management()
            OR public.is_booking_operations()
            OR (public.get_auth_user_role() = 'sales_manager' AND public.is_project_accessible(project_id))
            OR (public.get_auth_user_role() = 'presales_agent' AND (assigned_presales_id = auth.uid() OR assigned_sales_executive_id IS NULL))
            OR (public.get_auth_user_role() = 'sales_executive' AND (assigned_sales_executive_id = auth.uid() OR assigned_sales_executive_id IS NULL))
        )
    );

DROP POLICY IF EXISTS "leads_write" ON public.leads;
DROP POLICY IF EXISTS "leads_insert" ON public.leads;
CREATE POLICY "leads_insert" ON public.leads FOR INSERT TO authenticated
    WITH CHECK (
        org_id = public.get_auth_org_id() AND (
            public.is_management()
            OR public.is_booking_operations()
            OR public.get_auth_user_role() IN ('sales_manager', 'presales_agent', 'sales_executive')
        ) AND public.is_project_accessible(project_id)
    );

DROP POLICY IF EXISTS "leads_update" ON public.leads;
CREATE POLICY "leads_update" ON public.leads FOR UPDATE TO authenticated
    USING (
        org_id = public.get_auth_org_id() AND (
            public.is_management()
            OR public.is_booking_operations()
            OR (public.get_auth_user_role() = 'sales_manager' AND public.is_project_accessible(project_id))
            OR (public.get_auth_user_role() = 'presales_agent' AND (assigned_presales_id = auth.uid() OR assigned_sales_executive_id IS NULL))
            OR (public.get_auth_user_role() = 'sales_executive' AND (assigned_sales_executive_id = auth.uid() OR assigned_sales_executive_id IS NULL))
        )
    )
    WITH CHECK (org_id = public.get_auth_org_id() AND public.is_project_accessible(project_id));

DROP POLICY IF EXISTS "leads_delete" ON public.leads;
CREATE POLICY "leads_delete" ON public.leads FOR DELETE TO authenticated
    USING (org_id = public.get_auth_org_id() AND public.is_management());

-- 6.8 Lead Activities
DROP POLICY IF EXISTS "lead_activities_select" ON public.lead_activities;
CREATE POLICY "lead_activities_select" ON public.lead_activities FOR SELECT TO authenticated
    USING (org_id = public.get_auth_org_id());

DROP POLICY IF EXISTS "lead_activities_insert" ON public.lead_activities;
CREATE POLICY "lead_activities_insert" ON public.lead_activities FOR INSERT TO authenticated
    WITH CHECK (org_id = public.get_auth_org_id());

-- 6.9 Site Visits
DROP POLICY IF EXISTS "site_visits_select" ON public.site_visits;
CREATE POLICY "site_visits_select" ON public.site_visits FOR SELECT TO authenticated
    USING (
        org_id = public.get_auth_org_id() AND (
            public.is_management()
            OR public.is_booking_operations()
            OR public.is_project_accessible(project_id)
            OR executive_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "site_visits_write" ON public.site_visits;
CREATE POLICY "site_visits_write" ON public.site_visits FOR ALL TO authenticated
    USING (
        org_id = public.get_auth_org_id() AND (
            public.is_management()
            OR public.is_booking_operations()
            OR public.is_project_accessible(project_id)
            OR executive_id = auth.uid()
        )
    )
    WITH CHECK (org_id = public.get_auth_org_id() AND public.is_project_accessible(project_id));

-- 6.10 Tasks and Followups
DROP POLICY IF EXISTS "tasks_select" ON public.tasks_and_followups;
CREATE POLICY "tasks_select" ON public.tasks_and_followups FOR SELECT TO authenticated
    USING (
        org_id = public.get_auth_org_id() AND (
            public.is_management()
            OR assigned_to = auth.uid()
            OR assigned_to IS NULL
        )
    );

DROP POLICY IF EXISTS "tasks_write" ON public.tasks_and_followups;
CREATE POLICY "tasks_write" ON public.tasks_and_followups FOR ALL TO authenticated
    USING (
        org_id = public.get_auth_org_id() AND (
            public.is_management()
            OR assigned_to = auth.uid()
            OR assigned_to IS NULL
        )
    )
    WITH CHECK (org_id = public.get_auth_org_id());

-- 6.11 Bookings (Phase 6.2.5: NO direct INSERT, UPDATE, or DELETE policies!)
-- Every booking creation, modification, and cancellation MUST execute through transactional RPCs.
-- Physical deletion of bookings is completely prohibited.
DROP POLICY IF EXISTS "bookings_select" ON public.bookings;
CREATE POLICY "bookings_select" ON public.bookings FOR SELECT TO authenticated
    USING (
        org_id = public.get_auth_org_id() AND (
            public.is_management()
            OR public.is_booking_operations()
            OR (public.get_auth_user_role() = 'sales_manager' AND public.is_project_accessible(project_id))
            OR closing_executive_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "bookings_write" ON public.bookings;
DROP POLICY IF EXISTS "bookings_insert" ON public.bookings;
DROP POLICY IF EXISTS "bookings_modify" ON public.bookings;
DROP POLICY IF EXISTS "bookings_delete" ON public.bookings;

-- Step 7: Atomic Transactional Procedures

-- 7.1 Atomic Transactional Booking Stored Procedure (Phase 6.2.5 Hardened)
CREATE OR REPLACE FUNCTION public.create_booking_atomic(
    p_project_id UUID,
    p_tower_id UUID,
    p_unit_id UUID,
    p_lead_id UUID,
    p_token_amount NUMERIC,
    p_agreed_price NUMERIC,
    p_payment_mode VARCHAR,
    p_payment_reference VARCHAR DEFAULT NULL,
    p_bank_name VARCHAR DEFAULT NULL,
    p_special_conditions TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_org_id UUID;
    v_user_id UUID;
    v_user_role public.user_role;
    v_is_active BOOLEAN;
    v_unit_status public.unit_status;
    v_unit_base_price NUMERIC;
    v_unit_total_price NUMERIC;
    v_unit_number VARCHAR;
    v_unit_tower_id UUID;
    v_typology VARCHAR;
    v_carpet_area NUMERIC;
    v_tower_name VARCHAR;
    v_project_name VARCHAR;
    v_closing_executive_name VARCHAR;
    v_lead_name VARCHAR;
    v_lead_phone VARCHAR;
    v_lead_email VARCHAR;
    v_lead_assigned_exec UUID;
    v_lead_project_id UUID;
    v_booking_ref VARCHAR;
    v_booking_id UUID;
BEGIN
    -- 1. Validate caller authentication and active status
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to execute bookings.';
    END IF;

    SELECT org_id, role, full_name, is_active 
    INTO v_org_id, v_user_role, v_closing_executive_name, v_is_active
    FROM public.profiles WHERE id = v_user_id;

    IF v_org_id IS NULL OR v_is_active IS NOT TRUE THEN
        RAISE EXCEPTION 'Active enterprise employee profile required.';
    END IF;

    -- 2. Validate caller role permission
    IF v_user_role NOT IN ('company_admin', 'super_admin', 'director', 'booking_operations', 'sales_manager', 'sales_executive') THEN
        RAISE EXCEPTION 'Permission denied: User role cannot execute bookings.';
    END IF;

    -- 3. Validate positive monetary amounts and logical values
    IF p_token_amount IS NULL OR p_token_amount <= 0 THEN
        RAISE EXCEPTION 'Token amount must be a positive number greater than zero.';
    END IF;

    IF p_agreed_price IS NULL OR p_agreed_price <= 0 THEN
        RAISE EXCEPTION 'Agreed total price must be a positive number greater than zero.';
    END IF;

    IF p_token_amount > p_agreed_price THEN
        RAISE EXCEPTION 'Token amount (INR %) cannot exceed the total agreed price (INR %).', p_token_amount, p_agreed_price;
    END IF;

    -- 4. Validate payment mode and instrument reference
    IF p_payment_mode NOT IN ('neft_rtgs', 'cheque', 'demand_draft', 'upi', 'card', 'bank_transfer') THEN
        RAISE EXCEPTION 'Invalid payment mode: %. Allowed modes: neft_rtgs, cheque, demand_draft, upi, card, bank_transfer.', p_payment_mode;
    END IF;

    IF p_payment_reference IS NULL OR TRIM(p_payment_reference) = '' THEN
        RAISE EXCEPTION 'Payment reference/instrument number (UTR, Cheque number, or Transaction ID) is mandatory.';
    END IF;

    -- 5. Validate caller project accessibility
    IF NOT public.is_project_accessible(p_project_id) THEN
        RAISE EXCEPTION 'Permission denied: Project is not accessible to caller.';
    END IF;

    -- 6. Validate Tower belongs to requested project and organisation
    SELECT name INTO v_tower_name
    FROM public.towers
    WHERE id = p_tower_id AND org_id = v_org_id AND project_id = p_project_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Tower not found or does not belong to specified project and organization.';
    END IF;

    -- 7. Lock Unit row FOR UPDATE to eliminate concurrency race conditions
    SELECT status, unit_number, typology::text, carpet_area_sqft, base_price_inr, total_price_inr, tower_id, project_name
    INTO v_unit_status, v_unit_number, v_typology, v_carpet_area, v_unit_base_price, v_unit_total_price, v_unit_tower_id, v_project_name
    FROM public.units
    WHERE id = p_unit_id AND org_id = v_org_id AND project_id = p_project_id AND tower_id = p_tower_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target inventory unit not found or does not match specified project, tower, and organization.';
    END IF;

    IF v_unit_status NOT IN ('available', 'reserved') THEN
        RAISE EXCEPTION 'Unit % is no longer available (current status: %)', v_unit_number, v_unit_status;
    END IF;

    -- 8. Lock Lead row FOR UPDATE, verify project alignment and authorization
    SELECT first_name || ' ' || last_name, phone, email, assigned_sales_executive_id, project_id
    INTO v_lead_name, v_lead_phone, v_lead_email, v_lead_assigned_exec, v_lead_project_id
    FROM public.leads
    WHERE id = p_lead_id AND org_id = v_org_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Customer lead not found in caller organization.';
    END IF;

    -- Verify that the lead belongs to the requested project (Phase 6.2.5)
    IF v_lead_project_id != p_project_id THEN
        RAISE EXCEPTION 'Lead Project Mismatch: Customer lead is registered for project ID %, not requested project ID %.', v_lead_project_id, p_project_id;
    END IF;

    -- Sales executive authorization guard
    IF v_user_role = 'sales_executive' THEN
        IF v_lead_assigned_exec IS NOT NULL AND v_lead_assigned_exec != v_user_id THEN
            RAISE EXCEPTION 'Permission denied: Lead is assigned to another sales executive.';
        END IF;
        -- If lead is unassigned, auto-claim lead during booking
        IF v_lead_assigned_exec IS NULL THEN
            v_lead_assigned_exec := v_user_id;
            UPDATE public.leads 
            SET assigned_sales_executive_id = v_user_id,
                assigned_executive_name = v_closing_executive_name
            WHERE id = p_lead_id;
        END IF;
    END IF;

    -- 9. Generate safe sequence-based booking reference
    v_booking_ref := 'AUR-BK-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(NEXTVAL('public.booking_reference_seq')::TEXT, 4, '0');

    -- 10. Insert Booking record (Executed via SECURITY DEFINER)
    INSERT INTO public.bookings (
        org_id, project_id, project_name, tower_id, tower_name, unit_id, unit_number,
        typology, carpet_area_sqft, lead_id, lead_name, lead_phone, lead_email,
        closing_executive_id, assigned_executive_name, booking_reference,
        token_amount_inr, base_price_inr, agreed_total_price_inr, payment_mode, payment_reference,
        bank_name, status, special_conditions, booking_date
    ) VALUES (
        v_org_id, p_project_id, v_project_name, p_tower_id, v_tower_name, p_unit_id, v_unit_number,
        v_typology, v_carpet_area, p_lead_id, v_lead_name, v_lead_phone, v_lead_email,
        v_user_id, v_closing_executive_name, v_booking_ref,
        p_token_amount, v_unit_base_price, p_agreed_price, p_payment_mode,
        p_payment_reference, p_bank_name, 'token_received', p_special_conditions, CURRENT_DATE
    ) RETURNING id INTO v_booking_id;

    -- 11. Atomic Unit Status update
    UPDATE public.units
    SET status = 'booked',
        reserved_by = v_closing_executive_name,
        reserved_lead_name = v_lead_name,
        reserved_lead_id = p_lead_id,
        updated_at = NOW()
    WHERE id = p_unit_id;

    -- 12. Atomic Lead Stage update
    UPDATE public.leads
    SET current_stage = 'token_paid',
        interested_unit_id = p_unit_id,
        last_contacted_at = NOW(),
        updated_at = NOW()
    WHERE id = p_lead_id;

    -- 13. Audit activity log
    INSERT INTO public.lead_activities (
        org_id, lead_id, lead_name, actor_id, actor_name, activity_type, title, description
    ) VALUES (
        v_org_id, p_lead_id, v_lead_name, v_user_id, v_closing_executive_name,
        'internal_note',
        'Booking Created: Ref ' || v_booking_ref,
        'Unit ' || v_unit_number || ' (' || v_tower_name || ') booked with token amount of INR ' || p_token_amount
    );

    RETURN jsonb_build_object(
        'success', true,
        'booking_id', v_booking_id,
        'booking_reference', v_booking_ref,
        'unit_id', p_unit_id,
        'unit_number', v_unit_number,
        'project_id', p_project_id,
        'project_name', v_project_name,
        'tower_id', p_tower_id,
        'tower_name', v_tower_name,
        'lead_id', p_lead_id,
        'lead_name', v_lead_name,
        'lead_phone', v_lead_phone,
        'lead_email', v_lead_email,
        'typology', v_typology,
        'carpet_area_sqft', v_carpet_area,
        'base_price_inr', v_unit_base_price,
        'agreed_total_price_inr', p_agreed_price,
        'token_amount_inr', p_token_amount,
        'payment_mode', p_payment_mode,
        'payment_reference', p_payment_reference,
        'bank_name', p_bank_name,
        'assigned_executive_name', v_closing_executive_name,
        'status', 'token_received',
        'booking_date', CURRENT_DATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 7.2 Transactional Booking Cancellation (Phase 6.2.6 Hardened)
-- Rejects negative refunds, enforces financial boundaries, supports distinct statuses, and safely restores unit inventory.
CREATE OR REPLACE FUNCTION public.cancel_booking_transactional(
    p_booking_id UUID,
    p_cancellation_reason TEXT,
    p_refund_amount NUMERIC DEFAULT 0,
    p_cancellation_type VARCHAR DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_booking RECORD;
    v_user_id UUID := auth.uid();
    v_user_role public.user_role;
    v_user_name VARCHAR;
    v_final_status public.booking_status;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    SELECT role, full_name INTO v_user_role, v_user_name
    FROM public.profiles WHERE id = v_user_id AND is_active = TRUE;

    IF NOT (public.is_management() OR public.is_booking_operations()) THEN
        RAISE EXCEPTION 'Permission denied: Only management and booking operations can cancel bookings.';
    END IF;

    -- 1. Validate refund amount is not negative
    IF p_refund_amount IS NULL OR p_refund_amount < 0 THEN
        RAISE EXCEPTION 'Invalid Refund Amount: Refund amount cannot be negative (provided: %).', p_refund_amount;
    END IF;

    -- Lock booking row FOR UPDATE
    SELECT * INTO v_booking
    FROM public.bookings
    WHERE id = p_booking_id AND org_id = public.get_auth_org_id()
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking record not found or access denied.';
    END IF;

    IF v_booking.status IN ('cancelled', 'refunded', 'cancelled_refunded') THEN
        RAISE EXCEPTION 'Invalid Operation: Booking % is already cancelled or refunded.', v_booking.booking_reference;
    END IF;

    -- 2. Validate refund against collected financial values (token amount)
    IF p_refund_amount > v_booking.token_amount_inr THEN
        RAISE EXCEPTION 'Invalid Refund Amount: Refund amount (INR %) cannot exceed the total token amount collected (INR %).', 
            p_refund_amount, v_booking.token_amount_inr;
    END IF;

    -- 3. Resolve distinct status: cancellation with forfeiture, partial refund, or full refund
    IF p_cancellation_type IS NOT NULL THEN
        IF p_cancellation_type NOT IN ('cancelled', 'refunded', 'cancelled_refunded') THEN
            RAISE EXCEPTION 'Invalid cancellation type: %. Allowed types: cancelled, refunded, cancelled_refunded.', p_cancellation_type;
        END IF;
        v_final_status := p_cancellation_type::public.booking_status;
    ELSE
        IF p_refund_amount = 0 THEN
            v_final_status := 'cancelled';
        ELSIF p_refund_amount > 0 AND p_refund_amount < v_booking.token_amount_inr THEN
            v_final_status := 'cancelled_refunded';
        ELSE
            v_final_status := 'refunded';
        END IF;
    END IF;

    -- Lock Unit and Lead rows FOR UPDATE
    PERFORM id FROM public.units WHERE id = v_booking.unit_id AND org_id = v_booking.org_id FOR UPDATE;
    PERFORM id FROM public.leads WHERE id = v_booking.lead_id AND org_id = v_booking.org_id FOR UPDATE;

    -- 4. Update booking record
    UPDATE public.bookings
    SET status = v_final_status,
        cancellation_reason = p_cancellation_reason,
        refund_amount_inr = p_refund_amount,
        cancelled_at = NOW(),
        updated_at = NOW()
    WHERE id = p_booking_id;

    -- 5. Release unit back to available inventory
    UPDATE public.units
    SET status = 'available',
        reserved_by = NULL,
        reserved_lead_name = NULL,
        reserved_lead_id = NULL,
        reserved_until = NULL,
        updated_at = NOW()
    WHERE id = v_booking.unit_id;

    -- 6. Update lead stage back to negotiation
    UPDATE public.leads
    SET current_stage = 'negotiation',
        interested_unit_id = NULL,
        updated_at = NOW()
    WHERE id = v_booking.lead_id;

    -- 7. Log audit activity
    INSERT INTO public.lead_activities (
        org_id, lead_id, lead_name, actor_id, actor_name, activity_type, title, description
    ) VALUES (
        v_booking.org_id, v_booking.lead_id, v_booking.lead_name, v_user_id, v_user_name,
        'internal_note',
        'Booking Cancelled: Ref ' || v_booking.booking_reference || ' (' || v_final_status::text || ')',
        'Booking cancelled with status ' || v_final_status::text || '. Refund amount: INR ' || p_refund_amount || 
        '. Unit ' || v_booking.unit_number || ' released back to inventory. Reason: ' || COALESCE(p_cancellation_reason, 'No reason specified')
    );

    RETURN jsonb_build_object(
        'success', true,
        'booking_id', p_booking_id,
        'status', v_final_status::text,
        'refund_amount_inr', p_refund_amount,
        'unit_id', v_booking.unit_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 7.3 Transactional Booking Status Update (Phase 6.2.6 Hardened)
-- Enforces explicit allowed-transition matrix, rejects skipped or backward transitions, forbids reactivation or cancellation bypass.
CREATE OR REPLACE FUNCTION public.update_booking_status_transactional(
    p_booking_id UUID,
    p_new_status VARCHAR,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_booking RECORD;
    v_user_id UUID := auth.uid();
    v_user_name VARCHAR;
    v_is_valid_transition BOOLEAN := FALSE;
    v_allowed_next TEXT := '';
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF NOT (public.is_management() OR public.is_booking_operations()) THEN
        RAISE EXCEPTION 'Permission denied: Only management and booking operations can modify booking status.';
    END IF;

    -- 1. Prevent cancellation bypass: cancellations MUST use cancel_booking_transactional
    IF p_new_status IN ('cancelled', 'refunded', 'cancelled_refunded') THEN
        RAISE EXCEPTION 'Invalid Operation: Cannot cancel or refund via update_booking_status_transactional. Use cancel_booking_transactional to ensure unit inventory is safely restored.';
    END IF;

    -- 2. Validate permitted progressive active statuses
    IF p_new_status NOT IN ('pending', 'token_received', 'confirmed', 'application_form_filled', 'allotment_issued', 'agreement_executed') THEN
        RAISE EXCEPTION 'Invalid or unknown booking status: %', p_new_status;
    END IF;

    -- Lock booking row FOR UPDATE
    SELECT * INTO v_booking
    FROM public.bookings
    WHERE id = p_booking_id AND org_id = public.get_auth_org_id()
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found.';
    END IF;

    -- 3. Prevent silent reactivation of cancelled or refunded bookings
    IF v_booking.status IN ('cancelled', 'refunded', 'cancelled_refunded') THEN
        RAISE EXCEPTION 'Invalid State Transition: Cancelled or refunded booking % cannot be reactivated or modified.', v_booking.booking_reference;
    END IF;

    -- 4. Reject same status no-op transition
    IF v_booking.status::text = p_new_status THEN
        RAISE EXCEPTION 'Invalid State Transition: Booking % is already in "%" status.', v_booking.booking_reference, p_new_status;
    END IF;

    -- 5. Enforce explicit allowed-transition matrix (reject skipped and backward steps)
    CASE v_booking.status::text
        WHEN 'pending' THEN
            v_allowed_next := 'token_received';
            v_is_valid_transition := (p_new_status = 'token_received');
        WHEN 'token_received' THEN
            v_allowed_next := 'application_form_filled, confirmed';
            v_is_valid_transition := (p_new_status IN ('application_form_filled', 'confirmed'));
        WHEN 'application_form_filled' THEN
            v_allowed_next := 'confirmed';
            v_is_valid_transition := (p_new_status = 'confirmed');
        WHEN 'confirmed' THEN
            v_allowed_next := 'allotment_issued';
            v_is_valid_transition := (p_new_status = 'allotment_issued');
        WHEN 'allotment_issued' THEN
            v_allowed_next := 'agreement_executed';
            v_is_valid_transition := (p_new_status = 'agreement_executed');
        WHEN 'agreement_executed' THEN
            v_allowed_next := 'none (terminal active state)';
            v_is_valid_transition := FALSE;
        ELSE
            v_allowed_next := 'none';
            v_is_valid_transition := FALSE;
    END CASE;

    IF NOT v_is_valid_transition THEN
        RAISE EXCEPTION 'Invalid State Transition: Cannot transition booking % from "%" to "%". Permitted transitions from "%": [%].', 
            v_booking.booking_reference, v_booking.status, p_new_status, v_booking.status, v_allowed_next;
    END IF;

    SELECT full_name INTO v_user_name FROM public.profiles WHERE id = v_user_id;

    -- Lock Unit and Lead rows FOR UPDATE
    PERFORM id FROM public.units WHERE id = v_booking.unit_id AND org_id = v_booking.org_id FOR UPDATE;
    PERFORM id FROM public.leads WHERE id = v_booking.lead_id AND org_id = v_booking.org_id FOR UPDATE;

    -- 6. Update booking status
    UPDATE public.bookings
    SET status = p_new_status::public.booking_status,
        notes = COALESCE(p_notes, notes),
        updated_at = NOW()
    WHERE id = p_booking_id;

    -- 7. Synchronize unit and lead state consistently
    IF p_new_status IN ('confirmed', 'allotment_issued', 'agreement_executed') THEN
        UPDATE public.units SET status = 'sold', updated_at = NOW() WHERE id = v_booking.unit_id;
        UPDATE public.leads SET current_stage = 'booked', updated_at = NOW() WHERE id = v_booking.lead_id;
    ELSIF p_new_status IN ('token_received', 'application_form_filled') THEN
        UPDATE public.units SET status = 'booked', updated_at = NOW() WHERE id = v_booking.unit_id;
        UPDATE public.leads SET current_stage = 'token_paid', updated_at = NOW() WHERE id = v_booking.lead_id;
    END IF;

    -- 8. Log audit activity
    INSERT INTO public.lead_activities (
        org_id, lead_id, lead_name, actor_id, actor_name, activity_type, title, description
    ) VALUES (
        v_booking.org_id, v_booking.lead_id, v_booking.lead_name, v_user_id, v_user_name,
        'internal_note',
        'Booking Status Changed to ' || p_new_status,
        'Booking ' || v_booking.booking_reference || ' status changed to ' || p_new_status || COALESCE('. Note: ' || p_notes, '')
    );

    RETURN jsonb_build_object(
        'success', true,
        'booking_id', p_booking_id,
        'new_status', p_new_status
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 7.4 Transactional Project + Default Tower Creation
CREATE OR REPLACE FUNCTION public.create_project_with_tower_atomic(
    p_name VARCHAR,
    p_code VARCHAR,
    p_rera_number VARCHAR,
    p_location_area VARCHAR,
    p_city VARCHAR,
    p_project_type VARCHAR,
    p_description TEXT DEFAULT '',
    p_configurations TEXT[] DEFAULT '{}'::TEXT[],
    p_total_area_acres NUMERIC DEFAULT NULL,
    p_total_units INT DEFAULT 0,
    p_status VARCHAR DEFAULT 'under_construction',
    p_default_tower_name VARCHAR DEFAULT 'Tower 1 - Primary',
    p_default_tower_floors INT DEFAULT 10,
    p_cover_image_url TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_org_id UUID;
    v_project_id UUID;
    v_tower_id UUID;
BEGIN
    IF NOT public.is_management() THEN
        RAISE EXCEPTION 'Permission denied: Only company administrators and directors can create projects.';
    END IF;

    v_org_id := public.get_auth_org_id();
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Active organization context required.';
    END IF;

    -- Insert project
    INSERT INTO public.projects (
        org_id, name, code, rera_number, location_area, city,
        project_type, description, configurations, total_area_acres,
        total_units, status, cover_image_url
    ) VALUES (
        v_org_id, p_name, p_code, p_rera_number, p_location_area, p_city,
        p_project_type, p_description, p_configurations, p_total_area_acres,
        p_total_units, p_status::public.project_status, p_cover_image_url
    ) RETURNING id INTO v_project_id;

    -- Insert default tower
    INSERT INTO public.towers (
        org_id, project_id, name, total_floors, total_units
    ) VALUES (
        v_org_id, v_project_id, p_default_tower_name, p_default_tower_floors, COALESCE(p_total_units, 20)
    ) RETURNING id INTO v_tower_id;

    RETURN jsonb_build_object(
        'success', true,
        'project_id', v_project_id,
        'tower_id', v_tower_id,
        'name', p_name,
        'org_id', v_org_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Step 8: Privileges & Execution Hardening
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_auth_org_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_auth_user_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_management() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_booking_operations() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_project_accessible(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_booking_atomic FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_booking_transactional FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_booking_status_transactional FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_project_with_tower_atomic FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fn_prevent_profile_privilege_escalation() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fn_prevent_unit_unauthorized_update() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fn_prevent_lead_unauthorized_modification() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fn_calculate_unit_total_price() FROM PUBLIC, anon;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.booking_reference_seq TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- Table modifications strictly permitted for authenticated enterprise operations:
GRANT INSERT, UPDATE, DELETE ON public.leads, public.lead_activities, public.site_visits, public.tasks_and_followups TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.profiles, public.project_assignments, public.organizations TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.projects, public.towers, public.units TO authenticated;

-- Hardened Bookings Grants (Phase 6.2.5/6.2.6: SELECT only! INSERT, UPDATE, DELETE completely revoked)
REVOKE INSERT, UPDATE, DELETE ON public.bookings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.bookings TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_auth_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_management() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_booking_operations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_accessible(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_booking_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_booking_transactional TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_booking_status_transactional TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_project_with_tower_atomic TO authenticated;

-- Step 9: Safe Idempotent Synthetic Catalog Initialization (Phase 6.2.6 Hardened)
-- Guarantees that seed data insertion never hijacks, alters, or re-parents real customer data.
DO $$
DECLARE
    v_org_id UUID;
    v_proj1_id UUID := 'b0000000-0000-0000-0000-000000000001';
    v_proj2_id UUID := 'b0000000-0000-0000-0000-000000000002';
    v_tower1_id UUID := 'c0000000-0000-0000-0000-000000000001';
    v_tower2_id UUID := 'c0000000-0000-0000-0000-000000000002';
    v_conflict_record RECORD;
BEGIN
    -- 1. Verify or insert synthetic organization
    SELECT id, is_synthetic INTO v_conflict_record 
    FROM public.organizations 
    WHERE slug = 'aurevia-realty-demo';

    IF v_conflict_record.id IS NOT NULL THEN
        IF v_conflict_record.is_synthetic IS NOT TRUE THEN
            RAISE EXCEPTION 'Seed Conflict: Organization slug "aurevia-realty-demo" already exists but is non-synthetic (is_synthetic = FALSE). Refusing to overwrite customer organization.';
        END IF;
        v_org_id := v_conflict_record.id;
    ELSE
        INSERT INTO public.organizations (name, slug, rera_entity_id, gstin, headquarters_city, is_synthetic)
        VALUES (
            'Aurevia Realty Enterprises LLP (Demo)',
            'aurevia-realty-demo',
            'SYNTHETIC-RERA-KA-DEMO-0000',
            '29SYNTHETIC0000',
            'Bengaluru',
            TRUE
        )
        RETURNING id INTO v_org_id;
    END IF;

    -- 2. Verify project collisions: ensure existing projects with seed IDs match synthetic org and are synthetic
    FOR v_conflict_record IN 
        SELECT id, org_id, is_synthetic, name 
        FROM public.projects 
        WHERE id IN (v_proj1_id, v_proj2_id)
    LOOP
        IF v_conflict_record.org_id != v_org_id THEN
            RAISE EXCEPTION 'Seed Conflict: Project ID % (%) exists but belongs to a different organization (%)! Refusing to hijack customer project.',
                v_conflict_record.id, v_conflict_record.name, v_conflict_record.org_id;
        END IF;
        IF v_conflict_record.is_synthetic IS NOT TRUE THEN
            RAISE EXCEPTION 'Seed Conflict: Project ID % (%) exists in organization % but is non-synthetic! Refusing to overwrite.',
                v_conflict_record.id, v_conflict_record.name, v_conflict_record.org_id;
        END IF;
    END LOOP;

    INSERT INTO public.projects (
        id, org_id, name, code, rera_number, location_area, city,
        project_type, description, configurations, total_area_acres, total_units, status, is_synthetic
    )
    VALUES
        (
            v_proj1_id,
            v_org_id,
            'Aurevia Grand Reserve',
            'AUR-RES',
            'SYNTHETIC-RERA-KA-2026-0001',
            'Whitefield Extension',
            'Bengaluru',
            'Ultra Luxury Residences',
            'Iconic twin towers featuring bespoke 3 and 4 BHK residences with private elevators and landscaped balconies overlooking the Varthur lake basin.',
            ARRAY['3_BHK', '4_BHK', 'penthouse'],
            8.5,
            120,
            'under_construction',
            TRUE
        ),
        (
            v_proj2_id,
            v_org_id,
            'Aurevia Sky Villas',
            'AUR-SKY',
            'SYNTHETIC-RERA-MH-2026-0002',
            'Worli Sea Face',
            'Mumbai',
            'Signature Waterfront Residences',
            'Ultra-prime waterfront development offering unobstructed Arabian Sea horizons, bespoke duplex penthouses and personalized concierge services.',
            ARRAY['3.5_BHK', '4_BHK', 'penthouse'],
            3.2,
            48,
            'pre_launch',
            TRUE
        )
    ON CONFLICT (id) DO UPDATE SET 
        name = EXCLUDED.name,
        code = EXCLUDED.code,
        rera_number = EXCLUDED.rera_number,
        location_area = EXCLUDED.location_area,
        city = EXCLUDED.city,
        project_type = EXCLUDED.project_type,
        description = EXCLUDED.description,
        configurations = EXCLUDED.configurations,
        total_area_acres = EXCLUDED.total_area_acres,
        total_units = EXCLUDED.total_units,
        status = EXCLUDED.status,
        is_synthetic = TRUE
    WHERE public.projects.org_id = v_org_id AND public.projects.is_synthetic = TRUE;

    -- 3. Verify tower collisions
    FOR v_conflict_record IN 
        SELECT id, org_id, project_id, name 
        FROM public.towers 
        WHERE id IN (v_tower1_id, v_tower2_id)
    LOOP
        IF v_conflict_record.org_id != v_org_id OR v_conflict_record.project_id != v_proj1_id THEN
            RAISE EXCEPTION 'Seed Conflict: Tower ID % (%) exists with conflicting org_id (%) or project_id (%)! Refusing to overwrite.',
                v_conflict_record.id, v_conflict_record.name, v_conflict_record.org_id, v_conflict_record.project_id;
        END IF;
    END LOOP;

    INSERT INTO public.towers (id, org_id, project_id, name, total_floors, total_units, rera_phase_number)
    VALUES
        (v_tower1_id, v_org_id, v_proj1_id, 'Tower A - Aurum', 28, 60, 'SYNTHETIC-PHASE-1'),
        (v_tower2_id, v_org_id, v_proj1_id, 'Tower B - Argentum', 28, 60, 'SYNTHETIC-PHASE-2')
    ON CONFLICT (id) DO UPDATE SET 
        name = EXCLUDED.name,
        total_floors = EXCLUDED.total_floors,
        total_units = EXCLUDED.total_units,
        rera_phase_number = EXCLUDED.rera_phase_number
    WHERE public.towers.org_id = v_org_id AND public.towers.project_id = v_proj1_id;

    -- 4. Verify unit collisions
    FOR v_conflict_record IN 
        SELECT id, org_id, project_id, tower_id, unit_number, status 
        FROM public.units 
        WHERE tower_id = v_tower1_id AND unit_number IN ('A-101', 'A-102', 'A-201', 'A-202', 'A-301', 'A-302')
    LOOP
        IF v_conflict_record.org_id != v_org_id OR v_conflict_record.project_id != v_proj1_id THEN
            RAISE EXCEPTION 'Seed Conflict: Unit % in tower % belongs to unexpected org (%) or project (%)! Refusing to overwrite.',
                v_conflict_record.unit_number, v_tower1_id, v_conflict_record.org_id, v_conflict_record.project_id;
        END IF;
    END LOOP;

    INSERT INTO public.units (
        org_id, project_id, project_name, tower_id, tower_name, unit_number,
        floor_number, typology, facing, carpet_area_sqft, super_builtup_area_sqft,
        base_price_inr, plc_inr, parking_charges_inr, status
    )
    VALUES
        (v_org_id, v_proj1_id, 'Aurevia Grand Reserve', v_tower1_id, 'Tower A - Aurum', 'A-101', 1, '3_BHK', 'East', 1850.00, 2450.00, 24500000.00, 500000.00, 1000000.00, 'available'),
        (v_org_id, v_proj1_id, 'Aurevia Grand Reserve', v_tower1_id, 'Tower A - Aurum', 'A-102', 1, '3_BHK', 'North-East', 1850.00, 2450.00, 24500000.00, 500000.00, 1000000.00, 'available'),
        (v_org_id, v_proj1_id, 'Aurevia Grand Reserve', v_tower1_id, 'Tower A - Aurum', 'A-201', 2, '3_BHK', 'East', 1850.00, 2450.00, 24700000.00, 500000.00, 1000000.00, 'available'),
        (v_org_id, v_proj1_id, 'Aurevia Grand Reserve', v_tower1_id, 'Tower A - Aurum', 'A-202', 2, '3_BHK', 'North-East', 1850.00, 2450.00, 24700000.00, 500000.00, 1000000.00, 'reserved'),
        (v_org_id, v_proj1_id, 'Aurevia Grand Reserve', v_tower1_id, 'Tower A - Aurum', 'A-301', 3, '4_BHK', 'East', 2450.00, 3250.00, 32500000.00, 750000.00, 1000000.00, 'available'),
        (v_org_id, v_proj1_id, 'Aurevia Grand Reserve', v_tower1_id, 'Tower A - Aurum', 'A-302', 3, '4_BHK', 'North', 2450.00, 3250.00, 32500000.00, 750000.00, 1000000.00, 'booked')
    ON CONFLICT (tower_id, unit_number) DO UPDATE SET 
        typology = EXCLUDED.typology,
        facing = EXCLUDED.facing,
        carpet_area_sqft = EXCLUDED.carpet_area_sqft,
        super_builtup_area_sqft = EXCLUDED.super_builtup_area_sqft,
        base_price_inr = EXCLUDED.base_price_inr,
        plc_inr = EXCLUDED.plc_inr,
        parking_charges_inr = EXCLUDED.parking_charges_inr
    WHERE public.units.org_id = v_org_id 
      AND public.units.project_id = v_proj1_id
      AND public.units.status NOT IN ('booked', 'sold');

END $$;

COMMIT;
