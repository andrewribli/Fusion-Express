import { Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as WebBrowser from "expo-web-browser";
import { webAssetOrigin } from "@fusion-express/shared/products";
import { RequireAdmin } from "../src/RequireAdmin";
import type { RootStackParamList } from "../src/navigation";
import {
  Card,
  Page,
  PrimaryButton,
  ScreenHeader,
  SecondaryButton,
  SectionLabel,
} from "../src/ui";

async function openWebAdmin(path: string) {
  const origin = webAssetOrigin().replace(/\/$/, "");
  await WebBrowser.openBrowserAsync(`${origin}${path}`, {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
  });
}

export default function AdminScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <RequireAdmin title="Admin">
      <Page>
        <ScreenHeader title="Admin" onBack={() => navigation.goBack()} />
        <View className="px-4 py-4">
          <Card>
            <SectionLabel>In-app</SectionLabel>
            <Text className="mt-2 text-sm text-gray-600">
              Reply to customer support chats without leaving GraceRun.
            </Text>
            <PrimaryButton
              label="Support inbox"
              className="mt-3"
              onPress={() => navigation.navigate("AdminSupport")}
            />
          </Card>

          <Card className="mt-3">
            <SectionLabel>Web admin (sign in on site)</SectionLabel>
            <Text className="mt-2 text-xs text-gray-500">
              Payouts, users, and payments stay on the website for now. Opens
              in-app browser — use the same admin account.
            </Text>
            <SecondaryButton
              label="Verify & pay runners"
              className="mt-3"
              onPress={() => void openWebAdmin("/admin/payouts")}
            />
            <SecondaryButton
              label="Users"
              className="mt-2"
              onPress={() => void openWebAdmin("/admin/users")}
            />
            <SecondaryButton
              label="Payment submissions"
              className="mt-2"
              onPress={() => void openWebAdmin("/admin/payments")}
            />
            <SecondaryButton
              label="Order chats"
              className="mt-2"
              onPress={() => void openWebAdmin("/admin/chats")}
            />
          </Card>
        </View>
      </Page>
    </RequireAdmin>
  );
}
