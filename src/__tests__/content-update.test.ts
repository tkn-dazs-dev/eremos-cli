import { describe, expect, it } from 'vitest';
import { buildContentUpdatePayload } from '../commands/content/update.js';

describe('content update payload builder', () => {
  it('sets series_id to null when --no-series is provided', () => {
    const payload = buildContentUpdatePayload({ noSeries: true });
    expect(payload).toEqual({ series_id: null });
  });

  it('sets series_id to null when commander parses --no-series as series=false', () => {
    const payload = buildContentUpdatePayload({ series: false });
    expect(payload).toEqual({ series_id: null });
  });

  it('prioritizes --series-id over --no-series', () => {
    const payload = buildContentUpdatePayload({
      seriesId: '11111111-1111-1111-1111-111111111111',
      noSeries: true,
    });

    expect(payload).toEqual({
      series_id: '11111111-1111-1111-1111-111111111111',
    });
  });

  it('maps tags into trimmed array', () => {
    const payload = buildContentUpdatePayload({ tags: ' alpha, beta , ,gamma ' });
    expect(payload).toEqual({ tags: ['alpha', 'beta', 'gamma'] });
  });
});
