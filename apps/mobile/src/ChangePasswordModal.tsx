import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  changePassword,
  validatePassword,
} from "@fusion-express/shared/auth";

function changeErrorMessage(err: unknown): string {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code: string }).code)
      : err instanceof Error
        ? err.message
        : "";
  if (code.includes("wrong-password") || code.includes("invalid-credential")) {
    return "Current password is incorrect";
  }
  if (code.includes("weak-password")) {
    return "New password must be at least 6 characters";
  }
  if (code.includes("requires-recent-login")) {
    return "Please sign out and sign in again, then change your password.";
  }
  if (err instanceof Error && err.message) return err.message;
  return "Could not change password. Try again.";
}

export function ChangePasswordModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setLoading(false);
    setDone(false);
    setError("");
  }, [open]);

  async function onSubmit() {
    setError("");
    const newErr = validatePassword(newPassword);
    if (newErr) {
      setError(newErr);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }
    if (currentPassword === newPassword) {
      setError("New password must be different from your current password");
      return;
    }
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setDone(true);
    } catch (err) {
      setError(changeErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="rounded-t-3xl bg-white px-5 pb-10 pt-5">
          <Text className="text-lg font-bold text-gray-900">Change password</Text>
          {done ? (
            <>
              <Text className="mt-3 text-sm text-gray-700">
                Your password has been updated.
              </Text>
              <Pressable
                className="mt-5 rounded-xl bg-fusion py-3"
                onPress={onClose}
              >
                <Text className="text-center text-sm font-semibold text-white">
                  Done
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <TextInput
                className="mt-4 rounded-xl border border-gray-200 px-3 py-3 text-sm text-gray-900"
                placeholder="Current password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
              <TextInput
                className="mt-3 rounded-xl border border-gray-200 px-3 py-3 text-sm text-gray-900"
                placeholder="New password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <TextInput
                className="mt-3 rounded-xl border border-gray-200 px-3 py-3 text-sm text-gray-900"
                placeholder="Confirm new password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              {error ? (
                <Text className="mt-3 text-sm text-red-700">{error}</Text>
              ) : null}
              <View className="mt-5 flex-row gap-3">
                <Pressable
                  className="flex-1 rounded-xl border border-gray-300 py-3"
                  disabled={loading}
                  onPress={onClose}
                >
                  <Text className="text-center text-sm font-semibold text-gray-700">
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  className="flex-1 rounded-xl bg-fusion py-3"
                  disabled={loading}
                  onPress={() => void onSubmit()}
                >
                  <Text className="text-center text-sm font-semibold text-white">
                    {loading ? "Saving…" : "Update"}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
