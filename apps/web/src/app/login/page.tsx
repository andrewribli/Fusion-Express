"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CampusEmailOtp } from "@/components/CampusEmailOtp";
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
import {
  accessCampusForUser,
  postLoginDestination,
} from "@/lib/campus-access";
import {
  detectCampusFromEmail,
  type CampusId,
} from "@fusion-express/shared/campus";
import { friendlyAuthError } from "@/lib/auth-errors";
import { useDemoAuth } from "@/lib/use-demo-auth";
import { BootScreen } from "@/components/BootScreen";

const inputClassName =
  "mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-fusion-red focus:outline-none focus:ring-2 focus:ring-fusion-red/20";

type Mode = "signin" | "signup";
type SignupStep = 1 | 2 | 3;

function safeNextPath(): string | null {
  if (typeof window === "undefined") return null;
  const next = new URLSearchParams(window.location.search).get("next");
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  if (next.startsWith("/login") || next.startsWith("/signin")) return null;
  return next;
}

function postLoginPath(campus?: CampusId | null, email?: string | null): string {
  return postLoginDestination({
    campus,
    next: safeNextPath(),
    email: email ?? null,
  });
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [chineseName, setChineseName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [cuhkVerified, setCuhkVerified] = useState(false);
  /** Email that passed OTP — must match the address registered at submit. */
  const [verifiedEmail, setVerifiedEmail] = useState("");

  function composedFullName(): string {
    return [firstName, middleName, lastName]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(" ");
  }

  function continueAsGuest() {
    startGuestBrowse();
    setAppMode("customer");
    router.push(guestContinuePath(itemCount));
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
    setSignupStep(1);
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
        const campus = detectCampusFromEmail(identifier);
        if (campus) setAppCampus(campus);
        setAppMode("customer");
        router.push(postLoginPath(campus, identifier));
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
      if (!firstName.trim()) {
        setError("Enter your first name");
        return;
      }
      if (!lastName.trim()) {
        setError("Enter your last name");
        return;
      }
      setSignupStep(2);
      return;
    }
    if (signupStep === 2) {
      const passErr = validatePassword(password);
      if (passErr) {
        setError(passErr);
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      setSignupStep(3);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const registeringEmail = email.trim().toLowerCase();
    const campus = detectCampusFromEmail(registeringEmail);
    const passErr = validatePassword(password);
    const fullName = composedFullName();
    if (!firstName.trim() || !lastName.trim() || !fullName) {
      setError(
        !firstName.trim()
          ? "Enter your first name"
          : !lastName.trim()
            ? "Enter your last name"
            : "Enter your name",
      );
      setSignupStep(1);
      return;
    }
    if (passErr) {
      setError(passErr);
      setSignupStep(2);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setSignupStep(2);
      return;
    }
    if (!campus) {
      setError("Please use your CUHK or CityU email");
      setSignupStep(3);
      return;
    }
    if (!cuhkVerified || !verifiedEmail) {
      setError("Verify your university email before creating an account");
      setSignupStep(3);
      return;
    }
    if (registeringEmail !== verifiedEmail.trim().toLowerCase()) {
      setError(
        "Email changed after verification. Verify the email you want to register.",
      );
      setCuhkVerified(false);
      setVerifiedEmail("");
      setSignupStep(3);
      return;
    }
    if (!agreedToTerms) {
      setError("Please agree to the Terms & Conditions and Privacy Policy");
      return;
    }

    setLoading(true);
    try {
      const chinese = chineseName.trim();
      const profile = {
        email: registeringEmail,
        fullName: fullName.trim(),
        ...(chinese ? { chineseName: chinese } : {}),
        campus,
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
      setAppCampus(campus);
      setAppMode("customer");
      router.push(postLoginPath(campus, registeringEmail));
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
    const campus = accessCampusForUser(user);
    if (campus) setAppCampus(campus);
    router.replace(
      postLoginDestination({ campus, email: user.email, next: safeNextPath() }),
    );
  }, [user, isReady, router, setAppCampus]);

  if (!isReady) {
    return <BootScreen error={bootError} />;
  }

  if (bootError && !user) {
    return <BootScreen error={bootError} />;
  }

  // Guests must still see this form. Treating every stored profile as
  // "already signed in" left /login on "Loading…" forever, so the CityU
  // sign-in button never appeared and never submitted.
  if (user && !user.isGuest) {
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
                placeholder="you@link.cuhk.edu.hk or you@my.cityu.edu.hk"
                className={inputClassName}
              />
              <p className="mt-1 text-xs text-gray-500">
                CUHK email goes to GraceRun CUHK. CityU email goes to GraceRun CityU.
              </p>
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
              <p
                role="alert"
                className="rounded-xl bg-red-50 px-4 py-2 text-sm font-medium text-red-700"
              >
                {error}
              </p>
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
          </form>
        ) : (
          <form
            onSubmit={
              signupStep === 3
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
                Step {signupStep} of 3
              </p>
              <div className="mt-2 flex gap-1">
                {([1, 2, 3] as const).map((step) => (
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
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="firstName"
                    className="block text-xs font-medium text-gray-600"
                  >
                    First name
                  </label>
                  <input
                    id="firstName"
                    required
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Felix"
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label
                    htmlFor="lastName"
                    className="block text-xs font-medium text-gray-600"
                  >
                    Last name
                  </label>
                  <input
                    id="lastName"
                    required
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Wong"
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label
                    htmlFor="middleName"
                    className="block text-xs font-medium text-gray-600"
                  >
                    Middle name{" "}
                    <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <input
                    id="middleName"
                    autoComplete="additional-name"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    placeholder="If any"
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label
                    htmlFor="chineseName"
                    className="block text-xs font-medium text-gray-600"
                  >
                    Chinese name{" "}
                    <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <input
                    id="chineseName"
                    autoComplete="off"
                    value={chineseName}
                    onChange={(e) => setChineseName(e.target.value)}
                    placeholder="中文姓名（如有）"
                    className={inputClassName}
                  />
                </div>
              </div>
            )}

            {signupStep === 2 && (
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

            {signupStep === 3 && (
              <>
                <p className="text-sm text-gray-600">
                  A CUHK email opens GraceRun CUHK. A CityU email opens GraceRun CityU.
                </p>
                <CampusEmailOtp
                  anyCampus
                  initialEmail={email}
                  verified={cuhkVerified}
                  onVerified={(verified) => {
                    const normalized = verified.trim().toLowerCase();
                    const campus = detectCampusFromEmail(normalized);
                    setEmail(normalized);
                    setVerifiedEmail(normalized);
                    setCuhkVerified(true);
                    if (campus) setAppCampus(campus);
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
                (signupStep === 3 && (!cuhkVerified || !agreedToTerms))
              }
              className="min-h-12 w-full rounded-full bg-fusion-red py-4 text-base font-semibold text-white disabled:opacity-60"
            >
              {loading
                ? "Creating account…"
                : signupStep === 3
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

