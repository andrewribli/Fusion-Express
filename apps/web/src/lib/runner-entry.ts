/**
 * Where the Runner control goes. Both campuses call this.
 * Loading returns no URL so the button cannot navigate before auth resolves.
 */

export type RunnerCampus = "cuhk" | "cityu";

export type RunnerEntryInput = {
  /** False until onAuthStateChanged / authStateReady has settled. */
  authReady: boolean;
  /**
   * Firebase already has a user, but the app profile is not in React yet.
   * Treat this as still loading so a phone tap cannot open sign-in.
   */
  profilePending?: boolean;
  /** A user record exists. Guests count as signed in so they are not sent to login. */
  signedIn: boolean;
  /** Role runner or both, or an existing isRunner flag. */
  runner: boolean;
  campus: RunnerCampus;
};

export type RunnerEntryDecision =
  | { status: "loading" }
  | { status: "ready"; href: string; runner: boolean };

const SIGNUP: Record<RunnerCampus, string> = {
  cuhk: "/runner/terms",
  cityu: "/cityu/runner/register",
};

const DASHBOARD: Record<RunnerCampus, string> = {
  cuhk: "/runner/dashboard",
  cityu: "/cityu/runner/dashboard",
};

const SIGNED_OUT: Record<RunnerCampus, string> = {
  cuhk: "/login?next=/runner/terms",
  cityu: "/cityu/login?next=/cityu/runner/register",
};

export function resolveRunnerEntry(input: RunnerEntryInput): RunnerEntryDecision {
  if (!input.authReady || input.profilePending) return { status: "loading" };
  if (!input.signedIn) {
    return { status: "ready", href: SIGNED_OUT[input.campus], runner: false };
  }
  if (input.runner) {
    return { status: "ready", href: DASHBOARD[input.campus], runner: true };
  }
  return { status: "ready", href: SIGNUP[input.campus], runner: false };
}
