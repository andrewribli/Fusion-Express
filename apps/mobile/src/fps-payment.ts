import {
  addDoc,
  collection,
  doc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { collectionName, storagePath } from "@fusion-express/shared/app-env";
import {
  getDb,
  getFirebaseStorage,
  isFirebaseConfigured,
} from "@fusion-express/shared/firebase";

export const FPS_ID = "95181085";

export async function submitFpsScreenshot(opts: {
  uid: string;
  orderId: string;
  file: Blob;
  fileName: string;
}): Promise<string> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured on this build.");
  }
  const storageRef = ref(
    getFirebaseStorage(),
    storagePath(
      `payment-submissions/${opts.uid}/${opts.orderId}/${Date.now()}-${opts.fileName}`,
    ),
  );
  await uploadBytes(storageRef, opts.file, { contentType: "image/jpeg" });
  const screenshotUrl = await getDownloadURL(storageRef);

  await addDoc(collection(getDb(), collectionName("paymentSubmissions")), {
    orderId: opts.orderId,
    userId: opts.uid,
    screenshotUrl,
    note: `FPS ${FPS_ID}`,
    status: "pending",
    submittedAt: Timestamp.fromDate(new Date()),
  });

  await updateDoc(doc(getDb(), collectionName("orders"), opts.orderId), {
    fpsReceiptUrl: screenshotUrl,
    updatedAt: Timestamp.fromDate(new Date()),
  });

  return screenshotUrl;
}
