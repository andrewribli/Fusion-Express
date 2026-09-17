import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import {
  signInWithEmail,
  signOutUser,
  validateEmail,
  validatePassword,
} from "@fusion-express/shared/auth";

export default function ProfileScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [signedIn, setSignedIn] = useState(false);

  async function onSignIn() {
    setMessage("");
    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);
    if (emailErr || passErr) {
      setMessage(emailErr ?? passErr ?? "");
      return;
    }
    try {
      await signInWithEmail(email, password);
      setSignedIn(true);
      setMessage(`Signed in as ${email.trim().toLowerCase()}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Sign in failed");
    }
  }

  async function onSignOut() {
    await signOutUser();
    setSignedIn(false);
    setMessage("Signed out");
  }

  return (
    <View className="flex-1 bg-white px-4 pt-6">
      <Text className="text-xl font-bold">Profile</Text>
      <Text className="mt-1 text-sm text-gray-500">
        Sign in with your CUHK email.
      </Text>
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
          <Text className="text-lg">{showPassword ? "🙈" : "👁"}</Text>
        </Pressable>
      </View>
      {message ? (
        <Text className="mt-3 text-sm text-gray-700">{message}</Text>
      ) : null}
      {signedIn ? (
        <Pressable
          className="mt-4 rounded-2xl border border-gray-300 py-3"
          onPress={() => void onSignOut()}
        >
          <Text className="text-center font-semibold">Sign out</Text>
        </Pressable>
      ) : (
        <Pressable
          className="mt-4 rounded-2xl bg-fusion py-3"
          onPress={() => void onSignIn()}
        >
          <Text className="text-center font-semibold text-white">Sign in</Text>
        </Pressable>
      )}
    </View>
  );
}
