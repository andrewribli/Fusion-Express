import type { ReactNode } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type PressableProps,
  type ViewProps,
} from "react-native";
import { colors } from "@fusion-express/ui";

export { colors };

/** Page shell matching www.gracerun.fit light grey canvas. */
export function Page({
  children,
  className = "",
  ...rest
}: ViewProps & { className?: string }) {
  return (
    <View className={`flex-1 bg-[#F5F5F5] ${className}`} {...rest}>
      {children}
    </View>
  );
}

export function ScreenHeader({
  title,
  right,
  onBack,
}: {
  title: string;
  right?: ReactNode;
  onBack?: () => void;
}) {
  return (
    <View className="flex-row items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
      <View className="min-w-0 flex-1 flex-row items-center">
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Back"
            className="mr-2"
          >
            <Ionicons name="chevron-back" size={26} color="#ED1C24" />
          </Pressable>
        ) : null}
        <Text className="text-xl font-extrabold text-gray-900" numberOfLines={1}>
          {title}
        </Text>
      </View>
      {right ?? null}
    </View>
  );
}

export function Card({
  children,
  className = "",
  ...rest
}: ViewProps & { className?: string }) {
  return (
    <View
      className={`rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ${className}`}
      {...rest}
    >
      {children}
    </View>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Text className="text-sm font-semibold text-gray-500">{children}</Text>
  );
}

export function PrimaryButton({
  label,
  busy,
  className = "",
  ...rest
}: PressableProps & { label: string; busy?: boolean; className?: string }) {
  return (
    <Pressable
      className={`items-center rounded-xl bg-fusion py-3 disabled:opacity-60 ${className}`}
      disabled={busy || rest.disabled}
      {...rest}
    >
      <Text className="text-center text-sm font-semibold text-white">
        {label}
      </Text>
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  className = "",
  ...rest
}: PressableProps & { label: string; className?: string }) {
  return (
    <Pressable
      className={`items-center rounded-xl border border-gray-200 bg-white py-3 ${className}`}
      {...rest}
    >
      <Text className="text-center text-sm font-semibold text-gray-800">
        {label}
      </Text>
    </Pressable>
  );
}

export function OutlineDangerButton({
  label,
  className = "",
  ...rest
}: PressableProps & { label: string; className?: string }) {
  return (
    <Pressable
      className={`items-center rounded-xl border border-fusion bg-white py-3 ${className}`}
      {...rest}
    >
      <Text className="text-center text-sm font-semibold text-fusion">
        {label}
      </Text>
    </Pressable>
  );
}

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View className="items-center px-6 py-12">
      <Text className="text-center text-base font-bold text-gray-900">
        {title}
      </Text>
      {body ? (
        <Text className="mt-2 text-center text-sm text-gray-500">{body}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <PrimaryButton
          label={actionLabel}
          className="mt-5 w-full max-w-xs"
          onPress={onAction}
        />
      ) : null}
    </View>
  );
}

export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <View className="items-center justify-center py-16">
      <ActivityIndicator color={colors.fusionRed} />
      <Text className="mt-3 text-sm text-gray-500">{label}</Text>
    </View>
  );
}
