import { Image, Text, View } from "react-native";
import {
  getAvatar,
  resolveDisplayAvatar,
  type AvatarAudience,
} from "@fusion-express/shared/avatars";

const SIZES = { sm: 36, md: 48, lg: 80 } as const;

export function AvatarBadge({
  avatarId,
  photoURL,
  showRealPhotoToRunners,
  audience = "self",
  seed,
  size = "md",
}: {
  avatarId?: string | null;
  photoURL?: string | null;
  showRealPhotoToRunners?: boolean | null;
  audience?: AvatarAudience;
  seed?: string | null;
  size?: keyof typeof SIZES;
}) {
  const dim = SIZES[size];
  const resolved = resolveDisplayAvatar(
    { avatarId, photoURL, photoUrl: photoURL, showRealPhotoToRunners },
    audience,
    seed,
  );

  if (resolved.kind === "photo") {
    return (
      <Image
        source={{ uri: resolved.url }}
        style={{ width: dim, height: dim, borderRadius: dim / 2 }}
      />
    );
  }

  const avatar = resolved.avatar;
  return (
    <View
      style={{
        width: dim,
        height: dim,
        borderRadius: dim / 2,
        backgroundColor: avatar.bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: dim * 0.45 }}>{avatar.emoji}</Text>
    </View>
  );
}

export function StampedAvatar({
  avatarId,
  photoURL,
  size = "md",
}: {
  avatarId?: string | null;
  photoURL?: string | null;
  size?: keyof typeof SIZES;
}) {
  const dim = SIZES[size];
  const photo = photoURL?.trim();
  if (photo) {
    return (
      <Image
        source={{ uri: photo }}
        style={{ width: dim, height: dim, borderRadius: dim / 2 }}
      />
    );
  }
  const avatar = getAvatar(avatarId);
  return (
    <View
      style={{
        width: dim,
        height: dim,
        borderRadius: dim / 2,
        backgroundColor: avatar.bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: dim * 0.45 }}>{avatar.emoji}</Text>
    </View>
  );
}
