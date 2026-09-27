import { ApiError } from './api';
import type { CohortTooSmallDetail } from '@/types';

export type UiErrorKind = 'forbidden' | 'not_found' | 'cohort_too_small' | 'invalid' | 'failed';

export interface UiError {
  kind: UiErrorKind;
  message: string;
  status: number | null;
}

export function isCohortTooSmall(detail: unknown): detail is CohortTooSmallDetail {
  return (
    typeof detail === 'object' &&
    detail !== null &&
    (detail as { error?: unknown }).error === 'cohort_too_small' &&
    typeof (detail as { minimum?: unknown }).minimum === 'number' &&
    typeof (detail as { actual?: unknown }).actual === 'number'
  );
}

/** First human-readable message in a FastAPI validation error list, if any. */
function validationMessage(detail: unknown): string | null {
  if (typeof detail === 'string') {
    return detail;
  }
  if (Array.isArray(detail) && detail.length > 0) {
    const first: unknown = detail[0];
    if (first && typeof first === 'object' && typeof (first as { msg?: unknown }).msg === 'string') {
      return (first as { msg: string }).msg.replace(/^Value error, /, '');
    }
  }
  return null;
}

/**
 * Turn a backend status + detail into a message a clinician or researcher can act on.
 *
 * Shared by server pages (which receive an ApiError) and by client components
 * (which receive the status and JSON body a proxy route passed through).
 */
export function describeFailure(status: number | null, detail: unknown): UiError {
  if (status === 401) {
    return { kind: 'forbidden', status, message: 'Your session has expired. Sign in again.' };
  }
  if (status === 403) {
    return {
      kind: 'forbidden',
      status,
      message: 'Your role does not have access to this information.',
    };
  }
  if (status === 404 || status === 410) {
    return {
      kind: 'not_found',
      status,
      message: validationMessage(detail) ?? 'That item is not available.',
    };
  }
  if (status === 422 && isCohortTooSmall(detail)) {
    return {
      kind: 'cohort_too_small',
      status,
      message:
        `This selection covers ${detail.actual} record${detail.actual === 1 ? '' : 's'}; ` +
        `at least ${detail.minimum} are required so that no individual can be identified. ` +
        'Broaden the filters and try again.',
    };
  }
  if (status === 422 || status === 400) {
    return {
      kind: 'invalid',
      status,
      message: validationMessage(detail) ?? 'Some of the values entered are not valid.',
    };
  }
  return {
    kind: 'failed',
    status,
    message:
      status === null
        ? 'Could not reach the server. Check that the backend is running.'
        : 'The server could not complete this request.',
  };
}

export function describeError(error: unknown): UiError {
  if (error instanceof ApiError) {
    return describeFailure(error.status, error.detail);
  }
  return describeFailure(null, undefined);
}

export type Loaded<T> = { ok: true; data: T } | { ok: false; error: UiError };

/** Run one backend read and capture its failure instead of throwing. */
export async function load<T>(read: () => Promise<T>): Promise<Loaded<T>> {
  try {
    return { ok: true, data: await read() };
  } catch (error) {
    return { ok: false, error: describeError(error) };
  }
}
