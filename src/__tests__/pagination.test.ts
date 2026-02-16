import { describe, it, expect } from 'vitest';
import { buildQueryParams } from '../utils/pagination.js';

describe('buildQueryParams', () => {
  it('returns empty string for no params', () => {
    expect(buildQueryParams({})).toBe('');
  });

  it('builds query string from flags', () => {
    const qs = buildQueryParams({ type: 'text', sort: 'latest' });
    expect(qs).toContain('type=text');
    expect(qs).toContain('sort=latest');
    expect(qs[0]).toBe('?');
  });

  it('skips undefined and null values', () => {
    const qs = buildQueryParams({ type: 'text', period: undefined, cursor: null });
    expect(qs).toBe('?type=text');
  });

  it('skips empty string values', () => {
    const qs = buildQueryParams({ type: '', sort: 'latest' });
    expect(qs).toBe('?sort=latest');
  });

  it('clamps limit to max 50', () => {
    const qs = buildQueryParams({ limit: 100 });
    expect(qs).toBe('?limit=50');
  });

  it('clamps limit to min 1', () => {
    const qs = buildQueryParams({ limit: -5 });
    expect(qs).toBe('?limit=1');
  });

  it('defaults invalid limit to 20', () => {
    const qs = buildQueryParams({ limit: 'abc' });
    expect(qs).toBe('?limit=20');
  });

  it('passes valid limit through', () => {
    const qs = buildQueryParams({ limit: 10 });
    expect(qs).toBe('?limit=10');
  });

  it('joins arrays with commas', () => {
    const qs = buildQueryParams({ tags: ['a', 'b', 'c'] });
    expect(qs).toContain('tags=a%2Cb%2Cc');
  });

  it('handles string limit from commander', () => {
    const qs = buildQueryParams({ limit: '15' });
    expect(qs).toBe('?limit=15');
  });
});
