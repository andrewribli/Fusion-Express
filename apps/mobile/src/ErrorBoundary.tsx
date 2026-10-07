import { Component, type ErrorInfo, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catch render/startup JS errors so TestFlight shows a recoverable screen
 * instead of an immediate native crash to the home screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("GraceRun ErrorBoundary", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-xl font-bold text-fusion">Something went wrong</Text>
        <Text className="mt-3 text-center text-sm text-gray-600">
          {this.state.error.message || "Unexpected error on launch."}
        </Text>
        <Pressable
          className="mt-6 rounded-2xl bg-fusion px-6 py-3"
          onPress={() => this.setState({ error: null })}
        >
          <Text className="font-semibold text-white">Try again</Text>
        </Pressable>
      </View>
    );
  }
}
