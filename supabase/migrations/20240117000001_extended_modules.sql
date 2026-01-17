-- 8. IT ASSETS & HARDWARE TRACKING
CREATE TABLE IF NOT EXISTS public.assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    serial_number TEXT UNIQUE,
    category TEXT CHECK (category IN ('laptop', 'mobile', 'peripheral', 'yubikey', 'other')),
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'deployed', 'returned', 'missing', 'maintenance')),
    metadata JSONB DEFAULT '{}'::jsonb, -- e.g. {"model": "MacBook Pro M3", "specs": "32GB RAM"}
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.asset_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT now(),
    returned_at TIMESTAMPTZ,
    condition_on_return TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_assignments ENABLE ROW LEVEL SECURITY;

-- 9. DOCUMENTS & SIGNATURES
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    case_id UUID REFERENCES public.offboarding_cases(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    document_type TEXT NOT NULL CHECK (document_type IN ('termination_agreement', 'nda', 'ip_assignment', 'other')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'signed', 'declined')),
    external_signature_id TEXT, -- e.g. DocuSign envelope ID
    file_path TEXT, -- Link to storage
    signed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 10. NOTIFICATIONS QUEUE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id), -- Recipient
    title TEXT NOT NULL,
    content TEXT,
    type TEXT NOT NULL CHECK (type IN ('task_assigned', 'task_overdue', 'offboarding_complete', 'security_alert')),
    status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'archived')),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES for new tables
CREATE POLICY "Assets scoped by company" ON public.assets
    FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Asset assignments scoped by company" ON public.asset_assignments
    FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Documents scoped by company" ON public.documents
    FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Notifications scoped by company" ON public.notifications
    FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Trigger to update asset status on assignment
CREATE OR REPLACE FUNCTION update_asset_status()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.assets SET status = 'deployed' WHERE id = NEW.asset_id;
    ELSIF (TG_OP = 'UPDATE' AND NEW.returned_at IS NOT NULL) THEN
        UPDATE public.assets SET status = 'returned' WHERE id = NEW.asset_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_asset_assignment
AFTER INSERT OR UPDATE ON public.asset_assignments
FOR EACH ROW EXECUTE FUNCTION update_asset_status();
