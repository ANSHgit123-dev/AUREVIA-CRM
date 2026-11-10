-- ============================================================================
-- AUREVIA CRM — 003_TRANSACTIONAL_RPCS.SQL
-- Concurrency-Safe Stored Procedures (reserve, release, book, cancel, reassign)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reserve_unit_transactional(
    p_unit_id UUID,
    p_lead_id UUID,
    p_hold_duration_hours INT DEFAULT 24
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_user_role public.user_role;
    v_org_id UUID;
    v_unit RECORD;
    v_lead RECORD;
    v_now TIMESTAMPTZ := NOW();
    v_new_expiry TIMESTAMPTZ;
    v_action_type VARCHAR(50);
    v_max_duration_hours INT;
BEGIN
    SELECT org_id, role INTO v_org_id, v_user_role 
    FROM public.profiles 
    WHERE id = v_user_id AND is_active = TRUE;

    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Access Denied: Unauthenticated or inactive session.' USING ERRCODE = '42501';
    END IF;

    IF v_user_role = 'presales_agent' THEN
        RAISE EXCEPTION 'Permission Denied: Presales agents cannot lock inventory.' USING ERRCODE = '42501';
    END IF;

    IF p_hold_duration_hours IS NULL OR p_hold_duration_hours <= 0 THEN
        RAISE EXCEPTION 'Validation Error: Hold duration must be positive.' USING ERRCODE = '22023';
    END IF;

    IF v_user_role = 'sales_executive' THEN
        v_max_duration_hours := 48;
    ELSE
        v_max_duration_hours := 168;
    END IF;

    IF p_hold_duration_hours > v_max_duration_hours THEN
        RAISE EXCEPTION 'Policy Violation: Maximum reservation duration for % is % hours.', v_user_role, v_max_duration_hours
            USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id;
    IF NOT FOUND OR v_lead.org_id != v_org_id THEN
        RAISE EXCEPTION 'Integrity Error: Lead not found or belongs to another organization.' USING ERRCODE = '23503';
    END IF;

    IF v_lead.current_stage IN ('booked', 'lost') THEN
        RAISE EXCEPTION 'Business Rule Violation: Cannot reserve inventory for closed or lost leads.' USING ERRCODE = '22000';
    END IF;

    IF v_user_role = 'sales_executive' THEN
        IF v_lead.assigned_sales_executive_id IS NULL OR v_lead.assigned_sales_executive_id != v_user_id THEN
            RAISE EXCEPTION 'Authorization Error: Sales executives can only reserve units for their explicitly assigned leads.'
                USING ERRCODE = '42501';
        END IF;
    ELSIF v_user_role = 'sales_manager' THEN
        IF NOT public.is_project_accessible(v_lead.project_id) THEN
            RAISE EXCEPTION 'Scope Error: Sales manager is not assigned to project %.', v_lead.project_id USING ERRCODE = '42501';
        END IF;
    END IF;

    SELECT * INTO v_unit FROM public.units WHERE id = p_unit_id AND org_id = v_org_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Integrity Error: Unit not found in organization.' USING ERRCODE = '23503';
    END IF;

    IF v_unit.project_id != v_lead.project_id THEN
        RAISE EXCEPTION 'Project Mismatch: Unit project (%) does not match lead project (%).', v_unit.project_id, v_lead.project_id
            USING ERRCODE = '23514';
    END IF;

    IF v_unit.status IN ('token_received', 'booked', 'sold', 'quota_reserved') THEN
        RAISE EXCEPTION 'Inventory Conflict: Unit % is in status "%" and cannot be reserved.', v_unit.unit_number, v_unit.status
            USING ERRCODE = '55P03';
    END IF;

    IF v_unit.status = 'reserved' THEN
        IF v_unit.reserved_until > v_now THEN
            IF v_unit.reserved_by = v_user_id THEN
                IF v_unit.reserved_lead_id != p_lead_id THEN
                    RAISE EXCEPTION 'Policy Violation: Unit % is currently reserved by you for another lead. Release it first.', v_unit.unit_number
                        USING ERRCODE = '22000';
                ELSE
                    v_action_type := 'EXTEND';
                END IF;
            ELSE
                IF v_user_role NOT IN ('super_admin', 'director', 'sales_manager') THEN
                    RAISE EXCEPTION 'Lock Conflict: Unit % is active on hold by another executive until %.',
                        v_unit.unit_number, TO_CHAR(v_unit.reserved_until, 'YYYY-MM-DD HH24:MI:SS')
                        USING ERRCODE = '55P03';
                END IF;
                v_action_type := 'OVERRIDE';
            END IF;
        ELSE
            v_action_type := 'EXPIRED_REASSIGN';
        END IF;
    ELSE
        v_action_type := 'RESERVE';
    END IF;

    IF v_action_type IN ('OVERRIDE', 'EXPIRED_REASSIGN') AND v_unit.reserved_lead_id IS NOT NULL AND v_unit.reserved_lead_id != p_lead_id THEN
        UPDATE public.leads 
        SET interested_unit_id = NULL, updated_at = v_now
        WHERE id = v_unit.reserved_lead_id AND interested_unit_id = p_unit_id;

        INSERT INTO public.lead_activities (
            org_id, lead_id, actor_id, activity_type, title, description, metadata
        ) VALUES (
            v_org_id,
            v_unit.reserved_lead_id,
            v_user_id,
            'internal_note',
            'Reservation Hold Cleared on Unit ' || v_unit.unit_number,
            CASE 
                WHEN v_action_type = 'OVERRIDE' THEN 'Hold was transferred to another prospect by management override.'
                ELSE 'Hold expired and inventory was reallocated.'
            END,
            jsonb_build_object(
                'unit_id', p_unit_id,
                'action', v_action_type,
                'previous_held_until', v_unit.reserved_until
            )
        );
    END IF;

    v_new_expiry := v_now + (p_hold_duration_hours || ' hours')::INTERVAL;

    UPDATE public.units
    SET status = 'reserved',
        reserved_by = v_user_id,
        reserved_lead_id = p_lead_id,
        reserved_at = v_now,
        reserved_until = v_new_expiry
    WHERE id = p_unit_id;

    UPDATE public.leads
    SET interested_unit_id = p_unit_id, updated_at = v_now
    WHERE id = p_lead_id;

    INSERT INTO public.lead_activities (
        org_id, lead_id, actor_id, activity_type, title, description, metadata
    ) VALUES (
        v_org_id,
        p_lead_id,
        v_user_id,
        'internal_note',
        'Unit ' || v_unit.unit_number || ' - ' || v_action_type,
        FORMAT('Unit %s locked under hold until %s (%s hours).', v_unit.unit_number, TO_CHAR(v_new_expiry, 'YYYY-MM-DD HH24:MI:SS'), p_hold_duration_hours),
        jsonb_build_object(
            'action', v_action_type,
            'unit_id', p_unit_id,
            'unit_number', v_unit.unit_number,
            'duration_hours', p_hold_duration_hours,
            'reserved_at', v_now,
            'reserved_until', v_new_expiry,
            'previous_holder', v_unit.reserved_by
        )
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'action', v_action_type,
        'unit_id', p_unit_id,
        'unit_number', v_unit.unit_number,
        'lead_id', p_lead_id,
        'reserved_until', v_new_expiry
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.release_unit_reservation(
    p_unit_id UUID,
    p_reason TEXT DEFAULT 'Prospect uncommitted'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_user_role public.user_role;
    v_org_id UUID;
    v_unit RECORD;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    SELECT org_id, role INTO v_org_id, v_user_role FROM public.profiles WHERE id = v_user_id AND is_active = TRUE;
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Access Denied: Inactive or unauthenticated session.' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_unit FROM public.units WHERE id = p_unit_id AND org_id = v_org_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Unit not found.' USING ERRCODE = '23503';
    END IF;

    IF v_unit.status != 'reserved' THEN
        RAISE EXCEPTION 'Unit % is not currently in reserved status.', v_unit.unit_number USING ERRCODE = '22000';
    END IF;

    IF v_unit.reserved_by != v_user_id AND v_user_role NOT IN ('super_admin', 'director', 'sales_manager') THEN
        RAISE EXCEPTION 'Permission Denied: You cannot release a hold placed by another executive.' USING ERRCODE = '42501';
    END IF;

    UPDATE public.units
    SET status = 'available',
        reserved_by = NULL,
        reserved_lead_id = NULL,
        reserved_at = NULL,
        reserved_until = NULL
    WHERE id = p_unit_id;

    IF v_unit.reserved_lead_id IS NOT NULL THEN
        UPDATE public.leads
        SET interested_unit_id = NULL, updated_at = v_now
        WHERE id = v_unit.reserved_lead_id AND interested_unit_id = p_unit_id;

        INSERT INTO public.lead_activities (
            org_id, lead_id, actor_id, activity_type, title, description, metadata
        ) VALUES (
            v_org_id,
            v_unit.reserved_lead_id,
            v_user_id,
            'internal_note',
            'Reservation Released: Unit ' || v_unit.unit_number,
            'Unit hold released. Reason: ' || p_reason,
            jsonb_build_object('unit_id', p_unit_id, 'released_at', v_now, 'reason', p_reason)
        );
    END IF;

    RETURN jsonb_build_object('success', TRUE, 'unit_id', p_unit_id, 'status', 'available');
END;
$$;

CREATE OR REPLACE FUNCTION public.create_booking_transactional(
    p_unit_id UUID,
    p_lead_id UUID,
    p_token_amount_inr NUMERIC(12, 2),
    p_agreed_total_price_inr NUMERIC(14, 2),
    p_payment_mode VARCHAR(50) DEFAULT 'neft_rtgs',
    p_transaction_reference VARCHAR(100) DEFAULT NULL,
    p_booking_reference VARCHAR(100) DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_user_role public.user_role;
    v_org_id UUID;
    v_unit RECORD;
    v_lead RECORD;
    v_now TIMESTAMPTZ := NOW();
    v_booking_ref VARCHAR(100);
    v_booking_id UUID;
BEGIN
    SELECT org_id, role INTO v_org_id, v_user_role FROM public.profiles WHERE id = v_user_id AND is_active = TRUE;
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Access Denied: Inactive or unauthenticated session.' USING ERRCODE = '42501';
    END IF;

    IF v_user_role = 'presales_agent' THEN
        RAISE EXCEPTION 'Permission Denied: Presales agents cannot execute property bookings.' USING ERRCODE = '42501';
    END IF;

    IF p_token_amount_inr IS NULL OR p_token_amount_inr <= 0 THEN
        RAISE EXCEPTION 'Validation Error: Token amount must be strictly positive.' USING ERRCODE = '22023';
    END IF;

    IF p_agreed_total_price_inr IS NULL OR p_agreed_total_price_inr < p_token_amount_inr THEN
        RAISE EXCEPTION 'Validation Error: Agreed total price must be greater than or equal to token amount.' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id;
    IF NOT FOUND OR v_lead.org_id != v_org_id THEN
        RAISE EXCEPTION 'Integrity Error: Lead not found or belongs to another organization.' USING ERRCODE = '23503';
    END IF;

    IF v_lead.current_stage IN ('booked', 'lost') THEN
        RAISE EXCEPTION 'Business Rule Violation: Cannot create booking for already closed or lost lead.' USING ERRCODE = '22000';
    END IF;

    IF v_user_role = 'sales_executive' THEN
        IF v_lead.assigned_sales_executive_id IS NULL OR v_lead.assigned_sales_executive_id != v_user_id THEN
            RAISE EXCEPTION 'Authorization Error: Closers can only execute bookings for their assigned leads.' USING ERRCODE = '42501';
        END IF;
    ELSIF v_user_role = 'sales_manager' THEN
        IF NOT public.is_project_accessible(v_lead.project_id) THEN
            RAISE EXCEPTION 'Scope Error: Lead project % is outside manager assignment.', v_lead.project_id USING ERRCODE = '42501';
        END IF;
    END IF;

    SELECT * INTO v_unit FROM public.units WHERE id = p_unit_id AND org_id = v_org_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Integrity Error: Unit not found in organization.' USING ERRCODE = '23503';
    END IF;

    IF v_unit.project_id != v_lead.project_id THEN
        RAISE EXCEPTION 'Project Mismatch: Unit project (%) does not match Lead project (%).', v_unit.project_id, v_lead.project_id
            USING ERRCODE = '23514';
    END IF;

    IF v_unit.status IN ('token_received', 'booked', 'sold', 'quota_reserved') THEN
        RAISE EXCEPTION 'Inventory Conflict: Unit % is already in status "%" and cannot be booked.', v_unit.unit_number, v_unit.status
            USING ERRCODE = '55P03';
    END IF;

    IF v_unit.status = 'reserved' THEN
        IF v_unit.reserved_until > v_now THEN
            IF v_unit.reserved_lead_id != p_lead_id THEN
                IF v_user_role NOT IN ('super_admin', 'director', 'sales_manager') THEN
                    RAISE EXCEPTION 'Lock Conflict: Unit % is reserved for a different customer until %.',
                        v_unit.unit_number, TO_CHAR(v_unit.reserved_until, 'YYYY-MM-DD HH24:MI:SS')
                        USING ERRCODE = '55P03';
                END IF;
            END IF;
        END IF;
    END IF;

    IF p_booking_reference IS NOT NULL AND TRIM(p_booking_reference) != '' THEN
        v_booking_ref := p_booking_reference;
    ELSE
        v_booking_ref := 'BK-' || TO_CHAR(v_now, 'YYYYMMDD') || '-' || SUBSTRING(gen_random_uuid()::text, 1, 6);
    END IF;

    INSERT INTO public.bookings (
        org_id, project_id, unit_id, lead_id, closing_executive_id,
        booking_reference, token_amount_inr, agreed_total_price_inr,
        payment_mode, transaction_reference, status, notes
    ) VALUES (
        v_org_id, v_unit.project_id, p_unit_id, p_lead_id, v_user_id,
        v_booking_ref, p_token_amount_inr, p_agreed_total_price_inr,
        p_payment_mode, p_transaction_reference, 'token_received', p_notes
    ) RETURNING id INTO v_booking_id;

    UPDATE public.units
    SET status = 'token_received',
        reserved_by = NULL,
        reserved_lead_id = NULL,
        reserved_at = NULL,
        reserved_until = NULL
    WHERE id = p_unit_id;

    UPDATE public.leads
    SET current_stage = 'token_paid',
        interested_unit_id = p_unit_id,
        updated_at = v_now
    WHERE id = p_lead_id;

    INSERT INTO public.lead_activities (
        org_id, lead_id, actor_id, activity_type, title, description, metadata
    ) VALUES (
        v_org_id,
        p_lead_id,
        v_user_id,
        'stage_change',
        'Booking Token Collected: Unit ' || v_unit.unit_number,
        FORMAT('Token advance of ₹%s received via %s. Reference: %s.', p_token_amount_inr, p_payment_mode, v_booking_ref),
        jsonb_build_object(
            'booking_id', v_booking_id,
            'booking_reference', v_booking_ref,
            'unit_id', p_unit_id,
            'unit_number', v_unit.unit_number,
            'token_amount_inr', p_token_amount_inr,
            'agreed_total_price_inr', p_agreed_total_price_inr,
            'payment_mode', p_payment_mode
        )
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'booking_id', v_booking_id,
        'booking_reference', v_booking_ref,
        'unit_id', p_unit_id,
        'unit_number', v_unit.unit_number,
        'lead_id', p_lead_id,
        'status', 'token_received'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_booking_transactional(
    p_booking_id UUID,
    p_cancellation_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_user_role public.user_role;
    v_org_id UUID;
    v_booking RECORD;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    SELECT org_id, role INTO v_org_id, v_user_role FROM public.profiles WHERE id = v_user_id AND is_active = TRUE;
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Access Denied: Inactive or unauthenticated session.' USING ERRCODE = '42501';
    END IF;

    IF v_user_role NOT IN ('super_admin', 'director', 'sales_manager') THEN
        RAISE EXCEPTION 'Permission Denied: Only Sales Managers or Directors can cancel bookings.' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id AND org_id = v_org_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found.' USING ERRCODE = '23503';
    END IF;

    IF v_booking.status = 'cancelled_refunded' THEN
        RAISE EXCEPTION 'Booking is already cancelled.' USING ERRCODE = '22000';
    END IF;

    IF v_user_role = 'sales_manager' AND NOT public.is_project_accessible(v_booking.project_id) THEN
        RAISE EXCEPTION 'Scope Error: Booking project is outside manager assignment.' USING ERRCODE = '42501';
    END IF;

    UPDATE public.bookings
    SET status = 'cancelled_refunded',
        notes = COALESCE(notes, '') || ' [Cancelled: ' || p_cancellation_reason || ']'
    WHERE id = p_booking_id;

    UPDATE public.units
    SET status = 'available',
        reserved_by = NULL,
        reserved_lead_id = NULL,
        reserved_at = NULL,
        reserved_until = NULL
    WHERE id = v_booking.unit_id;

    UPDATE public.leads
    SET current_stage = 'negotiation',
        updated_at = v_now
    WHERE id = v_booking.lead_id;

    INSERT INTO public.lead_activities (
        org_id, lead_id, actor_id, activity_type, title, description, metadata
    ) VALUES (
        v_org_id,
        v_booking.lead_id,
        v_user_id,
        'stage_change',
        'Booking Cancelled: Ref ' || v_booking.booking_reference,
        'Booking cancelled and unit returned to inventory. Reason: ' || p_cancellation_reason,
        jsonb_build_object(
            'booking_id', p_booking_id,
            'unit_id', v_booking.unit_id,
            'reason', p_cancellation_reason
        )
    );

    RETURN jsonb_build_object('success', TRUE, 'booking_id', p_booking_id, 'unit_status', 'available');
END;
$$;

