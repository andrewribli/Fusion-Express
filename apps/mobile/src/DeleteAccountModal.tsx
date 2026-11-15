import { useState } from "react";
import {
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "./auth";

export function DeleteAccountModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user, deleteAccount } = useAuth();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onDelete() {
    if (confirm.trim().toUpperCase() !== "DELETE") {
      setError("Type DELETE to confirm.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await deleteAccount();
      setConfirm("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete account.");
      setBusy(false);
    }
  }

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-center bg-black/40 px-4">
        <View className="w-full max-w-sm rounded-2xl bg-white p-5">
          <Text className="text-lg font-bold text-gray-900">Delete account</Text>
          <Text className="mt-2 text-sm text-gray-600">
            This permanently removes {user?.email || "your account"} and cannot
            be undone. Type DELETE to confirm.
          </Text>
          <TextInput
            className="mt-3 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900"
            value={confirm}
            onChangeText={setConfirm}
            placeholder="DELETE"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="characters"
            autoCorrect={false}
          />
          {error ? (
            <Text className="mt-2 text-sm text-fusion">{error}</Text>
          ) : null}
          <View className="mt-4 flex-row gap-2">
            <Pressable
              className="flex-1 items-center rounded-xl border border-gray-200 py-2.5"
              disabled={busy}
              onPress={onClose}
            >
              <Text className="text-sm font-semibold text-gray-800">Cancel</Text>
            </Pressable>
            <Pressable
              className="flex-1 items-center rounded-xl bg-fusion py-2.5 disabled:opacity-60"
              disabled={busy}
              onPress={() => void onDelete()}
            >
              <Text className="text-sm font-semibold text-white">
                {busy ? "Deleting…" : "Delete"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
