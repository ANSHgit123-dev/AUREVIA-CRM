-- ============================================================================
-- AUREVIA CRM — 005_PHASE6_RBAC_AND_OPERATIONS.SQL
-- Phase 6: Enterprise Authentication, RBAC Matrix & Database Security Policies
-- ============================================================================

-- 1. Extend user_role ENUM to include 'company_admin' and 'booking_operations'
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'company_admin';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'booking_operations';

-- 2. Enhance profiles table with hierarchy and project tagging if missing
ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS assigned_project_ids TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- 3. Update / Replace Management and Privilege Helper Functions
CREATE OR REPLACE FUNCTION public.is_management()
RETURNS BOOLEAN 
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
          AND role IN ('company_admin', 'super_admin', 'director') 
          AND is_active = TRUE
    );
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION public.is_booking_operations()
RETURNS BOOLEAN 
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
          AND role IN ('booking_operations', 'company_admin', 'super_admin', 'director') 
          AND is_active = TRUE
    );
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION public.is_sales_manager()
RETURNS BOOLEAN 
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
          AND role IN ('sales_manager', 'company_admin', 'super_admin', 'director') 
          AND is_active = TRUE
    );
$$ LANGUAGE sql;

-- 4. Dynamic Project Access Check
CREATE OR REPLACE FUNCTION public.is_project_accessible(p_project_id UUID)
RETURNS BOOLEAN
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_role public.user_role;
    v_org_id UUID;
    v_assigned_projects TEXT[];
BEGIN
    SELECT org_id, role, assigned_project_ids INTO v_org_id, v_role, v_assigned_projects
    FROM public.profiles
    WHERE id = auth.uid() AND is_active = TRUE;

    IF v_org_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Company Admin and Directors have enterprise-wide access
    IF v_role IN ('company_admin', 'super_admin', 'director') THEN
        RETURN EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = p_project_id AND org_id = v_org_id
        );
    END IF;

    -- Booking Operations has visibility into all projects for contract/allotment operations
    IF v_role = 'booking_operations' THEN
        RETURN EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = p_project_id AND org_id = v_org_id
        );
    END IF;

    -- Managers, Presales & Sales Executives: verify project assignments
    IF p_project_id::text = ANY(v_assigned_projects) THEN
        RETURN TRUE;
    END IF;

    -- Fallback to project_assignments table if configured
    RETURN EXISTS (
        SELECT 1 FROM public.project_assignments 
        WHERE project_id = p_project_id AND profile_id = auth.uid() AND org_id = v_org_id
    );
END;
$$ LANGUAGE plpgsql;

-- 5. Strict Profile Security: Only Administrators & Directors can provision or alter accounts
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_write" ON public.profiles;

-- Any authenticated active employee can read profiles within their organization directory
CREATE POLICY "profiles_select" ON public.profiles 
    FOR SELECT TO authenticated
    USING (org_id = public.get_auth_org_id());

-- Users can update non-critical aspects of their own profile
CREATE POLICY "profiles_update_self" ON public.profiles 
    FOR UPDATE TO authenticated
    USING (id = auth.uid() AND org_id = public.get_auth_org_id())
    WITH CHECK (
        id = auth.uid() 
        AND org_id = public.get_auth_org_id()
        -- Prevent privilege escalation (cannot alter role or is_active)
        AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
        AND is_active = (SELECT is_active FROM public.profiles WHERE id = auth.uid())
    );

-- Only Company Admin or Director can create or alter employee accounts and roles
CREATE POLICY "profiles_admin_manage" ON public.profiles 
    FOR ALL TO authenticated
    USING (public.is_management() AND org_id = public.get_auth_org_id())
    WITH CHECK (public.is_management() AND org_id = public.get_auth_org_id());

-- 6. Role-Scoped Lead Access Policies
DROP POLICY IF EXISTS "leads_select" ON public.leads;
DROP POLICY IF EXISTS "leads_insert" ON public.leads;
DROP POLICY IF EXISTS "leads_update" ON public.leads;

