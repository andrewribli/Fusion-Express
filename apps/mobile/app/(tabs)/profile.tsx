import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { validateEmail, validatePassword } from "@fusion-express/shared/auth";
import { useAuth } from "../../src/auth";
import { isAppleSignInAvailable } from "../../src/apple-auth";
import { DeleteAccountModal } from "../../src/DeleteAccountModal";
import { SignupFlow } from "../../src/SignupFlow";
import {
  Card,
  LoadingBlock,
  OutlineDangerButton,
  Page,
  PrimaryButton,
  ScreenHeader,
  SecondaryButton,
  SectionLabel,
} from "../../src/ui";

type AuthMode = "signin" | "signup";

export default function ProfileScreen() {
  const { user, profile, loading, signIn, signInApple, signOut } = useAuth();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    void isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  async function onSignIn() {
    setMessage("");
    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);
    if (emailErr || passErr) {
      setMessage(emailErr ?? passErr ?? "");
      return;
    }
    setBusy(true);
    try {
      await signIn(email, password);
      setMessage(`Signed in as ${email.trim().toLowerCase()}`);
      setPassword("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  async function onApple() {
    setMessage("");
    setBusy(true);
    try {
      await signInApple();
      setMessage("Signed in with Apple");
    } catch (err) {
      const text = err instanceof Error ? err.message : "Apple Sign In failed";
      if (text !== "Sign in cancelled") setMessage(text);
    } finally {
      setBusy(false);
    }
  }

  async function onSignOut() {
    setBusy(true);
    try {
      await signOut();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Sign out failed");
    } finally {
      setBusy(false);
    }
  }

  function onDeleteAccountPress() {
    Alert.alert(
      "Delete account?",
      "This permanently removes your GraceRun account and profile. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: () => setDeleteOpen(true),
        },
      ],
    );
  }

  if (loading) {
    return (
      <Page>
        <ScreenHeader title="Profile" />
        <LoadingBlock label="Loading account…" />
      </Page>
    );
  }

  return (
    <Page>
      <ScreenHeader title="Profile" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 py-4 pb-10"
          keyboardShouldPersistTaps="handled"
        >
          <Text className="mb-3 text-sm text-gray-500">
            Sign in or create an account with your university email. Address is
            collected at checkout.
          </Text>

          {user ? (
            <>
              <Card>
                <SectionLabel>Account</SectionLabel>
                <Text className="mt-3 text-base font-bold text-gray-900">
                  {profile?.fullName || user.email || user.uid}
                </Text>
                {user.email ? (
                  <Text className="mt-1 text-sm text-gray-600">{user.email}</Text>
                ) : null}
                {profile?.campus ? (
                  <Text className="mt-1 text-sm text-gray-600">
                    Campus: {profile.campus === "cityu" ? "CityU" : "CUHK"}
                  </Text>
                ) : null}
                {profile?.isRunner && profile.phone ? (
                  <Text className="mt-1 text-sm text-gray-600">
                    Phone: {profile.phone}
                  </Text>
                ) : null}
                {profile?.isRunner ? (
                  <View className="mt-3 self-start rounded-full bg-red-50 px-3 py-1">
                    <Text className="text-xs font-semibold text-fusion">
                      Runner access enabled
                    </Text>
                  </View>
                ) : (
                  <Text className="mt-2 text-xs text-gray-500">
                    Customer account — use the Runner tab to sign up as a runner.
                  </Text>
                )}
              </Card>

              <Card className="mt-3">
                <SectionLabel>Account type</SectionLabel>
                <Text className="mt-2 text-base font-bold text-gray-900">
                  {profile?.isRunner ? "Runner + customer" : "Customer"}
                </Text>
                <Text className="mt-1 text-xs text-gray-500">
                  Switch to the Runner tab to accept deliveries when enabled.
                </Text>
              </Card>

              <Card className="mt-3">
                <SectionLabel>Session</SectionLabel>
                <SecondaryButton
                  label={busy ? "Working…" : "Sign out"}
                  className="mt-3"
                  disabled={busy}
                  onPress={() => void onSignOut()}
                />
              </Card>

              <Card className="mt-6 border-red-100">
                <SectionLabel>Delete account</SectionLabel>
                <Text className="mt-2 text-xs text-gray-500">
                  Permanently remove your GraceRun account, profile, and sign-in.
                  Required for App Store Guideline 5.1.1.
                </Text>
                <OutlineDangerButton
                  label="Delete Account"
                  className="mt-3"
                  disabled={busy}
                  onPress={onDeleteAccountPress}
                />
              </Card>
            </>
          ) : (
            <>
              <View className="mb-3 flex-row rounded-xl bg-gray-100 p-1">
                <Pressable
                  className={`flex-1 rounded-lg py-2.5 ${
                    mode === "signin" ? "bg-white" : ""
                  }`}
                  onPress={() => {
                    setMode("signin");
                    setMessage("");
                  }}
                >
                  <Text
                    className={`text-center text-sm font-semibold ${
                      mode === "signin" ? "text-gray-900" : "text-gray-600"
                    }`}
                  >
                    Sign In
                  </Text>
                </Pressable>
                <Pressable
                  className={`flex-1 rounded-lg py-2.5 ${
                    mode === "signup" ? "bg-white" : ""
                  }`}
                  onPress={() => {
                    setMode("signup");
                    setMessage("");
                  }}
                >
                  <Text
                    className={`text-center text-sm font-semibold ${
                      mode === "signup" ? "text-gray-900" : "text-gray-600"
                    }`}
                  >
                    Create Account
                  </Text>
                </Pressable>
              </View>

              {mode === "signin" ? (
                <Card>
                  <SectionLabel>Sign in</SectionLabel>
                  <TextInput
                    className="mt-3 rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900"
                    placeholder="Your university email"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                    value={email}
                    onChangeText={setEmail}
                  />
                  <View className="mt-3 flex-row items-center rounded-xl border border-gray-200 bg-white">
                    <TextInput
                      className="flex-1 px-3 py-3 text-sm text-gray-900"
                      placeholder="Password"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        showPassword ? "Hide password" : "Show password"
                      }
                      className="px-3 py-3"
                      onPress={() => setShowPassword((v) => !v)}
                    >
                      <Text className="text-sm font-semibold text-fusion">
                        {showPassword ? "Hide" : "Show"}
                      </Text>
                    </Pressable>
                  </View>
                  <PrimaryButton
                    label="Sign in"
                    busy={busy}
                    className="mt-4"
                    onPress={() => void onSignIn()}
                  />

                  {appleAvailable ? (
                    <View className="mt-4">
                      <View className="mb-3 flex-row items-center gap-3">
                        <View className="h-px flex-1 bg-gray-200" />
                        <Text className="text-xs font-semibold text-gray-400">
                          OR
                        </Text>
                        <View className="h-px flex-1 bg-gray-200" />
                      </View>
                      <AppleAuthentication.AppleAuthenticationButton
                        buttonType={
                          AppleAuthentication.AppleAuthenticationButtonType
                            .SIGN_IN
                        }
                        buttonStyle={
                          AppleAuthentication.AppleAuthenticationButtonStyle
                            .BLACK
                        }
                        cornerRadius={12}
                        style={{ width: "100%", height: 44 }}
                        onPress={() => void onApple()}
                      />
                    </View>
                  ) : null}

                  <Pressable
                    className="mt-4"
                    onPress={() => {
                      setMode("signup");
                      setMessage("");
                    }}
                  >
                    <Text className="text-center text-sm font-semibold text-fusion">
                      No account? Create one
                    </Text>
                  </Pressable>

                  <Text className="mt-3 text-xs text-gray-500">
                    Guest checkout works from Shop without signing in.
                  </Text>
                </Card>
              ) : (
                <SignupFlow
                  onDone={() =>
                    setMessage("Account created. You are signed in.")
                  }
                />
              )}
            </>
          )}

          {message ? (
            <Text
              className={`mt-3 text-sm ${
                /does not exist|failed|Incorrect|already exists/i.test(message)
                  ? "text-red-700"
                  : "text-gray-700"
              }`}
            >
              {message}
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <DeleteAccountModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
      />
    </Page>
  );
}
