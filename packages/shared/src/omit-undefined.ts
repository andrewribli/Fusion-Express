/**
 * Firestore rejects `undefined` anywhere in a document (including nested maps
 * and array elements). Strip those keys before addDoc/setDoc/updateDoc.
 *
 * Preserves Date, Firestore Timestamp-like objects, and other class instances
 * (FieldValue, GeoPoint, DocumentReference, etc.).
 */
export function omitUndefined<T extends Record<string, unknown>>(
  value: T,
): Record<string, unknown> {
  return omitUndefinedDeep(value) as Record<string, unknown>;
}

export function omitUndefinedDeep(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (Array.isArray(value)) {
    return value.map((item) => {
      const cleaned = omitUndefinedDeep(item);
      // Array slots cannot be omitted; replace accidental undefined with null
      // so Firestore never sees undefined. Callers should not put undefined
      // in arrays — prefer omitting optional object keys instead.
      return cleaned === undefined ? null : cleaned;
    });
  }
  if (typeof value !== "object") return value;

  // Keep Date / Timestamp / FieldValue / DocumentReference as-is.
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    return value;
  }

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (val === undefined) continue;
    const cleaned = omitUndefinedDeep(val);
    if (cleaned !== undefined) out[key] = cleaned;
  }
  return out;
}

/** Throws if any nested value is still undefined (guardrail for createOrder). */
export function assertNoUndefined(
  value: unknown,
  path = "payload",
): void {
  if (value === undefined) {
    throw new Error(`Firestore payload has undefined at ${path}`);
  }
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, i) => assertNoUndefined(item, `${path}[${i}]`));
    return;
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return;
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    assertNoUndefined(val, `${path}.${key}`);
  }
}
