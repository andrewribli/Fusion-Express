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
      <View className="flex-1 bg-white px-4 pt-6">
        <Text className="text-gray-500">Loading account…</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white px-4 pt-6">
      <Text className="text-xl font-bold">Profile</Text>
      <Text className="mt-1 text-sm text-gray-500">
        Sign in with your CUHK email. Address is collected at checkout only.
      </Text>

      {user ? (
        <View className="mt-6 rounded-2xl border border-gray-200 p-4">
          <Text className="font-semibold">{user.email ?? user.uid}</Text>
          {profile?.fullName ? (
            <Text className="mt-1 text-sm text-gray-600">{profile.fullName}</Text>
          ) : null}
          {profile?.isRunner && profile.phone ? (
            <Text className="mt-1 text-sm text-gray-600">{profile.phone}</Text>
          ) : null}
          {profile?.isRunner ? (
            <Text className="mt-2 text-xs font-semibold text-fusion">
              Runner access enabled
            </Text>
          ) : (
            <Text className="mt-2 text-xs text-gray-500">
              Customer account (enable runner on web to accept jobs)
            </Text>
          )}
          <Pressable
            className="mt-4 rounded-2xl border border-gray-300 py-3"
            disabled={busy}
            onPress={() => void onSignOut()}
          >
            <Text className="text-center font-semibold">
              {busy ? "Working…" : "Sign out"}
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          <TextInput
            className="mt-6 rounded-xl border border-gray-200 px-4 py-3"
            placeholder="1155xxxxxx@link.cuhk.edu.hk"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <View className="mt-3 flex-row items-center rounded-xl border border-gray-200">
            <TextInput
              className="flex-1 px-4 py-3"
              placeholder="Password"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              className="px-3 py-3"
              onPress={() => setShowPassword((v) => !v)}
            >
              <Text className="text-sm text-fusion">
                {showPassword ? "Hide" : "Show"}
              </Text>
            </Pressable>
          </View>
          <Pressable
            className="mt-4 rounded-2xl bg-fusion py-3"
            disabled={busy}
            onPress={() => void onSignIn()}
          >
            <Text className="text-center font-semibold text-white">
              {busy ? "Signing in…" : "Sign in"}
            </Text>
          </Pressable>
        </>
      )}

      {message ? (
        <Text className="mt-3 text-sm text-gray-700">{message}</Text>
      ) : null}
    </View>
  );
}
