import {
  createNavigationContainerRef,
  getStateFromPath as defaultGetStateFromPath,
  type LinkingOptions,
} from "@react-navigation/native";
import * as Linking from "expo-linking";
import type { RootStackParamList } from "./navigation";

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL("/"), "fusionexpress://"],
  config: {
    screens: {
      Tabs: {
        screens: {
          Shop: "shop",
          Orders: "orders",
          Profile: "profile",
          Runner: "runner",
        },
      },
      Menu: "menu",
      CanteenMenu: "canteen/:restaurantId",
      Cart: "cart",
      Checkout: "checkout",
      Track: "track/:orderId",
    },
  },
  getStateFromPath(path, options) {
    const chat = path.match(/^\/?chat\/([^/?#]+)/);
    if (chat?.[1]) {
      return {
        routes: [
          { name: "Tabs" },
          {
            name: "Track",
            params: {
              orderId: decodeURIComponent(chat[1]),
              focusChat: true,
            },
          },
        ],
      };
    }
    return defaultGetStateFromPath(path, options);
  },
};

export function openFromPushData(data: {
  type?: string;
  orderId?: string;
}): void {
  const orderId = data.orderId?.trim() ?? "";
  const type = data.type ?? "";
  const go = () => {
    if (!navigationRef.isReady()) return false;
    if (type === "pending_order" || type === "order_created") {
      navigationRef.navigate("Tabs", { screen: "Runner" });
      return true;
    }
    if (!orderId) return true;
    navigationRef.navigate("Track", {
      orderId,
      focusChat: type === "chat",
    });
    return true;
  };
  if (go()) return;
  setTimeout(go, 500);
}
