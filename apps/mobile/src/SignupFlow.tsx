import { useState } from "react";
import {
  Image,
  Linking,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  campusConfig,
  validateCampusEmail,
  type CampusId,
  CAMPUS_IDS,
} from "@fusion-express/shared/campus";
import { validatePassword } from "@fusion-express/shared/auth";
import { webAssetOrigin } from "@fusion-express/shared/products";
import { useAuth } from "./auth";
import { Card, PrimaryButton, SectionLabel } from "./ui";

type SignupStep = 1 | 2 | 3 | 4;

function existingAccountMessage(status: number, message: string): string | null {
  if (
    status === 409 ||
    /already in use|already exists|email-already-in-use/i.test(message)
  ) {
    return "Account already exists";
  }
  return null;
}

export function SignupFlow({ onDone }: { onDone?: () => void }) {
  const { signUp } = useAuth();
  const [step, setStep] = useState<SignupStep>(1);
  const [campus, setCampus] = useState<CampusId | null>(null);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [otpTicket, setOtpTicket] = useState("");
  const [sent, setSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [devCode, setDevCode] = useState("");
  const otpBusy = sendBusy || verifyBusy;

  function goNext() {
    setError("");
    if (step === 1) {
      if (!campus) {
        setError("Choose your university");
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!fullName.trim()) {
        setError("Enter your full name");
        return;
      }
      setStep(3);
      return;
    }
    if (step === 3) {
      const passErr = validatePassword(password);
      if (passErr) {
        setError(passErr);
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      setStep(4);
    }
  }

  async function requestCode(isResend = false) {
    if (!campus || sendBusy || verifyBusy) return;
    setError("");
    setInfo("");
    const invalid = validateCampusEmail(email, campus);
    if (invalid) {
      setError(invalid);
      return;
    }
    setSendBusy(true);
    try {
      const res = await fetch(`${webAssetOrigin()}/api/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          purpose: "signup",
          campus,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        devCode?: string;
        otpTicket?: string;
      };
      if (!res.ok) {
        const raw = data.error ?? data.message ?? "";
        setError(
          existingAccountMessage(res.status, raw) ??
            (raw || "Could not send code"),
        );
        return;
      }
      if (!data.otpTicket) {
        setError(
          "Could not start verification on this device. Try again in a moment.",
        );
        return;
      }
      setOtpTicket(data.otpTicket);
      setSent(true);
      setCode("");
      setDevCode(data.devCode ?? "");
      setInfo(
        isResend
          ? "New code sent. Check your university email."
          : "Code sent. Check your university email.",
      );
    } catch {
      setError("Could not send code");
    } finally {
      setSendBusy(false);
    }
  }

  async function verifyCode() {
    if (sendBusy || verifyBusy) return;
    setError("");
    setInfo("");
    const digits = code.replace(/\D/g, "").slice(0, 6);
    if (digits.length !== 6) {
      setError("Enter the 6-digit code");
      return;
    }
    if (!otpTicket) {
      setError("Request a new verification code first");
      setSent(false);
      return;
    }
    setVerifyBusy(true);
    try {
      const res = await fetch(`${webAssetOrigin()}/api/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: digits,
          purpose: "signup",
          otpTicket,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not verify code");
        return;
      }
      const normalized = email.trim().toLowerCase();
      setVerifiedEmail(normalized);
      setVerified(true);
      setOtpTicket("");
      setInfo("");
    } catch {
      setError("Could not verify code");
    } finally {
      setVerifyBusy(false);
    }
  }

  async function createAccount() {
    setError("");
    if (!campus) {
      setError("Choose your university");
      setStep(1);
      return;
    }
    const registeringEmail = email.trim().toLowerCase();
    const emailErr = validateCampusEmail(registeringEmail, campus);
    const passErr = validatePassword(password);
    if (!fullName.trim()) {
      setError("Enter your full name");
      setStep(2);
      return;
    }
    if (passErr) {
      setError(passErr);
      setStep(3);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setStep(3);
      return;
    }
    if (emailErr) {
      setError(emailErr);
      setStep(4);
      return;
    }
    if (!verified || !verifiedEmail) {
      setError(
        `Verify your ${campus === "cityu" ? "CityU" : "CUHK"} email before creating an account`,
      );
      setStep(4);
      return;
    }
    if (registeringEmail !== verifiedEmail.trim().toLowerCase()) {
      setError(
        "Email changed after verification. Verify the email you want to register.",
      );
      setVerified(false);
      setVerifiedEmail("");
      setStep(4);
      return;
    }
    if (!agreed) {
      setError("Please agree to the Terms & Conditions and Privacy Policy");
      return;
    }

    setCreateBusy(true);
    try {
      await signUp(password, {
        fullName: fullName.trim(),
        email: registeringEmail,
        campus,
        cuhkEmail: registeringEmail,
        cuhkVerifiedAt: new Date().toISOString(),
      });
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setCreateBusy(false);
    }
  }

  const cfg = campus ? campusConfig[campus] : null;

  return (
    <Card>
      <SectionLabel>Create account</SectionLabel>
      <Text className="mt-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Step {step} of 4
      </Text>
      <View className="mt-2 flex-row gap-1">
        {([1, 2, 3, 4] as const).map((n) => (
          <View
            key={n}
            className={`h-1.5 flex-1 rounded-full ${
              n <= step ? "bg-fusion" : "bg-gray-200"
            }`}
          />
        ))}
      </View>

      {step === 1 ? (
        <View className="mt-4">
          <Text className="text-sm text-gray-600">
            This sets your menus, dorms, and which university email we accept.
            You can't switch later without a new account.
          </Text>
          <Text className="mt-3 text-sm font-semibold text-gray-900">
            Which university are you from?
          </Text>
          <View className="mt-3 gap-3">
            {CAMPUS_IDS.map((id) => {
              const item = campusConfig[id];
              const active = campus === id;
              const logo = `${webAssetOrigin()}/images/campus/${id === "cuhk" ? "cuhk.png" : "cityu.svg"}`;
              return (
                <Pressable
                  key={id}
                  className={`rounded-2xl border p-4 ${
                    active
                      ? "border-fusion bg-red-50"
                      : "border-gray-200 bg-white"
                  }`}
                  onPress={() => {
                    setCampus(id);
                    setVerified(false);
                    setVerifiedEmail("");
                    setEmail("");
                    setSent(false);
                    setOtpTicket("");
                    setCode("");
                    setError("");
                    setInfo("");
                  }}
                >
                  <Image
                    source={{ uri: logo }}
                    style={{ width: 96, height: 48 }}
                    resizeMode="contain"
                  />
                  <Text className="mt-3 text-base font-bold text-gray-900">
                    {item.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {step === 2 ? (
        <View className="mt-4">
          <Text className="text-xs font-medium text-gray-600">Full Name</Text>
          <TextInput
            className="mt-1 rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900"
            placeholder="e.g. Felix Wong"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="words"
            value={fullName}
            onChangeText={setFullName}
          />
        </View>
      ) : null}

      {step === 3 ? (
        <View className="mt-4 gap-3">
          <View>
            <Text className="text-xs font-medium text-gray-600">Password</Text>
            <View className="mt-1 flex-row items-center rounded-xl border border-gray-200 bg-white">
              <TextInput
                className="flex-1 px-3 py-3 text-sm text-gray-900"
                placeholder="Password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <Pressable
                className="px-3 py-3"
                onPress={() => setShowPassword((v) => !v)}
              >
                <Text className="text-sm font-semibold text-fusion">
                  {showPassword ? "Hide" : "Show"}
                </Text>
              </Pressable>
            </View>
          </View>
          <View>
            <Text className="text-xs font-medium text-gray-600">
              Re-type password
            </Text>
            <TextInput
              className="mt-1 rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900"
              placeholder="Re-type password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>
        </View>
      ) : null}

      {step === 4 && campus && cfg ? (
        <View className="mt-4 gap-3">
          {verified ? (
            <View className="rounded-xl bg-green-50 px-4 py-3">
              <Text className="text-sm text-green-800">
                {cfg.name} email verified: {verifiedEmail}
              </Text>
            </View>
          ) : (
            <>
              <View>
                <Text className="text-xs font-medium text-gray-600">
                  {cfg.name} email
                </Text>
                <TextInput
                  className="mt-1 rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900"
                  placeholder={
                    campus === "cityu"
                      ? "xxxxxx@my.cityu.edu.hk"
                      : "1155xxxxxx@link.cuhk.edu.hk"
                  }
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    setSent(false);
                    setOtpTicket("");
                    setCode("");
                    setInfo("");
                  }}
                />
                <Text className="mt-1 text-xs text-gray-500">
                  Use your{" "}
                  {cfg.emailDomains.map((d) => `@${d}`).join(" or ")} email. We
                  send a one-time code.
                </Text>
              </View>
              {!sent ? (
                <PrimaryButton
                  label={sendBusy ? "Sending…" : "Send verification code"}
                  busy={sendBusy}
                  disabled={otpBusy}
                  onPress={() => void requestCode(false)}
                />
              ) : (
                <>
                  <TextInput
                    className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm tracking-widest text-gray-900"
                    placeholder="6-digit code"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                    maxLength={6}
                    textContentType="oneTimeCode"
                    autoComplete="one-time-code"
                    value={code}
                    onChangeText={(v) =>
                      setCode(v.replace(/\D/g, "").slice(0, 6))
                    }
                  />
                  {devCode ? (
                    <Text className="text-xs text-amber-700">
                      Dev code: {devCode}
                    </Text>
                  ) : null}
                  <PrimaryButton
                    label={verifyBusy ? "Verifying…" : "Verify email"}
                    busy={verifyBusy}
                    disabled={otpBusy || code.length !== 6}
                    onPress={() => void verifyCode()}
                  />
                  <Pressable
                    className="items-center py-2"
                    disabled={otpBusy}
                    onPress={() => void requestCode(true)}
                  >
                    <Text
                      className={`text-sm font-semibold underline ${
                        otpBusy ? "text-gray-400" : "text-fusion"
                      }`}
                    >
                      {sendBusy ? "Sending new code…" : "Resend code"}
                    </Text>
                  </Pressable>
                </>
              )}
            </>
          )}

          <Pressable
            className="flex-row items-start gap-3"
            onPress={() => setAgreed((v) => !v)}
          >
            <View
              className={`mt-0.5 h-5 w-5 items-center justify-center rounded border ${
                agreed ? "border-fusion bg-fusion" : "border-gray-300"
              }`}
            >
              {agreed ? (
                <Text className="text-xs font-bold text-white">✓</Text>
              ) : null}
            </View>
            <Text className="flex-1 text-sm text-gray-700">
              I agree to the{" "}
              <Text
                className="font-semibold text-fusion"
                onPress={() =>
                  void Linking.openURL(`${webAssetOrigin()}/terms`)
                }
              >
                Terms & Conditions
              </Text>{" "}
              and{" "}
              <Text
                className="font-semibold text-fusion"
                onPress={() =>
                  void Linking.openURL(`${webAssetOrigin()}/privacy`)
                }
              >
                Privacy Policy
              </Text>
            </Text>
          </Pressable>
        </View>
      ) : null}

      {info && !error ? (
        <Text className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {info}
        </Text>
      ) : null}
      {error ? (
        <Text className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </Text>
      ) : null}

      {step > 1 ? (
        <Pressable
          className="mt-3"
          onPress={() => {
            setError("");
            setInfo("");
            setStep((s) => (s > 1 ? ((s - 1) as SignupStep) : s));
          }}
        >
          <Text className="text-center text-sm font-semibold text-gray-600 underline">
            Back
          </Text>
        </Pressable>
      ) : null}

      <PrimaryButton
        label={
          createBusy
            ? "Creating account…"
            : step === 4
              ? "Create Account"
              : "Next"
        }
        busy={createBusy}
        className="mt-4"
        disabled={
          createBusy ||
          otpBusy ||
          (step === 1 && !campus) ||
          (step === 4 && (!verified || !agreed))
        }
        onPress={() => {
          if (step === 4) void createAccount();
          else goNext();
        }}
      />
    </Card>
  );
}
