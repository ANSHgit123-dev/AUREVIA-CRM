-- ============================================================================
-- AUREVIA CRM — 004_SYNTHETIC_DEMO_SEED.SQL
-- Realistic Indian Real Estate Synthetic Dataset
-- ============================================================================

DO $$
DECLARE
    v_org_id UUID;
    v_admin_id UUID := gen_random_uuid();
    v_manager_id UUID := gen_random_uuid();
    v_exec1_id UUID := gen_random_uuid();
    v_exec2_id UUID := gen_random_uuid();
    v_presales_id UUID := gen_random_uuid();
    
    v_proj1_id UUID;
    v_proj2_id UUID;
    
    v_tower_a UUID;
    v_tower_b UUID;
    v_tower_t1 UUID;
    
    v_unit1 UUID;
    v_unit2 UUID;
    v_unit3 UUID;
    
    v_lead1 UUID;
    v_lead2 UUID;
    v_lead3 UUID;
BEGIN
    -- 1. Organization
    INSERT INTO public.organizations (name, slug, rera_entity_id, gstin, headquarters_city, is_synthetic)
    VALUES (
        'Aurevia Real Estate Developers [DEMO]',
        'aurevia-demo',
        'SYNTHETIC-RERA-MAHA-DEV-DEMO-001',
        '27AAACA0000A1Z5',
        'Mumbai',
        TRUE
    ) RETURNING id INTO v_org_id;

    -- 2. Profiles (Staff & Hierarchy)
    INSERT INTO public.profiles (id, org_id, email, full_name, phone, role, monthly_sales_target_inr)
    VALUES
        (v_admin_id, v_org_id, 'vikram.mehta@aurevia.demo', 'Vikram Mehta', '+919820011223', 'director', 150000000),
        (v_manager_id, v_org_id, 'suresh.menon@aurevia.demo', 'Suresh Menon', '+919820011224', 'sales_manager', 100000000),
        (v_exec1_id, v_org_id, 'arjun.verma@aurevia.demo', 'Arjun Verma', '+919820011225', 'sales_executive', 50000000),
        (v_exec2_id, v_org_id, 'priya.nair@aurevia.demo', 'Priya Nair', '+919820011226', 'sales_executive', 50000000),
        (v_presales_id, v_org_id, 'rohit.sharma@aurevia.demo', 'Rohit Sharma', '+919820011227', 'presales_agent', 0);

    -- 3. Projects
    INSERT INTO public.projects (org_id, name, code, rera_number, location_area, city, project_type, total_area_acres, total_units, status)
    VALUES
        (v_org_id, 'Aurevia Grandeur [DEMO]', 'AUR-GRD', 'SYNTHETIC-RERA-MAHA-P51900-DEMO', 'Worli Sea Face', 'Mumbai', 'Ultra Luxury High-Rise', 4.5, 120, 'under_construction'),
        (v_org_id, 'Aurevia Greenfields [DEMO]', 'AUR-GRN', 'SYNTHETIC-RERA-KA-PRM446-DEMO', 'Whitefield', 'Bengaluru', 'Premium Eco Residences', 12.0, 350, 'under_construction')
    RETURNING id INTO v_proj1_id;

    SELECT id INTO v_proj2_id FROM public.projects WHERE code = 'AUR-GRN';

    -- Project Assignments: Suresh Menon manages Aurevia Grandeur
    INSERT INTO public.project_assignments (org_id, project_id, profile_id)
    VALUES 
        (v_org_id, v_proj1_id, v_manager_id),
        (v_org_id, v_proj1_id, v_exec1_id),
        (v_org_id, v_proj2_id, v_exec2_id);

    -- 4. Towers
    INSERT INTO public.towers (org_id, project_id, name, total_floors, total_units, rera_phase_number)
    VALUES
        (v_org_id, v_proj1_id, 'Tower A - Aurelia', 28, 56, 'PHASE-1-TWR-A'),
        (v_org_id, v_proj1_id, 'Tower B - Bellisima', 28, 56, 'PHASE-1-TWR-B')
    RETURNING id INTO v_tower_a;

    SELECT id INTO v_tower_b FROM public.towers WHERE name = 'Tower B - Bellisima';

    INSERT INTO public.towers (org_id, project_id, name, total_floors, total_units, rera_phase_number)
    VALUES (v_org_id, v_proj2_id, 'Tower 1 - Cedar', 14, 84, 'PHASE-1-TWR-1')
    RETURNING id INTO v_tower_t1;

    -- 5. Units
    INSERT INTO public.units (
        org_id, project_id, tower_id, unit_number, floor_number, typology, facing,
        carpet_area_sqft, super_builtup_area_sqft, base_price_inr, plc_inr, parking_charges_inr, status
    ) VALUES
        (v_org_id, v_proj1_id, v_tower_a, 'A-1401', 14, '3_BHK', 'Sea Facing', 1650, 2200, 52000000, 2500000, 1000000, 'available'),
        (v_org_id, v_proj1_id, v_tower_a, 'A-1402', 14, '3_BHK', 'East Facing', 1650, 2200, 50000000, 1500000, 1000000, 'available'),
        (v_org_id, v_proj1_id, v_tower_a, 'A-2401', 24, 'penthouse', '360 Panoramic', 3800, 5100, 120000000, 5000000, 2000000, 'token_received')
    RETURNING id INTO v_unit1;

    SELECT id INTO v_unit2 FROM public.units WHERE unit_number = 'A-1402';
    SELECT id INTO v_unit3 FROM public.units WHERE unit_number = 'A-2401';

    -- 6. Leads
    INSERT INTO public.leads (
        org_id, project_id, first_name, last_name, email, phone, city,
        budget_min_inr, budget_max_inr, preferred_typology, source, priority,
        current_stage, assigned_sales_executive_id, interested_unit_id
    ) VALUES
        (v_org_id, v_proj1_id, 'Rajesh', 'Singhania', 'rajesh.singhania@corp.demo', '+919820144556', 'Mumbai', 65000000, 90000000, '4_BHK', 'channel_partner', 'hot', 'negotiation', v_exec1_id, v_unit1),
        (v_org_id, v_proj1_id, 'Pooja', 'Deshmukh', 'pooja.deshmukh@gmail.demo', '+919876522334', 'Mumbai', 45000000, 55000000, '3_BHK', 'meta_ads', 'hot', 'site_visit_scheduled', v_exec2_id, v_unit2),
        (v_org_id, v_proj1_id, 'Deepak', 'Chopra', 'd.chopra@investment.demo', '+919833355667', 'Mumbai', 110000000, 145000000, 'penthouse', 'walk_in', 'hot', 'token_paid', v_admin_id, v_unit3)
    RETURNING id INTO v_lead1;

    SELECT id INTO v_lead2 FROM public.leads WHERE phone = '+919876522334';
    SELECT id INTO v_lead3 FROM public.leads WHERE phone = '+919833355667';

    -- 7. Bookings
    INSERT INTO public.bookings (
        org_id, project_id, unit_id, lead_id, closing_executive_id,
        booking_reference, token_amount_inr, agreed_total_price_inr,
        payment_mode, status
    ) VALUES (
        v_org_id, v_proj1_id, v_unit3, v_lead3, v_admin_id,
        'AUR-BK-2026-0041', 1500000, 127000000, 'neft_rtgs', 'token_received'
    );

    -- 8. Activities
    INSERT INTO public.lead_activities (org_id, lead_id, actor_id, activity_type, title, description, metadata)
    VALUES
        (v_org_id, v_lead3, v_admin_id, 'stage_change', 'Booking Token Received: Unit A-2401', 'Booking advance token of ₹15.00 L received via RTGS.', '{"token": 1500000}'),
        (v_org_id, v_lead1, v_exec1_id, 'internal_note', 'Unit A-1401 Inspected', 'Client inspected sample flat. Negotiation on parking allotment underway.', '{"unit_id": "A-1401"}');
END;
$$;

