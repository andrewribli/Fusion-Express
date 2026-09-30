/** Same digits-only phone check the rest of the app uses. Kept local so tests do not load Firebase. */
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

function validatePhone(phone: string): string | null {
  const digits = normalizePhone(phone);
  if (digits.length < 8) return "Enter a valid phone number";
  if (digits.length > 15) return "Phone number is too long";
  return null;
}

/** Local part of a CUHK address (1155xxxxxx@link.cuhk.edu.hk). CityU IDs are numeric too. */
const SID_MIN = 7;
const SID_MAX = 12;

export function normalizeStudentId(raw: string): string {
  return raw.replace(/\s+/g, "");
}

/**
 * Plausible campus SID: digits only, no email domain.
 * Empty, letters, and extreme lengths are rejected with a message for the sheet.
 */
export function validateStudentId(raw: string): string | null {
  const sid = normalizeStudentId(raw);
  if (!sid) return "Student ID is required to become a runner.";
  if (!/^\d+$/.test(sid)) {
    return "Student ID should be digits only, without the email domain.";
  }
  if (sid.length < SID_MIN || sid.length > SID_MAX) {
    return `Student ID should be ${SID_MIN} to ${SID_MAX} digits.`;
  }
  return null;
}

export function studentIdPlaceholder(campus: string | undefined): string {
  return campus === "cityu" ? "51234567" : "1155xxxxxx";
}

export function studentIdHint(campus: string | undefined): string {
  return campus === "cityu"
    ? "Your CityU student number. Digits only — leave off the email domain."
    : "Digits only, the part before @link.cuhk.edu.hk.";
}

/** Customers who become runners stay able to order. Role "runner" cannot. */
export const RUNNER_SIGNUP_ROLE = "both" as const;

export type RunnerAgreeProfile = {
  uid?: string;
  isGuest?: boolean;
  fullName?: string;
  campus?: string;
  college?: string;
  hall?: string;
  runnerPaymentMethod?: "PayMe" | "FPS";
  runnerPaymentId?: string;
};

export type RunnerAgreeFields = {
  studentId: string;
  phone: string;
  collegeId: string;
};

export type RunnerCollegeSave = {
  runnerCollege?: string;
  confirmation?: string;
  emailSent?: boolean;
};

export type RunnerActivationInput = {
  uid: string;
  fullName: string;
  studentId: string;
  phone: string;
  college: string;
  hall: string;
  paymentMethod: "PayMe" | "FPS";
  paymentId: string;
  role: typeof RUNNER_SIGNUP_ROLE;
};

export type RunnerAgreeDeps = {
  getIdToken: () => Promise<string | null | undefined>;
  saveCollege: (token: string, collegeId: string) => Promise<RunnerCollegeSave>;
  /**
   * One Firestore batch: the runners doc and the user flags together.
   * Do not write the profile and the runner record as separate calls.
   */
  activateRunner: (
    input: RunnerActivationInput,
  ) => Promise<{ runnerId: string; role: typeof RUNNER_SIGNUP_ROLE }>;
};

export type RunnerAgreeSuccess = {
  ok: true;
  phone: string;
  studentId: string;
  runnerCollege?: string;
  runnerCollegeLockedAt?: string;
  collegeNote: string;
  runnerId: string;
  role: typeof RUNNER_SIGNUP_ROLE;
  payment: { method: "PayMe" | "FPS"; id: string };
};

export type RunnerAgreeResult = RunnerAgreeSuccess | { ok: false; error: string };

/**
 * Validates the sheet, locks CUHK college, then activates the runner in one batch.
 * Validation and remote failures return `{ ok: false, error }` so the sheet can show them.
 */
export async function submitRunnerAgreement(
  profile: RunnerAgreeProfile,
  fields: RunnerAgreeFields,
  deps: RunnerAgreeDeps,
): Promise<RunnerAgreeResult> {
  const uid = profile.uid ?? "";
  const fullName = profile.fullName?.trim() ?? "";
  if (!uid) {
    return { ok: false, error: "Please sign in again before becoming a runner." };
  }
  if (profile.isGuest || !fullName || fullName === "Guest") {
    return {
      ok: false,
      error: "Finish a full customer account before becoming a runner.",
    };
  }

  const sidErr = validateStudentId(fields.studentId);
  if (sidErr) return { ok: false, error: sidErr };
  const studentId = normalizeStudentId(fields.studentId);

  const phoneErr = validatePhone(fields.phone);
  if (phoneErr) return { ok: false, error: phoneErr };

  const needsCollege = profile.campus !== "cityu";
  if (needsCollege && !fields.collegeId) {
    return { ok: false, error: "Choose your college. This is permanent." };
  }

  const phone = normalizePhone(fields.phone);

  try {
    let runnerCollege: string | undefined;
    let runnerCollegeLockedAt: string | undefined;
    let collegeNote = "";

    if (needsCollege) {
      const token = await deps.getIdToken();
      if (!token) {
        return { ok: false, error: "Sign in again before becoming a runner." };
      }
      const saved = await deps.saveCollege(token, fields.collegeId);
      runnerCollege = saved.runnerCollege ?? fields.collegeId;
      runnerCollegeLockedAt = new Date().toISOString();
      if (saved.confirmation) {
        collegeNote = saved.emailSent
          ? saved.confirmation
          : `${saved.confirmation} We could not send the email, so keep this message.`;
      }
    }

    const paymentMethod = profile.runnerPaymentMethod ?? "PayMe";
    const paymentId = profile.runnerPaymentId || phone;
    const activated = await deps.activateRunner({
      uid,
      fullName,
      studentId,
      phone,
      college: profile.college ?? "",
      hall: profile.hall ?? "",
      paymentMethod,
      paymentId,
      role: RUNNER_SIGNUP_ROLE,
    });

    return {
      ok: true,
      phone,
      studentId,
      runnerCollege,
      runnerCollegeLockedAt,
      collegeNote,
      runnerId: activated.runnerId,
      role: activated.role,
      payment: { method: paymentMethod, id: paymentId },
    };
  } catch (err) {
    const message =
      err instanceof Error && err.message
        ? err.message
        : "Could not activate runner access. Try again.";
    return { ok: false, error: message };
  }
}

/** After a successful agree the user is a runner, so the terms sheet must not stay up. */
export function routeAfterRunnerAgree(isRunner: boolean): "/runner/dashboard" | null {
  return isRunner ? "/runner/dashboard" : null;
}
