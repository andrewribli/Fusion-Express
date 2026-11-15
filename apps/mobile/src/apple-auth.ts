import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { collectionName } from "@fusion-express/shared/app-env";
import {
  getAuthClient,
  getDb,
  isFirebaseConfigured,
} from "@fusion-express/shared/firebase";

function authMod() {
  const injected = (globalThis as { __fusionAuthModule?: typeof import("firebase/auth") })
    .__fusionAuthModule;
  if (injected) return injected;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("firebase/auth") as typeof import("firebase/auth");
}

export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Sign in with Apple → Firebase Auth credential.
 * Requires Apple provider enabled in Firebase Console + a native build with
 * the expo-apple-authentication plugin / usesAppleSignIn.
 */
export async function signInWithApple(): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured on this build.");
  }
  if (Platform.OS !== "ios") {
    throw new Error("Sign in with Apple is only available on iOS.");
  }

  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) {
    throw new Error(
      "Sign in with Apple needs a Dev Client rebuild with Apple Sign In enabled.",
    );
  }

  const rawNonce = Crypto.randomUUID().replace(/-/g, "");
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );

  let apple: AppleAuthentication.AppleAuthenticationCredential;
  try {
    apple = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: string }).code)
        : "";
    if (code === "ERR_REQUEST_CANCELED") {
      throw new Error("Sign in cancelled");
    }
    throw err instanceof Error ? err : new Error("Apple Sign In failed");
  }

  if (!apple.identityToken) {
    throw new Error("Apple did not return an identity token.");
  }

  const provider = new (authMod().OAuthProvider)("apple.com");
  const credential = provider.credential({
    idToken: apple.identityToken,
    rawNonce,
  });
  const result = await authMod().signInWithCredential(
    getAuthClient(),
    credential,
  );
  const user = result.user;

  const fullName = [apple.fullName?.givenName, apple.fullName?.familyName]
    .filter(Boolean)
    .join(" ")
    .trim();

  const ref = doc(getDb(), collectionName("users"), user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      email: user.email ?? undefined,
      fullName: fullName || "Apple user",
      campus: "cuhk",
      role: "customer",
      isRunner: false,
      isGuest: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      authProvider: "apple",
    });
  } else if (fullName) {
    const data = snap.data() as { fullName?: string };
    if (!data.fullName || data.fullName === "Apple user") {
      await setDoc(
        ref,
        { fullName, updatedAt: serverTimestamp() },
        { merge: true },
      );
    }
  }
}
