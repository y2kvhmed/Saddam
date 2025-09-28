import * as Crypto from 'expo-crypto';
import { supabase } from './supabase';

// Input validation and sanitization
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

export const validatePassword = (password: string): { valid: boolean; message?: string } => {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return { valid: false, message: 'Password must contain uppercase, lowercase, and number' };
  }
  return { valid: true };
};

export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>\"'&]/g, '');
};

// File validation
export const validatePDF = async (uri: string): Promise<boolean> => {
  try {
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Check PDF magic bytes
    const pdfHeader = '%PDF-';
    const headerBytes = Array.from(uint8Array.slice(0, 5))
      .map(byte => String.fromCharCode(byte))
      .join('');
    
    return headerBytes === pdfHeader;
  } catch {
    return false;
  }
};

export const validateFileSize = (size: number, maxSizeMB: number = 10): boolean => {
  return size <= maxSizeMB * 1024 * 1024;
};

// Rate limiting
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export const checkRateLimit = (identifier: string, maxRequests: number = 5, windowMs: number = 60000): boolean => {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (record.count >= maxRequests) {
    return false;
  }
  
  record.count++;
  return true;
};

// Audit logging
export const logSecurityEvent = async (event: {
  action: string;
  userId?: string;
  details?: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}) => {
  try {
    await supabase.from('audit_logs').insert({
      user_id: event.userId,
      action: event.action,
      resource_type: 'security',
      details: {
        ...event.details,
        timestamp: new Date().toISOString(),
        severity: event.severity,
        user_agent: navigator?.userAgent || 'unknown',
      }
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
};

// Session management
export const validateSession = async (): Promise<boolean> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;
    
    // Check if session is expired
    const expiresAt = new Date(session.expires_at! * 1000);
    if (expiresAt < new Date()) {
      await supabase.auth.signOut();
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
};

// Content Security Policy headers (for web)
export const getCSPHeaders = () => ({
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "connect-src 'self' https://*.supabase.co",
    "media-src 'self' https://*.supabase.co",
    "frame-ancestors 'none'",
  ].join('; '),
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
});

// Encryption utilities
export const hashData = async (data: string): Promise<string> => {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    data,
    { encoding: Crypto.CryptoEncoding.HEX }
  );
};