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
      CanteenCheckout: "canteen-checkout",
      Track: "track/:orderId",
      OrderChat: "chat/:orderId",
      Support: "support",
      Admin: "admin/tools",
      AdminSupport: "admin",
      AdminSupportThread: "admin/support/:userId",
    },
  },
  getStateFromPath(path, options) {
    const chat = path.match(/^\/?chat\/([^/?#]+)/);
    if (chat?.[1]) {
      return {
        routes: [
          { name: "Tabs" },
          {
            name: "OrderChat",
            params: {
              orderId: decodeURIComponent(chat[1]),
            },
          },
        ],
      };
    }
    // Legacy `admin/support` deep link → inbox (same as `admin`).
    const adminSupport = path.match(/^\/?admin\/support\/?$/);
    if (adminSupport) {
      return {
        routes: [{ name: "Tabs" }, { name: "AdminSupport" }],
      };
    }
    return defaultGetStateFromPath(path, options);
  },
};

export function openFromPushData(data: {
  type?: string;
  orderId?: string;
  userId?: string;
}): void {
  const orderId = data.orderId?.trim() ?? "";
  const userId = data.userId?.trim() ?? "";
  const type = data.type ?? "";
  const go = () => {
    if (!navigationRef.isReady()) return false;
    if (type === "pending_order" || type === "order_created") {
      navigationRef.navigate("Tabs", { screen: "Runner" });
      return true;
    }
    if (type === "support_admin" || type === "support") {
      if (userId) {
        navigationRef.navigate("AdminSupportThread", { userId });
      } else {
        navigationRef.navigate("AdminSupport");
      }
      return true;
    }
    if (type === "support_customer") {
      navigationRef.navigate("Support");
      return true;
    }
    if (!orderId) return true;
    if (type === "chat") {
      navigationRef.navigate("OrderChat", { orderId });
      return true;
    }
    navigationRef.navigate("Track", { orderId });
    return true;
  };
  if (go()) return;
  setTimeout(go, 500);
}
