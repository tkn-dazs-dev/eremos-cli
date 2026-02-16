import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
import { generateCodeVerifier, generateCodeChallenge, generateState } from '../auth/pkce.js';

describe('generateCodeVerifier', () => {
  it('returns a base64url string of 43+ characters (RFC 7636)', () => {
    const verifier = generateCodeVerifier();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('generates unique values', () => {
    const a = generateCodeVerifier();
    const b = generateCodeVerifier();
    expect(a).not.toBe(b);
  });
});

describe('generateCodeChallenge', () => {
  it('produces S256 challenge matching manual SHA-256', () => {
    const verifier = 'test-verifier-string';
    const challenge = generateCodeChallenge(verifier);
    const expected = createHash('sha256').update(verifier).digest('base64url');
    expect(challenge).toBe(expected);
  });

  it('is deterministic for the same verifier', () => {
    const verifier = generateCodeVerifier();
    expect(generateCodeChallenge(verifier)).toBe(generateCodeChallenge(verifier));
  });

  it('differs for different verifiers', () => {
    const a = generateCodeChallenge('verifier-a');
    const b = generateCodeChallenge('verifier-b');
    expect(a).not.toBe(b);
  });
});

describe('generateState', () => {
  it('returns a 32-character hex string', () => {
    const state = generateState();
    expect(state).toHaveLength(32);
    expect(state).toMatch(/^[0-9a-f]+$/);
  });

  it('generates unique values', () => {
    const a = generateState();
    const b = generateState();
    expect(a).not.toBe(b);
  });
});
