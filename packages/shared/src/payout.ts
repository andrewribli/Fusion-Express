/**
 * Runner payout destination (how GraceRun reimburses the runner).
 * Stored on /users and /runners; denormalized onto orders at accept for admin payouts.
 */

export type PayoutMethod = "fps" | "payme" | "bank";

export interface PayoutDetails {
  fpsId?: string;
  paymePhone?: string;
  bankName?: string;
  bankAccount?: string;
  accountHolderName?: string;
}

/** Legacy order/runner field: PayMe | FPS | Bank */
export type RunnerPaymentMethodLabel = "PayMe" | "FPS" | "Bank";

export function payoutMethodLabel(method: PayoutMethod | null | undefined): string {
  switch (method) {
    case "fps":
      return "FPS";
    case "payme":
      return "PayMe";
    case "bank":
      return "Bank transfer";
    default:
      return "";
  }
}

export function toRunnerPaymentLabel(
  method: PayoutMethod | null | undefined,
): RunnerPaymentMethodLabel | undefined {
  if (method === "fps") return "FPS";
  if (method === "payme") return "PayMe";
  if (method === "bank") return "Bank";
  return undefined;
}

export function fromRunnerPaymentLabel(
  label: string | null | undefined,
): PayoutMethod | null {
  const n = (label ?? "").trim().toLowerCase();
  if (n === "fps") return "fps";
  if (n === "payme") return "payme";
  if (n === "bank" || n === "bank transfer") return "bank";
  return null;
}

/** Primary account id / number for the chosen method (for order denorm). */
export function primaryPayoutId(
  method: PayoutMethod | null | undefined,
  details: PayoutDetails | null | undefined,
): string {
  if (!method || !details) return "";
  if (method === "fps") return (details.fpsId ?? "").trim();
  if (method === "payme") return (details.paymePhone ?? "").trim();
  if (method === "bank") return (details.bankAccount ?? "").trim();
  return "";
}

export function hasCompletePayout(
  method: PayoutMethod | null | undefined,
  details: PayoutDetails | null | undefined,
): boolean {
  if (!method || !details) return false;
  const holder = (details.accountHolderName ?? "").trim();
  if (method === "fps") {
    return (details.fpsId ?? "").trim().length >= 8;
  }
  if (method === "payme") {
    const phone = (details.paymePhone ?? "").replace(/\D/g, "");
    return phone.length >= 8;
  }
  if (method === "bank") {
    return (
      (details.bankName ?? "").trim().length >= 2 &&
      (details.bankAccount ?? "").replace(/\s/g, "").length >= 6 &&
      holder.length >= 2
    );
  }
  return false;
}

/**
 * Legacy profiles only stored runnerPaymentMethod + runnerPaymentId.
 * Treat a non-empty id as complete so existing runners are not locked out
 * until they re-enter the richer form.
 */
export function hasPayoutOnFile(opts: {
  payoutMethod?: PayoutMethod | null;
  payoutDetails?: PayoutDetails | null;
  runnerPaymentMethod?: string | null;
  runnerPaymentId?: string | null;
}): boolean {
  if (hasCompletePayout(opts.payoutMethod, opts.payoutDetails)) return true;
  const legacyId = (opts.runnerPaymentId ?? "").trim();
  const legacyMethod = fromRunnerPaymentLabel(opts.runnerPaymentMethod);
  return Boolean(legacyMethod && legacyId.length >= 6);
}

/** True when the primary id looks too short / obviously wrong. */
export function payoutLooksMalformed(
  method: PayoutMethod | null | undefined,
  details: PayoutDetails | null | undefined,
): boolean {
  if (!method || !details) return false;
  if (method === "fps") {
    const id = (details.fpsId ?? "").trim();
    if (!id) return false;
    const digits = id.replace(/\D/g, "");
    const looksEmail = id.includes("@");
    return !looksEmail && digits.length > 0 && digits.length < 8;
  }
  if (method === "payme") {
    const phone = (details.paymePhone ?? "").replace(/\D/g, "");
    return phone.length > 0 && phone.length < 8;
  }
  if (method === "bank") {
    const acct = (details.bankAccount ?? "").replace(/\s/g, "");
    return acct.length > 0 && acct.length < 6;
  }
  return false;
}

export function buildPayoutDetailsFromLegacy(
  method: string | null | undefined,
  id: string | null | undefined,
  holderName?: string | null,
): { payoutMethod: PayoutMethod; payoutDetails: PayoutDetails } | null {
  const m = fromRunnerPaymentLabel(method);
  const trimmed = (id ?? "").trim();
  if (!m || !trimmed) return null;
  const details: PayoutDetails = {
    accountHolderName: holderName?.trim() || undefined,
  };
  if (m === "fps") details.fpsId = trimmed;
  if (m === "payme") details.paymePhone = trimmed;
  if (m === "bank") details.bankAccount = trimmed;
  return { payoutMethod: m, payoutDetails: details };
}
