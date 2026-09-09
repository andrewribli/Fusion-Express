/** Firestore rejects `undefined` field values. */
export function omitUndefined<T extends Record<string, unknown>>(
  value: T,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    if (val !== undefined) out[key] = val;
  }
  return out;
}
