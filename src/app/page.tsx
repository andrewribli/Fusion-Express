"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { DeliveryAddressFields } from "@/components/DeliveryAddressFields";
import { HomeLanding } from "@/components/HomeLanding";
import { useUser } from "@/context/UserContext";
import { validatePassword, validateUsername } from "@/lib/auth";
import { isFirebaseConfigured } from "@/lib/firebase";

const inputClassName =
  "mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-fusion-red focus:outline-none focus:ring-2 focus:ring-fusion-red/20";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const { user, isReady, firebaseEnabled, login, signUp, signIn } = useUser();

  const [mode, setMode] = useState<Mode>("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [chineseName, setChineseName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [college, setCollege] = useState("");
  const [hall, setHall] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const userErr = validateUsername(username);
    const passErr = validatePassword(password);
    if (userErr || passErr) {
      setError(userErr ?? passErr ?? "");
      return;
    }

    setLoading(true);
    try {
      if (firebaseEnabled) {
        await signIn(username, password);
      } else {
        setError("Live login requires Firebase. Add env vars to .env.local.");
      }
    } catch (err) {
      setError(
        err instanceof Error && err.message.includes("invalid-credential")
          ? "Wrong username or password"
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
    const passErr = validatePassword(password);
    if (userErr || passErr) {
      setError(userErr ?? passErr ?? "");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!fullName.trim() || !chineseName.trim() || !studentId.trim()) {
      setError("Please fill in all required profile fields");
      return;
    }
    if (!college || !hall) {
      setError("Please select college and hall");
      return;
    }

    setLoading(true);
    try {
      if (firebaseEnabled) {
        await signUp(username, password, {
          fullName: fullName.trim(),
          chineseName: chineseName.trim(),
          studentId: studentId.trim(),
          college,
          hall,
          roomNumber: roomNumber.trim() || undefined,
          phone: phone.trim() || undefined,
        });
      } else {
        // Offline dev fallback — no password stored
        login({
          username: username.trim(),
          fullName: fullName.trim(),
          chineseName: chineseName.trim(),
          studentId: studentId.trim(),
          college,
          hall,
          roomNumber: roomNumber.trim() || undefined,
          phone: phone.trim() || undefined,
        });
        router.push("/home");
      }
    } catch (err) {
      setError(
        err instanceof Error && err.message.includes("email-already-in-use")
          ? "Username already taken"
          : err instanceof Error
            ? err.message
            : "Sign up failed",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-sm text-gray-500">
        Loading…
      </div>
    );
  }

  if (user) {
    return <HomeLanding />;
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-[480px] px-4 py-8">
        <div className="mb-6 text-center">
          <Image
            src="https://upload.wikimedia.org/wikipedia/commons/9/9a/Fusion_logo.svg"
            alt="Fusion"
            width={56}
            height={56}
            className="mx-auto h-14 w-14 object-contain"
          />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Fusion Express</h1>
          <p className="mt-1 text-sm text-gray-500">CUHK Dorm Delivery</p>
        </div>

        {!firebaseEnabled && (
          <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
            Dev mode: Firebase not configured. Create account saves locally only.
            For Felix&apos;s live demo, deploy with Firebase env vars.
          </p>
        )}

        <div className="mb-4 flex rounded-xl bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold ${
              mode === "signin" ? "bg-white text-fusion-red shadow-sm" : "text-gray-600"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold ${
              mode === "signup" ? "bg-white text-fusion-red shadow-sm" : "text-gray-600"
            }`}
          >
            Create Account
          </button>
        </div>

        {mode === "signin" ? (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-xs font-medium text-gray-600">
                Username
              </label>
              <input
                id="username"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. felix"
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-gray-600">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClassName}
              />
            </div>
            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-fusion-red py-4 text-base font-semibold text-white disabled:opacity-60"
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
            <div>
              <label className="block text-xs font-medium text-gray-600">Password</label>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClassName}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">
                Confirm Password
              </label>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClassName}
              />
            </div>

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
              <label className="block text-xs font-medium text-gray-600">Chinese Name</label>
              <input
                required
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
                  roomNumber={roomNumber}
                  onCollegeChange={setCollege}
                  onHallChange={setHall}
                  onRoomNumberChange={setRoomNumber}
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
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-fusion-red py-4 text-base font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-gray-400">
          {firebaseEnabled
            ? "Your account is saved securely. Stay signed in on this device."
            : "Local dev mode — configure Firebase for live accounts."}
        </p>

        <p className="mt-4 text-center">
          <a href="/runner/terms" className="text-xs font-medium text-gray-500 underline">
            Become a Runner →
          </a>
        </p>
      </main>
    </div>
  );
}
