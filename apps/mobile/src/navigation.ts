import type { NavigatorScreenParams } from "@react-navigation/native";

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabsParamList> | undefined;
  Menu: undefined;
  Cart: undefined;
  Checkout: undefined;
  Track: { orderId?: string; focusChat?: boolean };
};

export type TabsParamList = {
  Shop: undefined;
  Orders: undefined;
  Profile: undefined;
  Runner: undefined;
};
