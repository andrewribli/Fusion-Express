import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { validateEmail, validatePassword } from "@fusion-express/shared/auth";
import { useAuth } from "../../src/auth";

export default function ProfileScreen() {
  const { user, profile, loading, signIn, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

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

  async function onSignOut() {
    setBusy(true);
    try {
      await signOut();
      setMessage("Signed out");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Sign out failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 bg-page px-4 pt-6">
        <Text className="font-sans text-muted">Loading account…</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-page px-4 pt-6">
      <Text className="font-sans-bold text-xl text-ink">Profile</Text>
      <Text className="mt-1 font-sans text-sm text-muted">
        Sign in with your CUHK email. Address is collected at checkout only.
      </Text>

      {user ? (
        <View className="mt-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <Text className="font-sans-semibold text-base text-ink">
            {user.email ?? user.uid}
          </Text>
          {profile?.fullName ? (
            <Text className="mt-1 font-sans text-sm text-gray-600">
              {profile.fullName}
            </Text>
          ) : null}
          {profile?.phone ? (
            <Text className="mt-1 font-sans text-sm text-gray-600">
              {profile.phone}
            </Text>
          ) : null}
          {profile?.isRunner ? (
            <View className="mt-3 self-start rounded-full bg-red-50 px-3 py-1">
              <Text className="font-sans-semibold text-xs text-fusion">
                Runner access enabled
              </Text>
            </View>
          ) : (
            <Text className="mt-2 font-sans text-xs text-muted">
              Customer account (enable runner on web to accept jobs)
            </Text>
          )}
          <Pressable
            className="mt-4 rounded-2xl border-2 border-fusion py-3"
            disabled={busy}
            onPress={() => void onSignOut()}
          >
            <Text className="text-center font-sans-semibold text-fusion">
              {busy ? "Working…" : "Sign out"}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View className="mt-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <TextInput
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 font-sans"
            placeholder="1155xxxxxx@link.cuhk.edu.hk"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <View className="mt-3 flex-row items-center rounded-xl border border-gray-200 bg-white">
            <TextInput
              className="flex-1 px-4 py-3 font-sans"
              placeholder="Password"
              placeholderTextColor="#9ca3af"
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
              <Text className="font-sans-semibold text-sm text-fusion">
                {showPassword ? "Hide" : "Show"}
              </Text>
            </Pressable>
          </View>
          <Pressable
            className="mt-4 rounded-2xl bg-fusion py-3"
            disabled={busy}
            onPress={() => void onSignIn()}
          >
            <Text className="text-center font-sans-semibold text-white">
              {busy ? "Signing in…" : "Sign in"}
            </Text>
          </Pressable>
        </View>
      )}

      {message ? (
        <Text className="mt-3 font-sans text-sm text-gray-700">{message}</Text>
      ) : null}
    </View>
  );
}
