"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CuhkEmailOtp } from "@/components/CuhkEmailOtp";
import { DeliveryAddressFields } from "@/components/DeliveryAddressFields";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { AppLogo } from "@/components/AppLogo";
import { ForgotPasswordModal } from "@/components/ForgotPasswordModal";
import { PasswordInput } from "@/components/PasswordInput";
import { LegalLink } from "@/components/LegalLink";
import { SiteFooter } from "@/components/SiteFooter";
import { useUser } from "@/context/UserContext";
import { validateEmail, validatePassword, validateUsername } from "@/lib/auth";
import { useDemoAuth } from "@/lib/use-demo-auth";
import { BootScreen } from "@/components/BootScreen";

const inputClassName =
  "mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-fusion-red focus:outline-none focus:ring-2 focus:ring-fusion-red/20";

type Mode = "signin" | "signup";
type Role = "customer" | "runner";

const ROLE_CHOICES: {
  id: Role;
  headline: string;
  body: string;
  icon: string;
}[] = [
  {
    id: "customer",
    headline: "I want to order groceries",
    body: "Browse Fusion, place an order, and track it to your hall lobby.",
    icon: "🛍️",
  },
  {
    id: "runner",
    headline: "I want to earn as a runner",
    body: "Pick up available orders, deliver them, and get paid per delivery.",
    icon: "🏃",
  },
];

function roleHome(role: Role): string {
  return role === "runner" ? "/runner" : "/";
}

