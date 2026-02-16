import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
  statSync,
  symlinkSync,
} from 'fs';
import { join } from 'path';
import { tmpdir, platform } from 'os';

// vi.hoisted runs before vi.mock hoisting — safe to use in mock factory
const { testDir, testCredsDir, testCredsFile } = vi.hoisted(() => {
  const { mkdtempSync } = require('fs');
  const { join } = require('path');
  const { tmpdir } = require('os');
  const dir = mkdtempSync(join(tmpdir(), 'eremos-test-'));
  return {
    testDir: dir,
    testCredsDir: join(dir, '.eremos'),
    testCredsFile: join(dir, '.eremos', 'credentials.json'),
  };
});

vi.mock('os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('os')>();
  return { ...actual, homedir: () => testDir };
});

import { saveTokens, loadTokens, deleteTokens, isTokenExpired, type StoredTokens } from '../auth/tokenStore.js';

const validTokens: StoredTokens = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  client_id: 'eremos-cli',
};

describe('tokenStore', () => {
  beforeEach(() => {
    rmSync(testCredsDir, { recursive: true, force: true });
  });

  afterEach(() => {
    rmSync(testCredsDir, { recursive: true, force: true });
  });

  describe('saveTokens', () => {
    it('creates credentials directory and file', () => {
      saveTokens(validTokens);
      const content = JSON.parse(readFileSync(testCredsFile, 'utf-8'));
      expect(content.access_token).toBe('test-access-token');
      expect(content.client_id).toBe('eremos-cli');
    });

    it('sets restrictive file permissions on non-Windows', () => {
      if (platform() === 'win32') return;
      saveTokens(validTokens);
      const stat = statSync(testCredsFile);
      expect(stat.mode & 0o777).toBe(0o600);
    });

    it('rejects invalid tokens', () => {
      expect(() => saveTokens({ ...validTokens, access_token: '' })).toThrow('Invalid access_token');
      expect(() => saveTokens({ ...validTokens, refresh_token: '' })).toThrow('Invalid refresh_token');
      expect(() => saveTokens({ ...validTokens, expires_at: NaN })).toThrow('Invalid expires_at');
      expect(() => saveTokens({ ...validTokens, client_id: '' })).toThrow('Invalid client_id');
    });

    it('rejects symlinked credentials directory', () => {
      const realDir = join(testDir, 'real-dir');
      mkdirSync(realDir, { recursive: true });
      symlinkSync(realDir, testCredsDir);
      expect(() => saveTokens(validTokens)).toThrow('symlinked credentials directory');
    });

    it('rejects symlinked credentials file', () => {
      mkdirSync(testCredsDir, { recursive: true });
      const realFile = join(testDir, 'real-creds.json');
      writeFileSync(realFile, '{}');
      symlinkSync(realFile, testCredsFile);
      expect(() => saveTokens(validTokens)).toThrow('symlinked credentials file');
    });

    it('overwrites existing file atomically', () => {
      saveTokens(validTokens);
      const updated = { ...validTokens, access_token: 'new-token' };
      saveTokens(updated);
      const content = JSON.parse(readFileSync(testCredsFile, 'utf-8'));
      expect(content.access_token).toBe('new-token');
    });
  });

  describe('loadTokens', () => {
    it('returns null when file does not exist', () => {
      expect(loadTokens()).toBeNull();
    });

    it('loads valid tokens', () => {
      saveTokens(validTokens);
      const loaded = loadTokens();
      expect(loaded).toEqual(validTokens);
    });

    it('returns null for malformed JSON', () => {
      mkdirSync(testCredsDir, { recursive: true });
      writeFileSync(testCredsFile, 'not-json');
      expect(loadTokens()).toBeNull();
    });

    it('returns null for incomplete token data', () => {
      mkdirSync(testCredsDir, { recursive: true });
      writeFileSync(testCredsFile, JSON.stringify({ access_token: 'only-access' }));
      expect(loadTokens()).toBeNull();
    });

    it('rejects symlinked credentials file', () => {
      mkdirSync(testCredsDir, { recursive: true });
      const realFile = join(testDir, 'real-creds-2.json');
      writeFileSync(realFile, JSON.stringify(validTokens));
      symlinkSync(realFile, testCredsFile);
      expect(() => loadTokens()).toThrow('symlinked credentials file');
    });
  });

  describe('deleteTokens', () => {
    it('deletes existing credentials file', () => {
      saveTokens(validTokens);
      deleteTokens();
      expect(loadTokens()).toBeNull();
    });

    it('does nothing when file does not exist', () => {
      expect(() => deleteTokens()).not.toThrow();
    });

    it('rejects symlinked credentials file', () => {
      mkdirSync(testCredsDir, { recursive: true });
      const realFile = join(testDir, 'real-creds-3.json');
      writeFileSync(realFile, '{}');
      symlinkSync(realFile, testCredsFile);
      expect(() => deleteTokens()).toThrow('symlinked credentials file');
    });
  });

  describe('isTokenExpired', () => {
    it('returns false for non-expired tokens', () => {
      const tokens = { ...validTokens, expires_at: Math.floor(Date.now() / 1000) + 3600 };
      expect(isTokenExpired(tokens)).toBe(false);
    });

    it('returns true for expired tokens', () => {
      const tokens = { ...validTokens, expires_at: Math.floor(Date.now() / 1000) - 100 };
      expect(isTokenExpired(tokens)).toBe(true);
    });

    it('returns true within 60-second buffer', () => {
      const tokens = { ...validTokens, expires_at: Math.floor(Date.now() / 1000) + 30 };
      expect(isTokenExpired(tokens)).toBe(true);
    });
  });
});
