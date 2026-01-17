-- Enable Row Level Security

-- 1. COMPANIES (Multi-tenant Root)
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'business', 'enterprise')),
    settings JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 2. USERS (Platform Staff)
-- Linked to auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    full_name TEXT,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'company_admin', 'hr', 'it_security', 'manager')),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. EMPLOYEES (Offboarding Targets)
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    job_title TEXT,
    department TEXT,
    manager_id UUID REFERENCES public.employees(id),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'offboarding', 'terminated')),
    external_ids JSONB DEFAULT '{}'::jsonb, -- e.g. {"workday": "WD-123"}
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- 4. OFFBOARDING CASES
CREATE TABLE IF NOT EXISTS public.offboarding_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
    status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'active', 'completed', 'cancelled')),
    last_working_day TIMESTAMPTZ,
    reason TEXT,
    risk_score_breakdown JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.offboarding_cases ENABLE ROW LEVEL SECURITY;

-- 5. TASKS
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    case_id UUID NOT NULL REFERENCES public.offboarding_cases(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    assigned_role TEXT CHECK (assigned_role IN ('hr', 'it_security', 'manager', 'employee')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb, -- e.g. {"revocation_proof": "..."}
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 6. IMMUTABLE AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    actor_id TEXT NOT NULL, -- UUID or system_bot
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Prevent Updates and Deletes on Audit Logs
CREATE OR REPLACE FUNCTION protect_audit_logs() 
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        RAISE EXCEPTION 'Deletion of audit logs is not allowed.';
    ELSIF (TG_OP = 'UPDATE') THEN
        RAISE EXCEPTION 'Modification of audit logs is not allowed.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_immutable
BEFORE UPDATE OR DELETE ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION protect_audit_logs();

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES (Example for Employees)
CREATE POLICY "Employees are viewable by company staff" ON public.employees
    FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Repeat RLS for all tables based on company_id scoping
CREATE POLICY "Offboarding cases scoped by company" ON public.offboarding_cases
    FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Tasks scoped by company" ON public.tasks
    FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- 7. RISK SCORING & AUTOMATION LOGIC

-- Simple Risk Scoring Function
CREATE OR REPLACE FUNCTION calculate_risk_level(employee_id UUID)
RETURNS TEXT AS $$
DECLARE
    emp_record RECORD;
    score INTEGER := 0;
BEGIN
    SELECT * INTO emp_record FROM public.employees WHERE id = employee_id;
    
    -- Base score from job title / department
    IF emp_record.job_title ILIKE '%Engineer%' OR emp_record.job_title ILIKE '%Admin%' THEN
        score := score + 40;
    END IF;
    
    IF emp_record.department ILIKE '%Security%' OR emp_record.department ILIKE '%IT%' THEN
        score := score + 30;
    END IF;

    -- Return qualitative level
    IF score >= 70 THEN RETURN 'high';
    ELSIF score >= 40 THEN RETURN 'medium';
    ELSE RETURN 'low';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger: When employee status changes to 'offboarding', create a case
CREATE OR REPLACE FUNCTION handle_employee_offboarding()
RETURNS TRIGGER AS $$
DECLARE
    new_case_id UUID;
    calculated_risk TEXT;
BEGIN
    IF (NEW.status = 'offboarding' AND OLD.status = 'active') THEN
        calculated_risk := calculate_risk_level(NEW.id);
        
        INSERT INTO public.offboarding_cases (company_id, employee_id, risk_level, status)
        VALUES (NEW.company_id, NEW.id, calculated_risk, 'active')
        RETURNING id INTO new_case_id;

        -- Create default tasks based on risk
        INSERT INTO public.tasks (company_id, case_id, title, assigned_role, status)
        VALUES 
            (NEW.company_id, new_case_id, 'Revoke SaaS Access (GitHub/Slack)', 'it_security', 'pending'),
            (NEW.company_id, new_case_id, 'Conduct Exit Interview', 'hr', 'pending'),
            (NEW.company_id, new_case_id, 'Retrieve IT Equipment', 'manager', 'pending');
            
        -- Log the event
        INSERT INTO public.audit_logs (company_id, actor_id, action, entity_type, entity_id, metadata)
        VALUES (NEW.company_id, 'system_bot', 'offboarding_started', 'employee', NEW.id, jsonb_build_object('risk_level', calculated_risk));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_employee_status_change
AFTER UPDATE ON public.employees
FOR EACH ROW EXECUTE FUNCTION handle_employee_offboarding();
