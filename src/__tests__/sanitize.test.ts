import { describe, it, expect } from 'vitest';
import { sanitizeFileName, safePathSegment, stripTerminalEscapes, sanitizeValue } from '../utils/sanitize.js';

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

describe('stripTerminalEscapes', () => {
  it('strips CSI color sequences', () => {
    expect(stripTerminalEscapes('\x1b[31mred\x1b[0m')).toBe('red');
  });

  it('strips CSI cursor/screen control sequences', () => {
    expect(stripTerminalEscapes('\x1b[?25l')).toBe('');
    expect(stripTerminalEscapes('\x1b[2J')).toBe('');
    expect(stripTerminalEscapes('\x1b[10;20H')).toBe('');
  });

  it('strips OSC sequences (title change)', () => {
    expect(stripTerminalEscapes('\x1b]0;evil title\x07')).toBe('');
    expect(stripTerminalEscapes('\x1b]0;evil\x1b\\')).toBe('');
  });

  it('strips C0 control characters and DEL', () => {
    expect(stripTerminalEscapes('a\x00b\x01c\x7fd')).toBe('abcd');
    expect(stripTerminalEscapes('line\r\nbreak')).toBe('linebreak');
  });

  it('preserves normal text', () => {
    expect(stripTerminalEscapes('Hello, world!')).toBe('Hello, world!');
  });

  it('preserves multibyte characters', () => {
    expect(stripTerminalEscapes('日本語テスト')).toBe('日本語テスト');
    expect(stripTerminalEscapes('café résumé')).toBe('café résumé');
  });

  it('handles mixed malicious and normal content', () => {
    expect(stripTerminalEscapes('safe\x1b[31m\x1b]0;pwned\x07\x00text')).toBe('safetext');
  });

  it('strips C1 8-bit CSI sequences', () => {
    expect(stripTerminalEscapes('A\u009b31mB\u009b0mC')).toBe('ABC');
  });

  it('strips C1 8-bit OSC sequences', () => {
    expect(stripTerminalEscapes('X\u009d0;evil\u009cY')).toBe('XY');
  });

  it('strips C1 control characters (0x80-0x9f)', () => {
    expect(stripTerminalEscapes('a\x80b\x8fc\x9fd')).toBe('abcd');
  });
});

describe('sanitizeValue', () => {
  it('sanitizes strings', () => {
    expect(sanitizeValue('\x1b[31mred\x1b[0m')).toBe('red');
  });

  it('passes through non-string primitives', () => {
    expect(sanitizeValue(42)).toBe(42);
    expect(sanitizeValue(true)).toBe(true);
    expect(sanitizeValue(null)).toBe(null);
    expect(sanitizeValue(undefined)).toBe(undefined);
  });

  it('recursively sanitizes arrays', () => {
    expect(sanitizeValue(['a\x1b[31m', 'b\x00'])).toEqual(['a', 'b']);
  });

  it('recursively sanitizes objects', () => {
    expect(sanitizeValue({ name: 'ok\x1b[31m', count: 5 })).toEqual({ name: 'ok', count: 5 });
  });

  it('recursively sanitizes nested structures', () => {
    const input = { author: { handle: 'user\x1b[0m', tags: ['a\x00', 'b'] } };
    expect(sanitizeValue(input)).toEqual({ author: { handle: 'user', tags: ['a', 'b'] } });
  });

  it('handles circular references without crashing', () => {
    const obj: Record<string, unknown> = { a: 'hello\x1b[31m' };
    obj.self = obj;
    const result = sanitizeValue(obj) as Record<string, unknown>;
    expect(result.a).toBe('hello');
    expect(result.self).toBe('[Circular]');
  });
});
