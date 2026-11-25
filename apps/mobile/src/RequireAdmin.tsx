import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "./auth";
import type { RootStackParamList } from "./navigation";
import {
  Card,
  LoadingBlock,
  Page,
  PrimaryButton,
  ScreenHeader,
} from "./ui";

/** Gates admin screens on AuthProvider's `/admins/{uid}` check. */
export function RequireAdmin({
  children,
  title = "Admin",
}: {
  children: ReactNode;
  title?: string;
}) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <Page>
        <ScreenHeader title={title} onBack={() => navigation.goBack()} />
        <LoadingBlock label="Checking admin access…" />
      </Page>
    );
  }

  if (!user) {
    return (
      <Page>
        <ScreenHeader title={title} onBack={() => navigation.goBack()} />
        <View className="px-4 py-6">
          <Card>
            <Text className="text-base font-bold text-gray-900">
              Sign in required
            </Text>
            <Text className="mt-2 text-sm text-gray-600">
              Sign in with an admin account to continue.
            </Text>
            <PrimaryButton
              label="Go to Profile"
              className="mt-3"
              onPress={() => navigation.navigate("Tabs", { screen: "Profile" })}
            />
          </Card>
        </View>
      </Page>
    );
  }

  if (!isAdmin) {
    return (
      <Page>
        <ScreenHeader title={title} onBack={() => navigation.goBack()} />
        <View className="px-4 py-6">
          <Card>
            <Text className="text-base font-bold text-gray-900">
              Admin access only
            </Text>
            <Text className="mt-2 text-sm text-gray-600">
              This area is limited to GraceRun admins. If you need access, ask
              for your account to be added in Firestore /admins.
            </Text>
            <PrimaryButton
              label="Back"
              className="mt-3"
              onPress={() => navigation.goBack()}
            />
          </Card>
        </View>
      </Page>
    );
  }

  return <>{children}</>;
}
