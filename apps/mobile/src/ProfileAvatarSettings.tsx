import { useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import {
  AVATARS,
  type AvatarId,
} from "@fusion-express/shared/avatars";
import { collectionName } from "@fusion-express/shared/app-env";
import { getDb, isFirebaseConfigured } from "@fusion-express/shared/firebase";
import { AvatarBadge } from "./AvatarBadge";
import type { MobileUserProfile } from "./auth";

export function ProfileAvatarSettings({
  profile,
  onUpdated,
}: {
  profile: MobileUserProfile;
  onUpdated: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const avatarId = profile.avatarId;
  const showReal = profile.showRealPhotoToRunners === true;

  async function patch(partial: Partial<MobileUserProfile>) {
    if (!isFirebaseConfigured()) {
      setError("Firebase is not configured on this build.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await setDoc(
        doc(getDb(), collectionName("users"), profile.uid),
        { ...partial, updatedAt: serverTimestamp() },
        { merge: true },
      );
      await onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View>
      <View className="flex-row items-center gap-3">
        <AvatarBadge
          avatarId={avatarId}
          photoURL={profile.photoURL}
          audience="self"
          seed={profile.uid}
          size="lg"
        />
        <View className="flex-1">
          <Text className="text-sm font-semibold text-gray-900">
            Avatar & photo
          </Text>
          <Text className="mt-0.5 text-xs text-gray-500">
            Pick a cute food avatar. Upload a real photo on the website if you
            want one — mobile keeps the opt-in toggle here.
          </Text>
        </View>
      </View>

      <Text className="mt-4 text-xs font-medium text-gray-600">Cute avatar</Text>
      <View className="mt-2 flex-row flex-wrap gap-2">
        {AVATARS.map((avatar) => {
          const selected = avatarId === avatar.id;
          return (
            <Pressable
              key={avatar.id}
              disabled={busy}
              onPress={() => void patch({ avatarId: avatar.id as AvatarId })}
              className={`w-[22%] items-center rounded-xl border px-1 py-2 ${
                selected ? "border-fusion bg-red-50" : "border-gray-200 bg-white"
              }`}
            >
              <View
                className="h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: avatar.bg }}
              >
                <Text className="text-xl">{avatar.emoji}</Text>
              </View>
              <Text className="mt-1 text-center text-[10px] font-medium text-gray-600">
                {avatar.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="mt-4 flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-sm font-medium text-gray-800">
            Show my real photo to runners
          </Text>
          <Text className="mt-0.5 text-xs text-gray-500">
            Off by default. When off, runners see your cute avatar.
            {!profile.photoURL
              ? " Add a photo on the website first."
              : null}
          </Text>
        </View>
        <Switch
          value={showReal}
          disabled={busy || !profile.photoURL}
          onValueChange={(next) =>
            void patch({ showRealPhotoToRunners: next })
          }
        />
      </View>

      {error ? <Text className="mt-2 text-sm text-red-700">{error}</Text> : null}
    </View>
  );
}
