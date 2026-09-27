/** Read page query parameters (App Router searchParams) without trusting their shape. */

export type SearchParams = Record<string, string | string[] | undefined>;

export function pickString(params: SearchParams, key: string): string | undefined {
  const raw = params[key];
  const value = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  return value ? value : undefined;
}

/** A value from a fixed set of choices, else the fallback. */
export function pickChoice<T extends string | number>(
  params: SearchParams,
  key: string,
  choices: readonly T[],
  fallback: T,
): T {
  const value = pickString(params, key);
  return choices.find((choice) => String(choice) === value) ?? fallback;
}

export function pickPage(params: SearchParams, key = 'page'): number {
  const value = Number(pickString(params, key));
  return Number.isInteger(value) && value > 0 ? value : 1;
}

/** Build a query string from the defined values only (leading "?" included when non-empty). */
export function toQuery(values: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== '') {
      query.set(key, String(value));
    }
  }
  const text = query.toString();
  return text ? `?${text}` : '';
}
