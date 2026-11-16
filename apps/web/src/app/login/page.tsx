"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CampusEmailOtp } from "@/components/CampusEmailOtp";
import { CampusPickerCards } from "@/components/CampusPickerCards";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { AppLogo } from "@/components/AppLogo";
import { ForgotPasswordModal } from "@/components/ForgotPasswordModal";
import { PasswordInput } from "@/components/PasswordInput";
import { LegalLink } from "@/components/LegalLink";
import { SiteFooter } from "@/components/SiteFooter";
import { useCart } from "@/context/CartContext";
import { useCampus } from "@/context/CampusContext";
import { useUser } from "@/context/UserContext";
import { validateEmail, validatePassword } from "@/lib/auth";
import { validateCampusEmail, type CampusId } from "@fusion-express/shared/campus";
import { friendlyAuthError } from "@/lib/auth-errors";
import { useDemoAuth } from "@/lib/use-demo-auth";
import { BootScreen } from "@/components/BootScreen";
import {
  DEMO_CITYU_CUSTOMER,
  DEMO_CITYU_RUNNER,
} from "@/config/demo";

const inputClassName =
  "mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-fusion-red focus:outline-none focus:ring-2 focus:ring-fusion-red/20";

type Mode = "signin" | "signup";
type SignupStep = 1 | 2 | 3 | 4;

function safeNextPath(): string | null {
  if (typeof window === "undefined") return null;
  const next = new URLSearchParams(window.location.search).get("next");
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  if (next.startsWith("/login") || next.startsWith("/signin")) return null;
  return next;
}

function postLoginPath(): string {
  return safeNextPath() ?? "/";
}

/**
 * Guest browse/order path: honor ?next= (e.g. /checkout), else cart → checkout,
 * else shop with guest=1. Dorm and lobby are collected at checkout.
 * ensureGuestCheckout — guests never need an account first.
 */
function guestContinuePath(itemCount: number): string {
  return safeNextPath() ?? (itemCount > 0 ? "/checkout" : "/?guest=1");
}

