import type { NavigatorScreenParams } from "@react-navigation/native";

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabsParamList> | undefined;
  Menu: undefined;
  CanteenMenu: { restaurantId: string };
  Cart: undefined;
  Checkout: undefined;
  CanteenCheckout: undefined;
  Track: { orderId?: string; focusChat?: boolean };
  Support: undefined;
  Admin: undefined;
  AdminSupport: undefined;
  AdminSupportThread: { userId: string; title?: string };
};

export type TabsParamList = {
  Shop: undefined;
  Orders: undefined;
  Profile: undefined;
  Runner: undefined;
};
