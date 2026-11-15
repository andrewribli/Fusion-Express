import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import {
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { collectionName } from "@fusion-express/shared/app-env";
import {
  getDb,
  isFirebaseConfigured,
} from "@fusion-express/shared/firebase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function projectId(): string | undefined {
  return (
    Constants.easConfig?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId
  );
}

const PUSH_ASKED_KEY = "gracerun.push.asked";

/**
 * Ask iOS once, then only refresh the Expo token.
 * A second requestPermissionsAsync on every launch re-prompts even after Allow.
 */
export async function registerForPushNotifications(
  uid: string,
): Promise<string | null> {
  if (!uid || !isFirebaseConfigured()) return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("orders", {
      name: "Orders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#ED1C24",
    });
  }

  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status === "granted") {
    await AsyncStorage.setItem(PUSH_ASKED_KEY, "1");
  } else if (status === "undetermined") {
    const alreadyAsked = await AsyncStorage.getItem(PUSH_ASKED_KEY);
    if (alreadyAsked === "1") return null;
    await AsyncStorage.setItem(PUSH_ASKED_KEY, "1");
    const asked = await Notifications.requestPermissionsAsync();
    status = asked.status;
  } else {
    return null;
  }
  if (status !== "granted") return null;

  const easProjectId = projectId();
  if (!easProjectId) {
    console.warn("[push] Missing EAS projectId — cannot fetch Expo push token");
    return null;
  }

  let token: string;
  try {
    const result = await Notifications.getExpoPushTokenAsync({
      projectId: easProjectId,
    });
    token = result.data;
  } catch (err) {
    console.warn("[push] getExpoPushTokenAsync failed", err);
    return null;
  }

  try {
    await setDoc(
      doc(getDb(), collectionName("users"), uid),
      {
        pushToken: token,
        expoPushToken: token,
        expoPushTokens: arrayUnion(token),
        pushPlatform: Platform.OS,
        pushUpdatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (err) {
    console.warn("[push] Could not save token to Firestore", err);
  }

  return token;
}

/**
 * While a runner is signed in, watch for new pending orders and buzz locally.
 * Never buzz for the runner's own customer order (same uid placed it).
 */
export function subscribeRunnerOrderAlerts(
  enabled: boolean,
  currentUid?: string | null,
): () => void {
  if (!enabled || !isFirebaseConfigured() || !currentUid) {
    return () => undefined;
  }

  const known = new Set<string>();
  let primed = false;

  const q = query(
    collection(getDb(), collectionName("orders")),
    where("status", "==", "pending"),
  );

  const unsub = onSnapshot(
    q,
    (snap) => {
      if (!primed) {
        snap.docs.forEach((d) => known.add(d.id));
        primed = true;
        return;
      }
      for (const change of snap.docChanges()) {
        if (change.type !== "added") continue;
        const id = change.doc.id;
        if (known.has(id)) continue;
        known.add(id);
        const data = change.doc.data() as {
          hall?: string;
          total?: number;
          customerName?: string;
          customerId?: string;
        };
        if (data.customerId && data.customerId === currentUid) continue;
        void Notifications.scheduleNotificationAsync({
          content: {
            title: "New GraceRun order",
            body: `${data.hall ?? "Hall"} · $${data.total ?? "?"} — tap Runner to accept`,
            sound: true,
            data: { orderId: id, type: "pending_order" },
          },
          trigger: null,
        });
      }
    },
    (err) => {
      console.warn("[push] pending-order listener failed", err);
    },
  );

  return unsub;
}