export default function LoginPage() {
  const router = useRouter();
  const {
    user,
    isReady,
    firebaseEnabled,
    login,
    signUp,
    signIn,
    bootError,
    setMode: setAppMode,
    startGuestBrowse,
  } = useUser();
  const { itemCount } = useCart();
  const { setCampus: setAppCampus } = useCampus();
  const demoAuth = useDemoAuth();

  const [mode, setMode] = useState<Mode>("signin");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("mode") === "signup") {
      setMode("signup");
    }
  }, []);
  const [signupStep, setSignupStep] = useState<SignupStep>(1);
  const [signupCampus, setSignupCampus] = useState<CampusId | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [cuhkVerified, setCuhkVerified] = useState(false);
  /** Email that passed OTP — must match the address registered at submit. */
  const [verifiedEmail, setVerifiedEmail] = useState("");

  function continueAsGuest() {
    startGuestBrowse();
    setAppMode("customer");
    router.push(guestContinuePath(itemCount));
  }

  async function signInAsDemo(
    demo: { email: string; password: string },
    asRunner: boolean,
  ) {
    setError("");
    setLoading(true);
    setEmail(demo.email);
    setPassword(demo.password);
    try {
      if (!firebaseEnabled && !demoAuth) {
        throw new Error("Firebase is not configured — cannot sign in demo accounts.");
      }
      if (demoAuth) {
        await signUp(demo.password, {
          fullName: asRunner ? DEMO_CITYU_RUNNER.name : DEMO_CITYU_CUSTOMER.name,
          email: demo.email,
          campus: "cityu",
          cuhkEmail: demo.email,
          cuhkVerifiedAt: new Date().toISOString(),
          isRunner: asRunner,
          phone: asRunner ? DEMO_CITYU_RUNNER.phone : undefined,
          college: asRunner ? DEMO_CITYU_RUNNER.college : undefined,
        });
      } else {
        await signIn(demo.email, demo.password);
      }
      setAppMode(asRunner ? "runner" : "customer");
      router.push(asRunner ? "/runner/dashboard" : postLoginPath());
    } catch (err) {
      setError(friendlyAuthError(err) || "Demo sign in failed");
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
    setSignupStep(1);
    setSignupCampus(null);
    setCuhkVerified(false);
    setVerifiedEmail("");
    setAgreedToTerms(false);
    setPassword("");
    setConfirmPassword("");
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const identifier = email.trim().toLowerCase();
    const idErr = validateEmail(identifier);
    const passErr = validatePassword(password);
    if (idErr || passErr) {
      setError(idErr ?? passErr ?? "");
      return;
    }

    setLoading(true);
    try {
      if (firebaseEnabled || demoAuth) {
        await signIn(identifier, password);
        setAppMode("customer");
        router.push(postLoginPath());
      } else {
        setError("Live login requires Firebase. Add env vars to .env.local.");
      }
    } catch (err) {
      setError(friendlyAuthError(err, "Sign in failed"));
    } finally {
      setLoading(false);
    }
  }

  function goSignupNext() {
    setError("");
    if (signupStep === 1) {
      if (!signupCampus) {
        setError("Choose your university");
        return;
      }
      setAppCampus(signupCampus);
      setSignupStep(2);
      return;
    }
    if (signupStep === 2) {
      if (!fullName.trim()) {
        setError("Enter your full name");
        return;
      }
      setSignupStep(3);
      return;
    }
    if (signupStep === 3) {
      const passErr = validatePassword(password);
      if (passErr) {
        setError(passErr);
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      setSignupStep(4);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!signupCampus) {
      setError("Choose your university");
      setSignupStep(1);
      return;
    }

    const registeringEmail = email.trim().toLowerCase();
    const emailErr = validateCampusEmail(registeringEmail, signupCampus);
    const passErr = validatePassword(password);
    if (!fullName.trim()) {
      setError("Enter your full name");
      setSignupStep(2);
      return;
    }
    if (passErr) {
      setError(passErr);
      setSignupStep(3);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setSignupStep(3);
      return;
    }
    if (emailErr) {
      setError(emailErr);
      setSignupStep(4);
      return;
    }
    if (!cuhkVerified || !verifiedEmail) {
      setError(`Verify your ${signupCampus === "cityu" ? "CityU" : "CUHK"} email before creating an account`);
      setSignupStep(4);
      return;
    }
    if (registeringEmail !== verifiedEmail.trim().toLowerCase()) {
      setError(
        "Email changed after verification. Verify the email you want to register.",
      );
      setCuhkVerified(false);
      setVerifiedEmail("");
      setSignupStep(4);
      return;
    }
    if (!agreedToTerms) {
      setError("Please agree to the Terms & Conditions and Privacy Policy");
      return;
    }

    setLoading(true);
    try {
      const profile = {
        email: registeringEmail,
        fullName: fullName.trim(),
        campus: signupCampus,
        isGuest: false,
        isRunner: false,
        cuhkEmail: registeringEmail,
        cuhkVerifiedAt: new Date().toISOString(),
      };

      if (firebaseEnabled || demoAuth) {
        await signUp(password, profile);
      } else {
        login(profile);
      }
      setAppCampus(signupCampus);
      setAppMode("customer");
      router.push(postLoginPath());
    } catch (err) {
      setError(friendlyAuthError(err, "Sign up failed"));
    } finally {
      setLoading(false);
    }
  }

  // Already signed in — never leave people stuck on the auth form. Guest
  // checkout sessions still need to reach sign-up to make a real account.
  useEffect(() => {
    if (!isReady || !user || user.isGuest) return;
    router.replace("/");
  }, [user, isReady, router]);

  if (!isReady) {
    return <BootScreen error={bootError} />;
  }

  if (bootError && !user) {
    return <BootScreen error={bootError} />;
  }

  if (user) {
    return <BootScreen />;
  }

  return (
    <LakersWallpaper>
      <main className="mx-auto max-w-[480px] px-4 py-6">
        <div className="rounded-2xl bg-white/95 p-5 shadow-lg ring-2 ring-lakers-gold">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#1a1a1a] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-black"
            aria-label="Back to homepage"
          >
            <span aria-hidden className="text-base leading-none">
              ←
            </span>
            Back
          </Link>
          <Link
            href="/"
            className="text-xs font-semibold text-[#ED1C24] underline underline-offset-2"
          >
            Home
          </Link>
        </div>

        <div className="mb-5 text-center">
          <AppLogo size={96} className="mx-auto h-24 w-24" priority />
        </div>

        <div className="mb-5 rounded-2xl border-2 border-[#ED1C24]/30 bg-red-50 px-4 py-3 text-center">
          <button
            type="button"
            onClick={continueAsGuest}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#ED1C24] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#c4161d]"
          >
            {itemCount > 0 ? "Continue as Guest · Checkout" : "Continue as Guest"}
          </button>
          <p className="mt-2 text-xs leading-snug text-gray-700">
            Browse and order without signing in — checkout only needs your
            dorm and lobby.
          </p>
        </div>

        <p className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-900">
          Ordering groceries?{" "}
          <button
            type="button"
            onClick={continueAsGuest}
            className="font-semibold text-[#ED1C24] underline"
          >
            Shop now as guest
          </button>{" "}
          and check out with just your dorm and lobby — no sign-up required.
          Runners still need a full verified account.
        </p>

        {!firebaseEnabled && !demoAuth && (
          <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
            Dev mode: Firebase not configured. Create account saves locally only.
            For Felix&apos;s live demo, deploy with Firebase env vars.
          </p>
        )}
        {demoAuth && (
          <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-900">
            Testing demo: verify a real @link.cuhk.edu.hk email with the OTP,
            then create an account. It stays in this tab only and is never saved
            to the database.
          </p>
        )}

        <div className="mb-4 flex rounded-xl bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => switchMode("signin")}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold ${
              mode === "signin" ? "bg-lakers-gold text-lakers-navy shadow-sm" : "text-gray-600"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold ${
              mode === "signup" ? "bg-lakers-gold text-lakers-navy shadow-sm" : "text-gray-600"
            }`}
          >
            Create Account
          </button>
        </div>

        {mode === "signin" ? (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-gray-600">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your university email"
                className={inputClassName}
              />
            </div>
            <div>
              <PasswordInput
                id="password"
                label="Password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {!demoAuth && (
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="mt-2 text-sm font-semibold text-[#ED1C24] underline underline-offset-2"
                >
                  Forgot Password?
                </button>
              )}
            </div>
            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="min-h-12 w-full rounded-full bg-fusion-red py-4 text-base font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
            <div className="rounded-2xl border-2 border-[#ED1C24]/30 bg-red-50 px-4 py-3 text-center">
              <button
                type="button"
                onClick={continueAsGuest}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#ED1C24] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#c4161d]"
              >
                {itemCount > 0
                  ? "Continue as Guest · Checkout"
                  : "Continue as Guest"}
              </button>
              <p className="mt-2 text-xs leading-snug text-gray-700">
                Browse and order without signing in — checkout only needs your
                dorm and lobby.
              </p>
            </div>
            <div className="space-y-2 rounded-2xl border border-dashed border-[#ED1C24]/40 bg-red-50 p-4">
              <p className="text-xs font-semibold text-gray-800">
                CityU prototype demo accounts
              </p>
              <p className="text-[11px] text-gray-600">
                Password for both:{" "}
                <span className="font-mono font-semibold">cityu1234</span>
              </p>
              <button
                type="button"
                disabled={loading}
                onClick={() => void signInAsDemo(DEMO_CITYU_CUSTOMER, false)}
                className="w-full rounded-xl bg-white py-2.5 text-sm font-semibold text-gray-900 shadow-sm disabled:opacity-60"
              >
                Sign in as demo CityU customer
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void signInAsDemo(DEMO_CITYU_RUNNER, true)}
                className="w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                Sign in as demo CityU runner
              </button>
            </div>
          </form>
        ) : (
          <form
            onSubmit={
              signupStep === 4
                ? handleSignUp
                : (e) => {
                    e.preventDefault();
                    goSignupNext();
                  }
            }
            className="space-y-4"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Step {signupStep} of 4
              </p>
              <div className="mt-2 flex gap-1">
                {([1, 2, 3, 4] as const).map((step) => (
                  <span
                    key={step}
                    className={`h-1.5 flex-1 rounded-full ${
                      step <= signupStep ? "bg-[#ED1C24]" : "bg-gray-200"
                    }`}
                  />
                ))}
              </div>
            </div>

            {signupStep === 1 && (
              <>
                <p className="text-sm text-gray-600">
                  This sets your menus, dorms, and which university email we
                  accept. You can&apos;t switch later without a new account.
                </p>
                <CampusPickerCards
                  value={signupCampus}
                  onChange={(campus) => {
                    setSignupCampus(campus);
                    setCuhkVerified(false);
                    setVerifiedEmail("");
                    setEmail("");
                  }}
                />
              </>
            )}

            {signupStep === 2 && (
              <div>
                <label htmlFor="fullName" className="block text-xs font-medium text-gray-600">
                  Full Name
                </label>
                <input
                  id="fullName"
                  required
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Felix Wong"
                  className={inputClassName}
                />
              </div>
            )}

            {signupStep === 3 && (
              <>
                <PasswordInput
                  id="signup-password"
                  label="Password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <PasswordInput
                  id="signup-password-confirm"
                  label="Re-type password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </>
            )}

            {signupStep === 4 && signupCampus && (
              <>
                <CampusEmailOtp
                  campus={signupCampus}
                  initialEmail={email}
                  verified={cuhkVerified}
                  onVerified={(verified) => {
                    const normalized = verified.trim().toLowerCase();
                    setEmail(normalized);
                    setVerifiedEmail(normalized);
                    setCuhkVerified(true);
                    setError("");
                  }}
                />
                <div className="flex items-start gap-3 text-sm text-gray-700">
                  <input
                    id="signup-agree"
                    type="checkbox"
                    required
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[#ED1C24]"
                  />
                  <p>
                    <label htmlFor="signup-agree">I agree to the </label>
                    <LegalLink href="/terms">Terms &amp; Conditions</LegalLink>
                    <label htmlFor="signup-agree"> and </label>
                    <LegalLink href="/privacy">Privacy Policy</LegalLink>
                  </p>
                </div>
              </>
            )}

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
            )}

            {signupStep > 1 && (
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setSignupStep((step) => (step > 1 ? ((step - 1) as SignupStep) : step));
                }}
                className="w-full text-sm font-semibold text-gray-600 underline underline-offset-2"
              >
                Back
              </button>
            )}

            <button
              type="submit"
              disabled={
                loading ||
                (signupStep === 1 && !signupCampus) ||
                (signupStep === 4 && (!cuhkVerified || !agreedToTerms))
              }
              className="min-h-12 w-full rounded-full bg-fusion-red py-4 text-base font-semibold text-white disabled:opacity-60"
            >
              {loading
                ? "Creating account…"
                : signupStep === 4
                  ? "Create Account"
                  : "Next"}
            </button>
          </form>
        )}

        <p className="mt-5 text-center text-xs text-gray-400">
          {demoAuth
            ? "Demo session only — close this tab and the account is gone."
            : firebaseEnabled
              ? "Your account is saved securely. Stay signed in on this device."
              : "Local dev mode — configure Firebase for live accounts."}
        </p>

        {/* Follow-up: gate createUser via /api/signup/complete using SIGNUP_SESSION_COOKIE. */}

        </div>
      </main>
      <SiteFooter />
      <ForgotPasswordModal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        initialEmail={email}
      />
    </LakersWallpaper>
  );
}

