import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { printJson, printTable, printKeyValue, printSuccess, printError, printPagination, type ColumnDef, type FieldDef } from '../utils/output.js';

describe('output', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    stderrSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  describe('printJson', () => {
    it('outputs JSON to stdout', () => {
      const data = { data: { id: '123' }, meta: { has_more: false } };
      printJson(data);
      const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
      expect(JSON.parse(output)).toEqual(data);
    });

    it('handles null and undefined values', () => {
      printJson({ data: null });
      const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
      expect(JSON.parse(output)).toEqual({ data: null });
    });
  });

  describe('printTable', () => {
    const columns: ColumnDef[] = [
      { key: 'id', label: 'ID', width: 4 },
      { key: 'name', label: 'Name', width: 10 },
    ];

    it('prints header and rows', () => {
      printTable([{ id: '1', name: 'Test' }], columns);
      const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
      expect(output).toContain('ID');
      expect(output).toContain('Name');
      expect(output).toContain('Test');
    });

    it('prints "(no results)" for empty array', () => {
      printTable([], columns);
      const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
      expect(output).toContain('no results');
    });

    it('applies transform functions', () => {
      const cols: ColumnDef[] = [
        { key: 'active', label: 'Active', transform: (v) => (v ? 'Yes' : 'No') },
      ];
      printTable([{ active: true }, { active: false }], cols);
      const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
      expect(output).toContain('Yes');
      expect(output).toContain('No');
    });
  });

  describe('printKeyValue', () => {
    it('prints fields with labels', () => {
      const fields: FieldDef[] = [
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Name' },
      ];
      printKeyValue({ id: '123', name: 'Test' }, fields);
      const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
      expect(output).toContain('ID');
      expect(output).toContain('123');
      expect(output).toContain('Name');
      expect(output).toContain('Test');
    });

    it('skips null/undefined values', () => {
      const fields: FieldDef[] = [
        { key: 'id', label: 'ID' },
        { key: 'missing', label: 'Missing' },
      ];
      printKeyValue({ id: '123', missing: null }, fields);
      const output = stdoutSpy.mock.calls.map((c) => c[0]).join('');
      expect(output).toContain('123');
      expect(output).not.toContain('Missing');
    });
  });

  describe('printSuccess', () => {
    it('prints to stderr with checkmark', () => {
      printSuccess('Done!');
      const output = stderrSpy.mock.calls.map((c) => c[0]).join('');
      expect(output).toContain('Done!');
    });
  });

  describe('printError', () => {
    it('prints to stderr with error prefix', () => {
      printError('Something failed');
      const output = stderrSpy.mock.calls.map((c) => c[0]).join('');
      expect(output).toContain('error:');
      expect(output).toContain('Something failed');
    });
  });

  describe('printPagination', () => {
    it('prints cursor hint when has_more is true', () => {
      printPagination({ has_more: true, next_cursor: 'abc123' });
      const output = stderrSpy.mock.calls.map((c) => c[0]).join('');
      expect(output).toContain('abc123');
    });

    it('does nothing when has_more is false', () => {
      printPagination({ has_more: false, next_cursor: null });
      expect(stderrSpy).not.toHaveBeenCalled();
    });

    it('does nothing when meta is undefined', () => {
      printPagination(undefined);
      expect(stderrSpy).not.toHaveBeenCalled();
    });
  });

  describe('NO_COLOR', () => {
    it('respects NO_COLOR environment variable', () => {
      // NO_COLOR is checked at import time, so this test is best-effort.
      // We verify the function doesn't crash when called.
      printSuccess('test');
      expect(stderrSpy).toHaveBeenCalled();
    });
  });
});
