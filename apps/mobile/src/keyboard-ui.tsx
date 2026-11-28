import { useEffect, useState, type ReactNode } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Custom ScreenHeader is a sibling above this KAV (not a nav header inside it),
 * and the app shell only applies the top safe-area edge — so iOS offset is 0.
 * Android relies on `softwareKeyboardLayoutMode: "resize"` in app.json.
 */
export const CHAT_KEYBOARD_OFFSET = 0;

type ScreenKeyboardAvoidProps = {
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  /** Extra iOS offset when a fixed chrome sits above the avoiding view. */
  offset?: number;
};

/** Single keyboard avoider for chat + form screens. Do not nest. */
export function ScreenKeyboardAvoid({
  children,
  className,
  style,
  offset = CHAT_KEYBOARD_OFFSET,
}: ScreenKeyboardAvoidProps) {
  return (
    <KeyboardAvoidingView
      className={className}
      style={[{ flex: 1 }, style]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? offset : 0}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

type ComposerDockProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Pins the chat composer above the home indicator when the keyboard is closed,
 * and sits flush on the keyboard when open (no double-lift / floating gap).
 */
export function ComposerDock({ children, className = "" }: ComposerDockProps) {
  const insets = useSafeAreaInsets();
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const showEvt =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvt, () => setKeyboardOpen(true));
    const hide = Keyboard.addListener(hideEvt, () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return (
    <View
      className={className}
      style={{
        paddingBottom: keyboardOpen ? 0 : Math.max(insets.bottom, 0),
      }}
    >
      {children}
    </View>
  );
}
