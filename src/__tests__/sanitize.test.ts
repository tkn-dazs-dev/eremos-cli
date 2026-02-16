import { describe, it, expect } from 'vitest';
import { sanitizeFileName, safePathSegment } from '../utils/sanitize.js';

describe('sanitizeFileName', () => {
  it('replaces CR, LF, NUL with underscores', () => {
    expect(sanitizeFileName('file\r\n.txt')).toBe('file__.txt');
    expect(sanitizeFileName('file\x00.txt')).toBe('file_.txt');
  });

  it('replaces quotes and backslashes', () => {
    expect(sanitizeFileName('file"name.txt')).toBe('file_name.txt');
    expect(sanitizeFileName('file\\name.txt')).toBe('file_name.txt');
  });

  it('replaces all control characters', () => {
    expect(sanitizeFileName('a\x01b\x1fc\x7fd')).toBe('a_b_c_d');
  });

  it('passes through normal filenames unchanged', () => {
    expect(sanitizeFileName('photo.jpg')).toBe('photo.jpg');
    expect(sanitizeFileName('my-file_v2.tar.gz')).toBe('my-file_v2.tar.gz');
    expect(sanitizeFileName('日本語ファイル.txt')).toBe('日本語ファイル.txt');
  });
});

describe('safePathSegment', () => {
  it('throws on empty string', () => {
    expect(() => safePathSegment('')).toThrow('Invalid ID');
  });

  it('throws on forward slash', () => {
    expect(() => safePathSegment('a/b')).toThrow('Invalid ID');
  });

  it('throws on backslash', () => {
    expect(() => safePathSegment('a\\b')).toThrow('Invalid ID');
  });

  it('throws on dot-dot traversal', () => {
    expect(() => safePathSegment('..')).toThrow('Invalid ID');
    expect(() => safePathSegment('a/../b')).toThrow('Invalid ID');
  });

  it('uses custom name in error message', () => {
    expect(() => safePathSegment('', 'Stamp ID')).toThrow('Invalid Stamp ID');
  });

  it('passes UUIDs through (encoded)', () => {
    const uuid = 'c0000001-0001-0001-0001-000000000001';
    expect(safePathSegment(uuid)).toBe(uuid);
  });

  it('encodes special characters', () => {
    expect(safePathSegment('hello world')).toBe('hello%20world');
    expect(safePathSegment('a+b')).toBe('a%2Bb');
  });

  it('allows single dots', () => {
    expect(safePathSegment('file.txt')).toBe('file.txt');
  });
});
