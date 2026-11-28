import { useEffect, useState } from "react";
import { Switch, Text, TextInput, View } from "react-native";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { normalizePhone, validatePhone } from "@fusion-express/shared/auth";
import { collectionName } from "@fusion-express/shared/app-env";
import { getDb, isFirebaseConfigured } from "@fusion-express/shared/firebase";
import type { MobileUserProfile } from "./auth";
import { PrimaryButton } from "./ui";

/** Privacy opt-in for Call / WhatsApp with the assigned runner. */
export function ProfilePhoneShare({
  profile,
  onUpdated,
}: {
  profile: MobileUserProfile;
  onUpdated: () => Promise<void> | void;
}) {
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [share, setShare] = useState(profile.sharePhoneWithRunner === true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPhone(profile.phone ?? "");
    setShare(profile.sharePhoneWithRunner === true);
  }, [profile.phone, profile.sharePhoneWithRunner]);

  async function save() {
    if (!isFirebaseConfigured()) {
      setError("Firebase is not configured on this build.");
      return;
    }
    setError("");
    setSaved(false);
    const trimmed = phone.trim();
    if (share) {
      const phoneErr = validatePhone(trimmed);
      if (phoneErr) {
        setError(phoneErr);
        return;
      }
    }
    setBusy(true);
    try {
      const digits = trimmed ? normalizePhone(trimmed) : "";
      await setDoc(
        doc(getDb(), collectionName("users"), profile.uid),
        {
          phone: digits || null,
          sharePhoneWithRunner: share && Boolean(digits),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      setShare(share && Boolean(digits));
      setSaved(true);
      await onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="mt-4">
      <Text className="text-sm font-semibold text-gray-900">
        Runner Call / WhatsApp
      </Text>
      <Text className="mt-0.5 text-xs text-gray-500">
        Off by default. When on, your number is shared only with the assigned
        runner on new orders.
      </Text>
      <View className="mt-3 flex-row items-start justify-between gap-3">
        <Text className="flex-1 text-sm font-medium text-gray-800">
          Share my phone with my runner
        </Text>
        <Switch
          value={share}
          disabled={busy}
          onValueChange={(next) => {
            setShare(next);
            setSaved(false);
          }}
        />
      </View>
      <TextInput
        className="mt-3 rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900"
        value={phone}
        onChangeText={(v) => {
          setPhone(v);
          setSaved(false);
        }}
        placeholder="Mobile number"
        keyboardType="phone-pad"
        editable={!busy}
      />
      {error ? <Text className="mt-2 text-sm text-red-700">{error}</Text> : null}
      {saved ? (
        <Text className="mt-2 text-sm text-emerald-700">
          Saved for future orders.
        </Text>
      ) : null}
      <PrimaryButton
        label={busy ? "Saving…" : "Save contact preference"}
        className="mt-3"
        busy={busy}
        onPress={() => void save()}
      />
    </View>
  );
}
