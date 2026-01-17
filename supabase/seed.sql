-- Seed Data for OffBoarder HQ
-- This script sets up a realistic environment for role-based verification.

-- 1. Create the Main Company
INSERT INTO companies (id, name, domain, logo_url)
VALUES 
  ('c0000000-0000-0000-0000-000000000001', 'OffBoarder HQ', 'offboardhq.com', 'https://api.dicebear.com/7.x/initials/svg?seed=OHQ')
ON CONFLICT (id) DO NOTHING;

-- 2. Professional Employee Base
INSERT INTO employees (id, company_id, full_name, email, department, job_title, status)
VALUES
  ('e1111111-1111-1111-1111-111111111111', 'c0000000-0000-0000-0000-000000000001', 'John Doe', 'employee.john@offboardhq.com', 'Engineering', 'Senior Software Engineer', 'offboarding'),
  ('e2222222-2222-2222-2222-222222222222', 'c0000000-0000-0000-0000-000000000001', 'Sarah Jenkins', 'hr.sarah@offboardhq.com', 'People Ops', 'HR Director', 'active'),
  ('e3333333-3333-3333-3333-333333333333', 'c0000000-0000-0000-0000-000000000001', 'Mike Ross', 'it.mike@offboardhq.com', 'Information Technology', 'IT Systems Manager', 'active'),
  ('e4444444-4444-4444-4444-444444444444', 'c0000000-0000-0000-0000-000000000001', 'Jane Smith', 'manager.jane@offboardhq.com', 'Engineering', 'Engineering Manager', 'active')
ON CONFLICT (id) DO NOTHING;

-- 3. High-Value IT Assets
INSERT INTO assets (id, company_id, name, type, serial_number, status)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'c0000000-0000-0000-0000-000000000001', 'MacBook Pro 16" (M3 Max)', 'hardware', 'SN-OHQ-9921', 'deployed'),
  ('a2222222-2222-2222-2222-222222222222', 'c0000000-0000-0000-0000-000000000001', 'Dell UltraSharp 27" Monitor', 'hardware', 'SN-OHQ-5510', 'deployed')
ON CONFLICT (id) DO NOTHING;

-- 4. Active Asset Assignments
INSERT INTO asset_assignments (company_id, asset_id, employee_id, assigned_at)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111111', now() - interval '1 year'),
  ('c0000000-0000-0000-0000-000000000001', 'a2222222-2222-2222-2222-222222222222', 'e1111111-1111-1111-1111-111111111111', now() - interval '1 year')
ON CONFLICT DO NOTHING;

-- 5. Documents for Signature
INSERT INTO documents (id, company_id, case_id, title, status, external_signature_id)
VALUES
  ('d1111111-1111-1111-1111-111111111111', 'c0000000-0000-0000-0000-000000000001', (SELECT id FROM offboarding_cases WHERE employee_id = 'e1111111-1111-1111-1111-111111111111' LIMIT 1), 'Termination Agreement', 'pending', 'ext_sig_john_001')
ON CONFLICT (id) DO NOTHING;

-- Note for User:
-- To use these roles, you must link Supabase Auth users to these profiles after they sign up:
-- UPDATE profiles SET role = 'hr', company_id = 'c0000000-0000-0000-0000-000000000001' WHERE email = 'hr.sarah@offboardhq.com';
-- etc.
