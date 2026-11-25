import { useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { useAuth } from "./auth";
import { openFromPushData } from "./linking";
import {
  registerForPushNotifications,
  subscribeRunnerOrderAlerts,
} from "./notifications";

/** Registers push on launch (when signed in) and buzzes runners on new pending orders. */
export function NotificationBootstrap() {
  const { user, profile, loading } = useAuth();
  const lastUid = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user?.uid) {
      lastUid.current = null;
      return;
    }
    if (lastUid.current === user.uid) return;
    lastUid.current = user.uid;
    void registerForPushNotifications(user.uid);
  }, [user?.uid, loading]);

  useEffect(() => {
    const isRunner = Boolean(user && profile?.isRunner);
    return subscribeRunnerOrderAlerts(isRunner, user?.uid);
  }, [user, user?.uid, profile?.isRunner]);

  useEffect(() => {
    let alive = true;
    async function handle(response: Notifications.NotificationResponse | null) {
      if (!response || !alive) return;
      const id = response.notification.request.identifier;
      const seen = await AsyncStorage.getItem("gracerun.push.handled");
      if (seen === id) return;
      await AsyncStorage.setItem("gracerun.push.handled", id);
      const data = response.notification.request.content.data as {
        type?: string;
        orderId?: string;
        userId?: string;
      };
      openFromPushData(data);
    }
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      void handle(response);
    });
    void Notifications.getLastNotificationResponseAsync().then((response) =>
      handle(response),
    );
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  return null;
}
