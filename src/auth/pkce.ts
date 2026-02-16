import { randomBytes, createHash } from 'crypto';

/**
 * Generate PKCE code_verifier (RFC 7636)
 * 43-128 character URL-safe string
 */
export function generateCodeVerifier(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Generate PKCE code_challenge from code_verifier using S256 method
 */
export function generateCodeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

/**
 * Generate a random state parameter for CSRF protection
 */
export function generateState(): string {
  return randomBytes(16).toString('hex');
}
