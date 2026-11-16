import { Alert, Linking } from "react-native";
import * as ImagePicker from "expo-image-picker";

export type CapturedPhoto = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
};

/**
 * Prefer the native camera for receipts / delivery proof.
 * Falls back to the photo library if the user declines camera access.
 */
export async function takePhoto(opts?: {
  quality?: number;
  /** Shown in the permission / fallback dialogs */
  purpose?: string;
}): Promise<CapturedPhoto | null> {
  const quality = opts?.quality ?? 0.7;
  const purpose = opts?.purpose ?? "receipts and delivery proof";

  const cam = await ImagePicker.requestCameraPermissionsAsync();
  if (cam.granted) {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality,
      cameraType: ImagePicker.CameraType.back,
      allowsEditing: false,
      exif: false,
    });
    if (result.canceled || !result.assets[0]) return null;
    const asset = result.assets[0];
    return {
      uri: asset.uri,
      mimeType: asset.mimeType,
      fileName: asset.fileName,
    };
  }

  return new Promise((resolve) => {
    Alert.alert(
      "Camera access needed",
      `GraceRun uses the camera for ${purpose}. You can allow camera in Settings, or pick an existing photo.`,
      [
        { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
        {
          text: "Open Settings",
          onPress: () => {
            void Linking.openSettings();
            resolve(null);
          },
        },
        {
          text: "Choose photo",
          onPress: () => {
            void (async () => {
              const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (!lib.granted) {
                resolve(null);
                return;
              }
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images"],
                quality,
              });
              if (result.canceled || !result.assets[0]) {
                resolve(null);
                return;
              }
              const asset = result.assets[0];
              resolve({
                uri: asset.uri,
                mimeType: asset.mimeType,
                fileName: asset.fileName,
              });
            })();
          },
        },
      ],
    );
  });
}

/** Live camera for chat photos. Does not open the photo library. */
export async function captureChatPhoto(): Promise<CapturedPhoto | null> {
  const cam = await ImagePicker.requestCameraPermissionsAsync();
  if (!cam.granted) {
    Alert.alert(
      "Camera permission is required",
      "Allow camera access to take a photo in chat.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Open Settings", onPress: () => void Linking.openSettings() },
      ],
    );
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    quality: 0.7,
    cameraType: ImagePicker.CameraType.back,
    allowsEditing: false,
    exif: false,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    mimeType: asset.mimeType || "image/jpeg",
    fileName: asset.fileName || "chat.jpg",
  };
}

/** Library picker for chat: photos and short videos. */
export async function pickChatMedia(): Promise<CapturedPhoto | null> {
  const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!lib.granted) {
    Alert.alert(
      "Photos access needed",
      "Allow photo library access to send a picture or video in chat.",
    );
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images", "videos"],
    quality: 0.7,
    videoMaxDuration: 30,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  if (asset.fileSize && asset.fileSize > 24 * 1024 * 1024) {
    Alert.alert("File too large", "Choose a photo or a video under 25 MB.");
    return null;
  }
  return {
    uri: asset.uri,
    mimeType: asset.mimeType,
    fileName: asset.fileName,
  };
}

export async function uriToBlob(uri: string): Promise<Blob> {
  // fetch().blob() often yields an empty file for camera URIs on iOS.
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      const blob = xhr.response as Blob;
      if (!blob || blob.size === 0) {
        reject(new Error("The photo file was empty."));
        return;
      }
      resolve(blob);
    };
    xhr.onerror = () => reject(new Error("Could not read the photo from the camera."));
    xhr.responseType = "blob";
    xhr.open("GET", uri, true);
    xhr.send();
  });
}
