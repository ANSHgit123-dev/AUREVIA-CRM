-- ============================================================================
-- AUREVIA CRM — 002_SECURITY_AND_RLS.SQL
-- Security Definer Helpers, Object Privileges, and Row Level Security Policies
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_auth_org_id()
RETURNS UUID 
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT org_id FROM public.profiles WHERE id = auth.uid() AND is_active = TRUE;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS public.user_role 
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid() AND is_active = TRUE;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION public.is_management()
RETURNS BOOLEAN 
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT role IN ('super_admin', 'director') 
    FROM public.profiles WHERE id = auth.uid() AND is_active = TRUE;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION public.is_project_accessible(p_project_id UUID)
RETURNS BOOLEAN
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_role public.user_role;
    v_org_id UUID;
BEGIN
    SELECT org_id, role INTO v_org_id, v_role
    FROM public.profiles
    WHERE id = auth.uid() AND is_active = TRUE;

    IF v_org_id IS NULL THEN
        RETURN FALSE;
    END IF;

    IF v_role IN ('super_admin', 'director') THEN
        RETURN EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = p_project_id AND org_id = v_org_id
        );
    ELSIF v_role = 'sales_manager' THEN
        RETURN EXISTS (
            SELECT 1 FROM public.project_assignments 
            WHERE project_id = p_project_id AND profile_id = auth.uid() AND org_id = v_org_id
        );
    ELSE
        RETURN EXISTS (
            SELECT 1 FROM public.project_assignments 
            WHERE project_id = p_project_id AND profile_id = auth.uid() AND org_id = v_org_id
        ) OR EXISTS (
            SELECT 1 FROM public.leads 
            WHERE project_id = p_project_id 
              AND org_id = v_org_id 
              AND (assigned_sales_executive_id = auth.uid() OR assigned_presales_id = auth.uid())
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Privileges
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, public;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, public;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT ON public.lead_activities TO authenticated;
GRANT INSERT, UPDATE ON public.site_visits, public.tasks_and_followups TO authenticated;

REVOKE INSERT, UPDATE ON public.leads FROM authenticated;
GRANT INSERT (
    org_id, project_id, first_name, last_name, email, phone, whatsapp_number, 
    city, budget_min_inr, budget_max_inr, preferred_typology, source, 
    channel_partner_name, priority
) ON public.leads TO authenticated;

GRANT UPDATE (
    first_name, last_name, email, phone, whatsapp_number, city, 
    budget_min_inr, budget_max_inr, preferred_typology, priority,
    lost_reason, next_follow_up_at
) ON public.leads TO authenticated;

REVOKE UPDATE ON public.units FROM authenticated;
GRANT UPDATE (floor_plan_url) ON public.units TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.bookings FROM authenticated;

-- Row Level Security
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

CREATE POLICY "org_select" ON public.organizations FOR SELECT TO authenticated
    USING (id = public.get_auth_org_id());

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated
    USING (org_id = public.get_auth_org_id());

CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated
    USING (id = auth.uid() AND org_id = public.get_auth_org_id())
    WITH CHECK (id = auth.uid() AND org_id = public.get_auth_org_id());

CREATE POLICY "projects_select" ON public.projects FOR SELECT TO authenticated
    USING (org_id = public.get_auth_org_id() AND public.is_project_accessible(id));

CREATE POLICY "projects_write" ON public.projects FOR ALL TO authenticated
    USING (org_id = public.get_auth_org_id() AND public.is_management())
    WITH CHECK (org_id = public.get_auth_org_id() AND public.is_management());

CREATE POLICY "pa_select" ON public.project_assignments FOR SELECT TO authenticated
    USING (org_id = public.get_auth_org_id());

CREATE POLICY "pa_write" ON public.project_assignments FOR ALL TO authenticated
    USING (org_id = public.get_auth_org_id() AND public.is_management())
    WITH CHECK (org_id = public.get_auth_org_id() AND public.is_management());

CREATE POLICY "towers_select" ON public.towers FOR SELECT TO authenticated
    USING (org_id = public.get_auth_org_id() AND public.is_project_accessible(project_id));

CREATE POLICY "units_select" ON public.units FOR SELECT TO authenticated
    USING (org_id = public.get_auth_org_id() AND public.is_project_accessible(project_id));

CREATE POLICY "leads_select" ON public.leads FOR SELECT TO authenticated
    USING (
        org_id = public.get_auth_org_id() AND (
            public.is_management()
            OR (public.get_auth_user_role() = 'sales_manager' AND public.is_project_accessible(project_id))
            OR assigned_sales_executive_id = auth.uid()
            OR assigned_presales_id = auth.uid()
        )
    );

CREATE POLICY "leads_insert" ON public.leads FOR INSERT TO authenticated
    WITH CHECK (
        org_id = public.get_auth_org_id() 
        AND public.is_project_accessible(project_id)
    );

CREATE POLICY "leads_update" ON public.leads FOR UPDATE TO authenticated
    USING (
        org_id = public.get_auth_org_id() AND (
            public.is_management()
            OR (public.get_auth_user_role() = 'sales_manager' AND public.is_project_accessible(project_id))
            OR assigned_sales_executive_id = auth.uid()
            OR assigned_presales_id = auth.uid()
        )
    )
    WITH CHECK (org_id = public.get_auth_org_id());

CREATE POLICY "lead_act_select" ON public.lead_activities FOR SELECT TO authenticated
    USING (org_id = public.get_auth_org_id());

CREATE POLICY "lead_act_insert" ON public.lead_activities FOR INSERT TO authenticated
    WITH CHECK (org_id = public.get_auth_org_id() AND actor_id = auth.uid());

CREATE POLICY "site_visits_select" ON public.site_visits FOR SELECT TO authenticated
    USING (org_id = public.get_auth_org_id() AND public.is_project_accessible(project_id));

CREATE POLICY "site_visits_write" ON public.site_visits FOR ALL TO authenticated
    USING (org_id = public.get_auth_org_id() AND public.is_project_accessible(project_id))
    WITH CHECK (org_id = public.get_auth_org_id() AND public.is_project_accessible(project_id));

CREATE POLICY "tasks_select" ON public.tasks_and_followups FOR SELECT TO authenticated
    USING (
        org_id = public.get_auth_org_id() AND (
            public.is_management() 
            OR assigned_to = auth.uid()
            OR EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND public.is_project_accessible(l.project_id))
        )
    );

CREATE POLICY "tasks_write" ON public.tasks_and_followups FOR ALL TO authenticated
    USING (org_id = public.get_auth_org_id())
    WITH CHECK (org_id = public.get_auth_org_id());

CREATE POLICY "bookings_select" ON public.bookings FOR SELECT TO authenticated
    USING (org_id = public.get_auth_org_id() AND public.is_project_accessible(project_id));

