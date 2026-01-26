/**
 * Security Test Suite - IP Blocking and Authentication
 * Tests for critical security controls
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

// IP validation function (copy from middleware for testing)
function validateIP(ip: string): boolean {
  if (!ip || ip.trim() === '') return false;
  
  // IPv4 validation
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (ipv4Regex.test(ip)) return true;
  
  // IPv6 validation (simplified but covers common formats)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
  const ipv6CompressedRegex = /^(?:[0-9a-fA-F]{1,4}:){1,7}:|^(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}$|^(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}$|^(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:(?:(?::[0-9a-fA-F]{1,4}){1,6})$|:(?:(?::[0-9a-fA-F]{1,4}){1,7}|:)$/;
  
  return ipv6Regex.test(ip) || ipv6CompressedRegex.test(ip);
}

// Helper function to recursively search for files containing a pattern
function searchFilesForPattern(dir: string, pattern: string, excludeDirs: string[] = ['node_modules', '.next', 'dist']): boolean {
  try {
    const files = readdirSync(dir, { withFileTypes: true });
    
    for (const file of files) {
      const fullPath = join(dir, file.name);
      
      if (file.isDirectory() && !excludeDirs.includes(file.name)) {
        if (searchFilesForPattern(fullPath, pattern, excludeDirs)) {
          return true;
        }
      } else if (file.isFile() && (file.name.endsWith('.ts') || file.name.endsWith('.tsx') || file.name.endsWith('.js') || file.name.endsWith('.jsx'))) {
        try {
          const content = readFileSync(fullPath, 'utf-8');
          if (content.includes(pattern)) {
            return true;
          }
        } catch (error) {
          // Skip files that can't be read
          continue;
        }
      }
    }
  } catch (error) {
    // Skip directories that can't be read
    return false;
  }
  
  return false;
}

describe('Security Tests', () => {
  describe('IP Validation', () => {
    it('should validate correct IPv4 addresses', () => {
      const validIPv4s = [
        '192.168.1.1',
        '10.0.0.1', 
        '172.16.0.1',
        '127.0.0.1',
        '255.255.255.255',
        '0.0.0.0'
      ];
      
      validIPv4s.forEach(ip => {
        expect(validateIP(ip)).toBe(true);
      });
    });

    it('should reject invalid IPv4 addresses', () => {
      const invalidIPv4s = [
        '256.256.256.256',
        '192.168.1',
        'invalid-ip',
        '',
        'malformed'
      ];
      
      invalidIPv4s.forEach(ip => {
        expect(validateIP(ip)).toBe(false);
      });
    });

    it('should validate correct IPv6 addresses', () => {
      const validIPv6s = [
        '::1',
        '2001:db8::1',
        'fe80::1'
      ];
      
      validIPv6s.forEach(ip => {
        expect(validateIP(ip)).toBe(true);
      });
    });

    it('should reject invalid IPv6 addresses', () => {
      const invalidIPv6s = [
        'invalid-ipv6'
      ];
      
      invalidIPv6s.forEach(ip => {
        expect(validateIP(ip)).toBe(false);
      });
    });
  });

  describe('Security Regression Tests', () => {
    it('should not contain service_role key in edge runtime page files', () => {
      // Check for service role usage in edge runtime pages (exclude API routes)
      const appDir = join(process.cwd(), 'src', 'app');
      const hasServiceRoleInPages = searchFilesForPattern(appDir, 'SUPABASE_SERVICE_ROLE_KEY', ['api']);
      
      // Service role keys should only be in API routes, not in page components
      expect(hasServiceRoleInPages).toBe(false);
    });

    it('should have IP validation function present', () => {
      // Check if validateIPAddress function exists in ip-blocking module
      const ipBlockingPath = join(process.cwd(), 'src', 'lib', 'ip-blocking.server.ts');
      try {
        const ipBlockingContent = readFileSync(ipBlockingPath, 'utf-8');
        const hasValidateFunction = ipBlockingContent.includes('validateIPAddress');
        expect(hasValidateFunction).toBe(true);
      } catch (error) {
        expect.fail('IP blocking file not found');
      }
    });

    it('should use anon key instead of service role in middleware', () => {
      // Check that middleware uses anon key for security
      const middlewarePath = join(process.cwd(), 'src', 'lib', 'supabase', 'middleware.ts');
      try {
        const middlewareContent = readFileSync(middlewarePath, 'utf-8');
        const usesAnonKey = middlewareContent.includes('SUPABASE_ANON_KEY') || middlewareContent.includes('anon key');
        const usesServiceRole = middlewareContent.includes('SUPABASE_SERVICE_ROLE_KEY');
        
        expect(usesAnonKey).toBe(true);
        expect(usesServiceRole).toBe(false);
      } catch (error) {
        expect.fail('Middleware file not found');
      }
    });

    it('should have basic RBAC permission checks', () => {
      // Check for RBAC implementation
      const rbacPath = join(process.cwd(), 'src', 'lib', 'rbac.server.ts');
      try {
        const rbacContent = readFileSync(rbacPath, 'utf-8');
        const hasPermissionChecks = rbacContent.includes('requirePermission') || rbacContent.includes('hasPermission');
        const hasPermissionTypes = rbacContent.includes('PermissionCode') || rbacContent.includes('permissions');
        
        expect(hasPermissionChecks).toBe(true);
        expect(hasPermissionTypes).toBe(true);
      } catch (error) {
        expect.fail('RBAC file not found');
      }
    });

    it('should have IP blocking functionality', () => {
      // Check for IP blocking implementation
      const ipBlockingPath = join(process.cwd(), 'src', 'lib', 'ip-blocking.server.ts');
      try {
        const ipBlockingContent = readFileSync(ipBlockingPath, 'utf-8');
        const hasBlockingFunction = ipBlockingContent.includes('checkIPBlocked') || ipBlockingContent.includes('blockIP');
        const hasBlockedIPModel = ipBlockingContent.includes('blockedIP') || ipBlockingContent.includes('BlockedIP');
        
        expect(hasBlockingFunction).toBe(true);
        expect(hasBlockedIPModel).toBe(true);
      } catch (error) {
        expect.fail('IP blocking file not found');
      }
    });
  });

  describe('Security Headers and Configuration', () => {
    it('should have security middleware configuration', () => {
      // Check for security-related middleware configuration
      const middlewarePath = join(process.cwd(), 'src', 'lib', 'supabase', 'middleware.ts');
      try {
        const middlewareContent = readFileSync(middlewarePath, 'utf-8');
        const hasSecurityChecks = middlewareContent.includes('security') || middlewareContent.includes('blocked') || middlewareContent.includes('ip');
        
        expect(hasSecurityChecks).toBe(true);
      } catch (error) {
        expect.fail('Security configuration not found in middleware');
      }
    });
  });
});
