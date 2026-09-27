import { describe, expect, it } from 'vitest';

import { ApiError } from './api';
import { describeError, describeFailure, isCohortTooSmall, load } from './errors';

describe('describeFailure', () => {
  it('explains a permission failure without offering a retry kind', () => {
    expect(describeFailure(403, 'nope')).toMatchObject({ kind: 'forbidden', status: 403 });
  });

  it('treats an expired session as a permission problem', () => {
    expect(describeFailure(401, undefined).message).toMatch(/session has expired/i);
  });

  it('explains the cohort-size guard with both numbers', () => {
    const failure = describeFailure(422, { error: 'cohort_too_small', minimum: 10, actual: 3 });
    expect(failure.kind).toBe('cohort_too_small');
    expect(failure.message).toContain('3 records');
    expect(failure.message).toContain('at least 10');
  });

  it('uses the singular for a cohort of one', () => {
    const failure = describeFailure(422, { error: 'cohort_too_small', minimum: 10, actual: 1 });
    expect(failure.message).toContain('1 record;');
  });

  it('surfaces the first FastAPI validation message without the "Value error" prefix', () => {
    const failure = describeFailure(422, [
      { loc: ['body'], msg: 'Value error, date_from must be on or before date_to' },
    ]);
    expect(failure).toMatchObject({
      kind: 'invalid',
      message: 'date_from must be on or before date_to',
    });
  });

  it('passes a not-found detail string through', () => {
    const failure = describeFailure(404, "No treatment outcomes recorded for 'X'");
    expect(failure).toMatchObject({ kind: 'not_found', message: "No treatment outcomes recorded for 'X'" });
  });

  it('treats a missing report file (410) as not found', () => {
    expect(describeFailure(410, undefined).kind).toBe('not_found');
  });

  it('marks server errors and network failures as retryable failures', () => {
    expect(describeFailure(500, undefined).kind).toBe('failed');
    expect(describeFailure(null, undefined).message).toMatch(/could not reach the server/i);
  });
});

describe('isCohortTooSmall', () => {
  it('rejects look-alike payloads', () => {
    expect(isCohortTooSmall({ error: 'cohort_too_small', minimum: '10', actual: 3 })).toBe(false);
    expect(isCohortTooSmall(null)).toBe(false);
    expect(isCohortTooSmall('cohort_too_small')).toBe(false);
  });
});

describe('describeError / load', () => {
  it('reads status and detail from an ApiError', () => {
    const error = new ApiError(403, 'failed', 'forbidden');
    expect(describeError(error).kind).toBe('forbidden');
  });

  it('treats any other thrown value as unreachable', () => {
    expect(describeError(new TypeError('fetch failed')).status).toBeNull();
  });

  it('captures a success', async () => {
    await expect(load(async () => 42)).resolves.toEqual({ ok: true, data: 42 });
  });

  it('captures a failure instead of throwing', async () => {
    const result = await load(async () => {
      throw new ApiError(422, 'failed', { error: 'cohort_too_small', minimum: 10, actual: 2 });
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('cohort_too_small');
    }
  });
});
