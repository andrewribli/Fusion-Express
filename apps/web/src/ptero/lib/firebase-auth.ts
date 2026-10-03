import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/ptero/lib/firebase";
import { collectionName } from "@fusion-express/shared";
import { validateCityUStudentEmail } from "@/ptero/lib/cityu-email";

function authErrorCode(err: unknown): string | undefined {
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = (err as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

function mapAuthError(err: unknown): Error {
  const code = authErrorCode(err);
  switch (code) {
    case "auth/email-already-in-use":
      return new Error("This email is already registered. Sign in instead.");
    case "auth/invalid-email":
      return new Error(
        "Please use your CityU email to sign up. (@cityu.edu.hk or @my.cityu.edu.hk)",
      );
    case "auth/weak-password":
      return new Error("Password must be at least 8 characters");
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return new Error("Incorrect email or password.");
    case "permission-denied":
      return new Error("We couldn't save your account. Please try again.");
    default:
      if (
        err instanceof Error &&
        /missing or insufficient permissions/i.test(err.message)
      ) {
        return new Error("We couldn't save your account. Please try again.");
      }
      if (err instanceof Error) return err;
      return new Error("Authentication failed");
  }
}

export async function firebaseSignUp(opts: {
  email: string;
  password: string;
  fullName: string;
}): Promise<User> {
  const emailErr = validateCityUStudentEmail(opts.email);
  if (emailErr) throw new Error(emailErr);
  try {
    const auth = getFirebaseAuth();
    const cred = await createUserWithEmailAndPassword(
      auth,
      opts.email.trim().toLowerCase(),
      opts.password,
    );
    await cred.user.getIdToken();
    await setDoc(doc(getFirebaseDb(), collectionName("users"), cred.user.uid), {
      uid: cred.user.uid,
      email: opts.email.trim().toLowerCase(),
      fullName: opts.fullName.trim(),
      campus: "cityu",
      role: "customer",
      isGuest: false,
      isRunner: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return cred.user;
  } catch (err) {
    throw mapAuthError(err);
  }
}

export async function firebaseSignIn(
  email: string,
  password: string,
): Promise<User> {
  const emailErr = validateCityUStudentEmail(email);
  if (emailErr) throw new Error(emailErr);
  try {
    const cred = await signInWithEmailAndPassword(
      getFirebaseAuth(),
      email.trim().toLowerCase(),
      password,
    );
    return cred.user;
  } catch (err) {
    throw mapAuthError(err);
  }
}

export async function firebaseSignOutUser(): Promise<void> {
  await firebaseSignOut(getFirebaseAuth());
}
