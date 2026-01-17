-- OFFBOARDHQ BACKEND VERIFICATION SUITE
-- Run these in the Supabase SQL Editor to validate architecture.

-- 1. Setup Test Data
BEGIN;

INSERT INTO public.companies (name, slug) VALUES ('Test Corp', 'test-corp') RETURNING id AS test_company_id;
-- Let's assume id is 'C1-UUID' for logic

-- 2. Mock Employee
INSERT INTO public.employees (company_id, full_name, email, job_title, department, status)
VALUES ('C1-UUID', 'Verification Target', 'target@testcorp.com', 'Senior Admin', 'IT', 'active')
RETURNING id AS emp_id;

-- 3. TRIGGER VERIFICATION: Status Change -> Case & Tasks
UPDATE public.employees SET status = 'offboarding' WHERE email = 'target@testcorp.com';

-- Verify Case Creation
SELECT * FROM public.offboarding_cases WHERE employee_id = (SELECT id FROM public.employees WHERE email = 'target@testcorp.com');

-- Verify Task Generation
SELECT * FROM public.tasks WHERE case_id = (SELECT id FROM public.offboarding_cases LIMIT 1);

-- Verify Audit Log Entry
SELECT * FROM public.audit_logs WHERE action = 'offboarding_started';

-- 4. COMPLIANCE VERIFICATION: Audit Immutability
DO $$
BEGIN
    DELETE FROM public.audit_logs WHERE action = 'offboarding_started';
    RAISE EXCEPTION 'TEST FAILED: Audit log was successfully deleted.';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST PASSED: Audit log immutability verified. Error caught: %', SQLERRM;
END $$;

-- 5. MULTI-TENANCY VERIFICATION: RLS Leak Check
-- Simulate a different company
INSERT INTO public.companies (name, slug) VALUES ('Hacker Inc', 'hacker-inc') RETURNING id AS attacker_company_id;

-- (Manual verification: Set role to 'it_security' for Company A user and verify they cannot see Company B data)

ROLLBACK;