function postLoginPath(role: Role): string {
  if (typeof window === "undefined") return roleHome(role);
  const next = new URLSearchParams(window.location.search).get("next");
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return roleHome(role);
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
  } = useUser();
  const demoAuth = useDemoAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [role, setRole] = useState<Role>("customer");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [chineseName, setChineseName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [college, setCollege] = useState("");
  const [hall, setHall] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [cuhkVerified, setCuhkVerified] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const identifier = email.trim();
    const idErr = identifier.includes("@")
      ? validateEmail(identifier)
      : validateUsername(identifier);
    const passErr = validatePassword(password);
    if (idErr || passErr) {
      setError(idErr ?? passErr ?? "");
      return;
    }

    setLoading(true);
    try {
      if (firebaseEnabled || demoAuth) {
        await signIn(identifier, password);
        setAppMode(role === "runner" ? "runner" : "customer");
        router.push(postLoginPath(role));
      } else {
        setError("Live login requires Firebase. Add env vars to .env.local.");
      }
    } catch (err) {
      setError(
        err instanceof Error && err.message.includes("invalid-credential")
          ? "Wrong email or password"
          : err instanceof Error
            ? err.message
            : "Sign in failed",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const userErr = validateUsername(username);
    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);
    if (userErr || emailErr || passErr) {
      setError(userErr ?? emailErr ?? passErr ?? "");
      return;
    }
    if (!cuhkVerified) {
      setError("Verify your CUHK email before creating an account");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!fullName.trim() || !studentId.trim()) {
      setError("Please fill in all required profile fields");
      return;
    }
    if (!college || !hall) {
      setError("Please select college and hall");
      return;
    }
    if (!agreedToTerms) {
      setError("Please agree to the Terms & Conditions and Privacy Policy");
      return;
    }

    setLoading(true);
    try {
      const profile = {
        email: email.trim().toLowerCase(),
        fullName: fullName.trim(),
        chineseName: chineseName.trim(),
        studentId: studentId.trim(),
        college,
        hall,
        phone: phone.trim() || undefined,
        cuhkEmail: email.trim().toLowerCase(),
        cuhkVerifiedAt: new Date().toISOString(),
        role,
      };

      if (firebaseEnabled || demoAuth) {
        await signUp(username, password, profile);
      } else {
        // Offline dev fallback — no password stored
        login({ ...profile, username: username.trim() });
      }
      setAppMode(role === "runner" ? "runner" : "customer");
      router.push(role === "runner" ? "/runner/terms" : postLoginPath("customer"));
    } catch (err) {
      setError(
        err instanceof Error && err.message.includes("email-already-in-use")
          ? "Email already in use"
          : err instanceof Error
            ? err.message
            : "Sign up failed",
      );
    } finally {
      setLoading(false);
    }
  }

  // Already signed in — never leave people stuck on the auth form.
  useEffect(() => {
    if (!isReady || !user) return;
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
          <AppLogo size={120} className="mx-auto h-28 w-28" priority />
        </div>

        <div className="mb-5 rounded-2xl border-2 border-[#ED1C24]/30 bg-red-50 px-4 py-3 text-center">
          <Link
            href="/"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#ED1C24] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#c4161d]"
          >
            Continue as Guest
          </Link>
          <p className="mt-2 text-xs leading-snug text-gray-700">
            Browse without signing in — order with just dorm, lobby, and phone.
          </p>
        </div>

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

        <fieldset className="mb-5">
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            {mode === "signup"
              ? "What do you want to do on GraceRun?"
              : "Sign in as"}
          </legend>
          <div className="space-y-2">
            {ROLE_CHOICES.map((choice) => (
              <button
                key={choice.id}
                type="button"
                onClick={() => setRole(choice.id)}
                aria-pressed={role === choice.id}
                className={`flex w-full items-start gap-3 rounded-2xl border-2 px-4 py-3 text-left ${
                  role === choice.id
                    ? "border-[#ED1C24] bg-red-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <span aria-hidden className="text-2xl leading-none">
                  {choice.icon}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-gray-900">
                    {choice.headline}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-gray-500">
                    {choice.body}
                  </span>
                </span>
                <span
                  aria-hidden
                  className={`ml-auto mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${
                    role === choice.id
                      ? "border-[#ED1C24] bg-[#ED1C24]"
                      : "border-gray-300"
                  }`}
                />
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {role === "runner"
              ? "You will read the runner terms right after creating your account. You can still order groceries any time."
              : "You can add runner access later from your profile."}
          </p>
        </fieldset>

        <div className="mb-4 flex rounded-xl bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold ${
              mode === "signin" ? "bg-lakers-gold text-lakers-navy shadow-sm" : "text-gray-600"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
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
                Email or username
              </label>
              <input
                id="email"
                type="text"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email or username (CUHK email)"
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
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600">Username</label>
              <input
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. felix"
                className={inputClassName}
              />
            </div>
            <CuhkEmailOtp
              initialEmail={email}
              verified={cuhkVerified}
              hint="Use your @link.cuhk.edu.hk email. We send a one-time code to verify you are a CUHK student."
              onVerified={(cuhkEmail) => {
                setEmail(cuhkEmail);
                setCuhkVerified(true);
              }}
            />
            <PasswordInput
              label="Password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <PasswordInput
              label="Confirm Password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <div>
              <label className="block text-xs font-medium text-gray-600">
                Full Name (English)
              </label>
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Felix Wong"
                className={inputClassName}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">
                Chinese Name (optional)
              </label>
              <input
                value={chineseName}
                onChange={(e) => setChineseName(e.target.value)}
                className={inputClassName}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Student ID</label>
              <input
                required
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className={inputClassName}
              />
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Delivery Address
              </p>
              <div className="mt-3">
                <DeliveryAddressFields
                  college={college}
                  hall={hall}
                  onCollegeChange={setCollege}
                  onHallChange={setHall}
                  showPricing={false}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600">
                Phone <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClassName}
              />
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
            )}
            {!cuhkVerified && (
              <p className="rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-900">
                Scroll up and verify your @link.cuhk.edu.hk email with the
                6-digit code before creating an account.
              </p>
            )}
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
            <button
              type="submit"
              disabled={loading || !agreedToTerms}
              className="min-h-12 w-full rounded-full bg-fusion-red py-4 text-base font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>
        )}

        <div className="mt-6 border-t border-gray-100 pt-5 text-center">
          <p className="text-sm text-gray-600">
            Don&apos;t want an account right now?{" "}
            <Link
              href="/"
              className="font-bold text-[#ED1C24] underline underline-offset-2"
            >
              Browse without signing in
            </Link>
          </p>
        </div>

        <p className="mt-5 text-center text-xs text-gray-400">
          {demoAuth
            ? "Demo session only — close this tab and the account is gone."
            : firebaseEnabled
              ? "Your account is saved securely. Stay signed in on this device."
              : "Local dev mode — configure Firebase for live accounts."}
        </p>

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
