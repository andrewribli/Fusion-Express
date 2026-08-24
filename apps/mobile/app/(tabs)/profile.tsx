import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import {
  signInWithUsername,
  signOutUser,
  validatePassword,
  validateUsername,
} from "@fusion-express/shared/auth";

export default function ProfileScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [signedIn, setSignedIn] = useState(false);

  async function onSignIn() {
    setMessage("");
    const userErr = validateUsername(username);
    const passErr = validatePassword(password);
    if (userErr || passErr) {
      setMessage(userErr ?? passErr ?? "");
      return;
    }
    try {
      await signInWithUsername(username, password);
      setSignedIn(true);
      setMessage(`Signed in as ${username}`);
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
        Same username as the website (not an email).
      </Text>
      <TextInput
        className="mt-6 rounded-xl border border-gray-200 px-4 py-3"
        placeholder="Username"
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        className="mt-3 rounded-xl border border-gray-200 px-4 py-3"
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
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
