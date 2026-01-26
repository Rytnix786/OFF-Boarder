# Security Incident Response Procedures

## Overview
This document outlines the incident response procedures for security events in the OffBoarder platform.

## Incident Classification

### Critical Incidents
- Service role key exposure in Edge Runtime
- Mass unauthorized access to organizational data
- Complete IP blocking system failure
- Database compromise or data breach

### High Incidents  
- Individual unauthorized access attempts
- IP spoofing attacks bypassing controls
- RLS policy failures allowing cross-org access
- Authentication system compromise

### Medium Incidents
- Single IP blocking failure
- Security logging gaps
- Minor configuration issues

## Response Procedures

### 1. Service Role Key Exposure (Critical)
**Detection:**
- Monitoring alerts for SUPABASE_SERVICE_ROLE_KEY usage
- Code scanning results
- Security audit findings

**Immediate Actions:**
1. Rotate exposed service role key in Supabase dashboard
2. Update all environment variables
3. Restart all services to ensure new key usage
4. Review access logs for potential misuse

**Escalation:** Immediate notification to security team and CTO

**Recovery:**
- Verify no unauthorized access occurred
- Update code to remove service role from Edge Runtime
- Deploy security fixes

### 2. IP Blocking System Failure (Critical)
**Detection:**
- Alert: IP blocking queries failing > 5 minutes
- Monitor: Increased unauthorized access attempts
- User reports: Blocked IPs accessing system

**Immediate Actions:**
1. Check middleware logs for errors
2. Verify RLS policies are active
3. Temporarily implement manual IP blocks if needed
4. Validate anon key access to BlockedIP table

**Escalation:** Security team within 15 minutes

**Recovery:**
- Fix RLS policy issues
- Restore IP blocking functionality
- Monitor for bypass attempts

### 3. Unauthorized Access Attempts (High)
**Detection:**
- Alert: Multiple failed auth attempts from single IP
- Monitor: Cross-organization data access attempts
- User reports: Suspicious account activity

**Immediate Actions:**
1. Block offending IP addresses globally
2. Review user session logs
3. Force password reset for affected accounts
4. Enable additional monitoring

**Escalation:** Security team within 1 hour

**Recovery:**
- Investigate root cause
- Update security controls if needed
- Document lessons learned

### 4. RLS Policy Failures (High)
**Detection:**
- Alert: Cross-organization data access in logs
- Monitor: Unexpected query patterns
- Security audit findings

**Immediate Actions:**
1. Review RLS policy definitions
2. Test policy enforcement with different user contexts
3. Temporarily restrict access if needed
4. Verify organization context passing

**Escalation:** Security team within 30 minutes

**Recovery:**
- Fix RLS policy definitions
- Test thoroughly before deployment
- Monitor for continued issues

## Alert Thresholds

### IP Blocking
- Failure rate > 1%: Alert
- Failure rate > 5%: Critical
- Continuous failure > 5 minutes: Critical

### Authentication
- Failed attempts > 100/min: Alert
- Failed attempts > 1000/min: Critical
- Successful auth from blocked IP: Critical

### Database Access
- Cross-organization queries: Alert
- RLS policy bypass attempts: Critical
- Service role usage in production: Critical

## Escalation Contacts

### Primary
- Security Team: security@offboarder.com
- Engineering Lead: eng-lead@offboarder.com
- CTO: cto@offboarder.com

### Secondary
- DevOps Team: devops@offboarder.com
- Product Team: product@offboarder.com

## Rollback Procedures

### Security Changes
1. Database migrations: Use `supabase db rollback`
2. Code changes: Revert to previous commit
3. Environment changes: Restore from backup

### Service Recovery
1. Restart services with last known good configuration
2. Verify all security controls are working
3. Monitor for 30 minutes before declaring stable

## Post-Incident Activities

### Documentation
- Create incident report within 24 hours
- Include timeline, impact, and resolution
- Update runbooks if new procedures needed

### Review
- Conduct post-mortem within 48 hours
- Identify root causes and prevention measures
- Update security controls as needed

### Testing
- Verify fixes work in staging environment
- Run security regression tests
- Monitor production for 24 hours

## Monitoring and Prevention

### Continuous Monitoring
- Security event logs: Real-time alerts
- Performance metrics: Anomaly detection
- Access patterns: Behavioral analysis

### Prevention Measures
- Regular security audits
- Automated security testing
- Code scanning for sensitive data
- Environment variable validation

## Training and Procedures

### Team Training
- Security incident response drills quarterly
- New security engineer onboarding includes incident procedures
- Annual security awareness training

### Procedure Updates
- Review and update runbooks quarterly
- Update contact information monthly
- Test alert systems weekly

## Compliance Requirements

### Documentation
- All incidents documented for audit purposes
- Maintain incident logs for minimum 1 year
- Regular compliance reviews

### Reporting
- Critical incidents: Report to management within 1 hour
- Security breaches: Report to compliance team within 4 hours
- Monthly security summary to stakeholders
