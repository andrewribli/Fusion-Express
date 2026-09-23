"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLogo } from "@/ptero/components/AppLogo";
import { SiteFooter } from "@/ptero/components/SiteFooter";
import { PrototypeBanner } from "@/ptero/components/PrototypeBanner";
import { CAMPUS } from "@/ptero/config/campus";
import { DEMO_CUSTOMER, DEMO_RUNNER } from "@/ptero/config/demo";
import { useAppState } from "@/ptero/context/AppState";
import { useCart } from "@/ptero/context/CartContext";
import { validateEmail, validatePassword } from "@/ptero/lib/auth";
import { formInputClassName } from "@/ptero/components/DeliveryAddressFields";
import { CityUEmailOtp } from "@/ptero/components/CityUEmailOtp";

type Mode = "signin" | "signup";

function safeNextPath(): string | null {
  if (typeof window === "undefined") return null;
  const next = new URLSearchParams(window.location.search).get("next");
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  if (next.startsWith("/cityu/login")) return null;
  return next;
}

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signUp, setMode: setAppMode } = useAppState();
  const { itemCount } = useCart();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [cityuVerifiedEmail, setCityuVerifiedEmail] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "signup") setMode("signup");
  }, []);

  function postLoginPath() {
    return safeNextPath() ?? "/cityu";
  }

  function continueAsGuest() {
    setAppMode("customer");
    router.push(safeNextPath() ?? (itemCount > 0 ? "/cityu/checkout" : "/cityu"));
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
      await signIn(demo.email, demo.password);
      setAppMode(asRunner ? "runner" : "customer");
      router.push(asRunner ? "/cityu/runner/dashboard" : postLoginPath());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo sign in failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const identifier = email.trim().toLowerCase();
    const emailErr = validateEmail(identifier);
    const passErr = validatePassword(password);
    if (emailErr || passErr) {
      setError(emailErr ?? passErr ?? "");
      return;
    }
    setLoading(true);
    try {
      await signIn(identifier, password);
      setAppMode("customer");
      router.push(postLoginPath());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!fullName.trim()) {
      setError("Enter your full name");
      return;
    }
    if (!cityuVerifiedEmail) {
      setError("Verify your CityU email with the one-time code before signing up.");
      return;
    }
    const registeringEmail = cityuVerifiedEmail;
    const emailErr = validateEmail(registeringEmail);
    if (emailErr) {
      setError(emailErr);
      return;
    }
    const passErr = validatePassword(password);
    if (passErr) {
      setError(passErr);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await signUp({
        name: fullName.trim(),
        email: registeringEmail,
        password,
      });
      setAppMode("customer");
      router.push(postLoginPath());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      <PrototypeBanner />
      <main className="mx-auto max-w-[420px] px-4 py-10">
        <div className="flex flex-col items-center">
          <AppLogo size={160} className="h-40 w-40" />
          <p className="mt-3 text-center text-sm text-gray-500">{CAMPUS.tagline}</p>
        </div>

        <div className="mt-6 grid grid-cols-2 rounded-xl bg-gray-200 p-1 text-sm font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setError("");
            }}
            className={`rounded-lg py-2 ${mode === "signin" ? "bg-white text-gray-900 shadow" : "text-gray-500"}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError("");
              setCityuVerifiedEmail(null);
            }}
            className={`rounded-lg py-2 ${mode === "signup" ? "bg-white text-gray-900 shadow" : "text-gray-500"}`}
          >
            Sign up
          </button>
        </div>

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        {mode === "signin" ? (
          <form onSubmit={handleSignIn} className="mt-4 space-y-3 rounded-2xl bg-white p-4 shadow-sm">
            <label className="block text-xs font-medium text-gray-600">
              CityU email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@my.cityu.edu.hk"
                className={formInputClassName}
              />
            </label>
            <label className="block text-xs font-medium text-gray-600">
              Password
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={formInputClassName}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-fusion-red py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="mt-4 space-y-3 rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">
              Only @cityu.edu.hk and @my.cityu.edu.hk addresses can create an account.
              Verify your email with a one-time code first. Customers do not need a phone number.
            </p>
            <CityUEmailOtp
              verified={Boolean(cityuVerifiedEmail)}
              initialEmail={cityuVerifiedEmail ?? ""}
              onVerified={(verifiedEmail) => {
                setCityuVerifiedEmail(verifiedEmail);
                setEmail(verifiedEmail);
                setError("");
              }}
            />
            <label className="block text-xs font-medium text-gray-600">
              Full name
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={formInputClassName}
                disabled={!cityuVerifiedEmail}
              />
            </label>
            <label className="block text-xs font-medium text-gray-600">
              Password
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={formInputClassName}
                disabled={!cityuVerifiedEmail}
              />
            </label>
            <label className="block text-xs font-medium text-gray-600">
              Confirm password
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={formInputClassName}
                disabled={!cityuVerifiedEmail}
              />
            </label>
            <button
              type="submit"
              disabled={loading || !cityuVerifiedEmail}
              className="w-full rounded-xl bg-fusion-red py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Creating account…" : "Create CityU account"}
            </button>
          </form>
        )}

        <div className="mt-4 space-y-2 rounded-2xl border border-dashed border-[#ED1C24]/40 bg-red-50 p-4">
          <p className="text-xs font-semibold text-gray-800">Prototype demo accounts</p>
          <p className="text-[11px] text-gray-600">
            Password for both: <span className="font-mono font-semibold">cityu1234</span>
          </p>
          <button
            type="button"
            disabled={loading}
            onClick={() => void signInAsDemo(DEMO_CUSTOMER, false)}
            className="w-full rounded-xl bg-white py-2.5 text-sm font-semibold text-gray-900 shadow-sm disabled:opacity-60"
          >
            Sign in as demo customer
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void signInAsDemo(DEMO_RUNNER, true)}
            className="w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            Sign in as demo runner
          </button>
        </div>

        <button
          type="button"
          onClick={continueAsGuest}
          className="mt-4 w-full rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-800"
        >
          Continue as guest
        </button>
        <p className="mt-3 text-center text-xs text-gray-500">
          Guest checkout only needs your dorm and lobby — no phone, no email.
        </p>
        <SiteFooter />
      </main>
    </div>
  );
}
