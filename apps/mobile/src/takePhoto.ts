import { Alert, Linking } from "react-native";
import * as ImagePicker from "expo-image-picker";

export type CapturedPhoto = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
};

async function openCamera(quality: number): Promise<CapturedPhoto | null> {
  const cam = await ImagePicker.requestCameraPermissionsAsync();
  if (!cam.granted) {
    Alert.alert(
      "Camera access needed",
      "Allow camera access in Settings, or choose a photo from your library instead.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Open Settings", onPress: () => void Linking.openSettings() },
      ],
    );
    return null;
  }
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

async function openLibrary(quality: number): Promise<CapturedPhoto | null> {
  const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!lib.granted) {
    Alert.alert(
      "Photos access needed",
      "Allow photo library access in Settings to pick an existing image.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Open Settings", onPress: () => void Linking.openSettings() },
      ],
    );
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    mimeType: asset.mimeType,
    fileName: asset.fileName,
  };
}

/**
 * Offer Camera or Photo Library for receipts / lobby / FPS proof.
 * Library is a first-class option — not only a camera-denied fallback.
 */
export async function takePhoto(opts?: {
  quality?: number;
  /** Shown in the permission / chooser dialogs */
  purpose?: string;
}): Promise<CapturedPhoto | null> {
  const quality = opts?.quality ?? 0.7;
  const purpose = opts?.purpose ?? "receipts and delivery proof";

  return new Promise((resolve) => {
    Alert.alert(
      "Add photo",
      `Choose how to add a photo for ${purpose}.`,
      [
        { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
        {
          text: "Photo library",
          onPress: () => {
            void openLibrary(quality).then(resolve);
          },
        },
        {
          text: "Take photo",
          onPress: () => {
            void openCamera(quality).then(resolve);
          },
        },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}

/** Chat photo: camera or library (image only). */
export async function captureChatPhoto(): Promise<CapturedPhoto | null> {
  return new Promise((resolve) => {
    Alert.alert(
      "Send a photo",
      "Take a new photo or pick one from your library.",
      [
        { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
        {
          text: "Photo library",
          onPress: () => {
            void openLibrary(0.7).then((photo) => {
              if (photo && !photo.fileName) {
                resolve({ ...photo, fileName: "chat.jpg", mimeType: photo.mimeType || "image/jpeg" });
                return;
              }
              resolve(
                photo
                  ? {
                      ...photo,
                      mimeType: photo.mimeType || "image/jpeg",
                      fileName: photo.fileName || "chat.jpg",
                    }
                  : null,
              );
            });
          },
        },
        {
          text: "Take photo",
          onPress: () => {
            void openCamera(0.7).then((photo) => {
              resolve(
                photo
                  ? {
                      ...photo,
                      mimeType: photo.mimeType || "image/jpeg",
                      fileName: photo.fileName || "chat.jpg",
                    }
                  : null,
              );
            });
          },
        },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
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