CREATE POLICY "leads_select" ON public.leads 
    FOR SELECT TO authenticated
    USING (
        org_id = public.get_auth_org_id() AND (
            -- 1. Management has complete visibility
            public.is_management()
            -- 2. Booking operations can view leads for booking verification
            OR public.is_booking_operations()
            -- 3. Sales Manager can view all leads across their assigned projects
            OR (public.get_auth_user_role() = 'sales_manager' AND public.is_project_accessible(project_id))
            -- 4. Presales Agent can view unassigned leads or leads assigned to them for qualification
            OR (public.get_auth_user_role() = 'presales_agent' AND (assigned_presales_id = auth.uid() OR assigned_sales_executive_id IS NULL))
            -- 5. Sales Executive can only view leads explicitly assigned to them
            OR (public.get_auth_user_role() = 'sales_executive' AND assigned_sales_executive_id = auth.uid())
        )
    );

CREATE POLICY "leads_insert" ON public.leads 
    FOR INSERT TO authenticated
    WITH CHECK (
        org_id = public.get_auth_org_id() 
        AND public.is_project_accessible(project_id)
        -- Booking Operations cannot ingest new leads
        AND public.get_auth_user_role() != 'booking_operations'
    );

CREATE POLICY "leads_update" ON public.leads 
    FOR UPDATE TO authenticated
    USING (
        org_id = public.get_auth_org_id() AND (
            public.is_management()
            OR (public.get_auth_user_role() = 'sales_manager' AND public.is_project_accessible(project_id))
            OR (public.get_auth_user_role() = 'presales_agent' AND (assigned_presales_id = auth.uid() OR assigned_sales_executive_id IS NULL))
            OR (public.get_auth_user_role() = 'sales_executive' AND assigned_sales_executive_id = auth.uid())
        )
    )
    WITH CHECK (org_id = public.get_auth_org_id());

-- 7. Role-Scoped Booking Policies
DROP POLICY IF EXISTS "bookings_select" ON public.bookings;
DROP POLICY IF EXISTS "bookings_write" ON public.bookings;

CREATE POLICY "bookings_select" ON public.bookings 
    FOR SELECT TO authenticated
    USING (
        org_id = public.get_auth_org_id() AND (
            public.is_management()
            OR public.is_booking_operations()
            OR (public.get_auth_user_role() = 'sales_manager' AND public.is_project_accessible(project_id))
            OR (public.get_auth_user_role() = 'sales_executive' AND booked_by = auth.uid())
        )
    );

CREATE POLICY "bookings_write" ON public.bookings 
    FOR ALL TO authenticated
    USING (
        org_id = public.get_auth_org_id() AND (
            public.is_management()
            OR public.is_booking_operations()
        )
    )
    WITH CHECK (
        org_id = public.get_auth_org_id() AND (
            public.is_management()
            OR public.is_booking_operations()
        )
    );

-- 8. Stored Procedure for Admin-Driven Employee Provisioning
CREATE OR REPLACE FUNCTION public.provision_employee_account(
    p_email TEXT,
    p_full_name TEXT,
    p_role public.user_role,
    p_phone TEXT DEFAULT NULL,
    p_manager_id UUID DEFAULT NULL,
    p_assigned_project_ids TEXT[] DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_org_id UUID;
    v_new_id UUID;
BEGIN
    -- Verify caller has management authority
    IF NOT public.is_management() THEN
        RAISE EXCEPTION 'Authorization denied: Only Company Administrators and Directors can provision employee profiles.';
    END IF;

    SELECT org_id INTO v_org_id FROM public.profiles WHERE id = auth.uid();
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Organization context not found for actor.';
    END IF;

    -- Check if email already registered
    IF EXISTS (SELECT 1 FROM public.profiles WHERE email = LOWER(TRIM(p_email)) AND org_id = v_org_id) THEN
        RAISE EXCEPTION 'An employee profile with email % already exists.', p_email;
    END IF;

    v_new_id := gen_random_uuid();

    INSERT INTO public.profiles (
        id,
        org_id,
        email,
        full_name,
        role,
        phone,
        manager_id,
        assigned_project_ids,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        v_new_id,
        v_org_id,
        LOWER(TRIM(p_email)),
        TRIM(p_full_name),
        p_role,
        p_phone,
        p_manager_id,
        p_assigned_project_ids,
        TRUE,
        NOW(),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'profile_id', v_new_id,
        'email', LOWER(TRIM(p_email)),
        'role', p_role
    );
END;
$$;

