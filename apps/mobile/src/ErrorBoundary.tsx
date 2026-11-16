import { Component, type ErrorInfo, type ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Keeps a fatal JS error on screen instead of a silent TestFlight kill. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const message = this.state.error.message || String(this.state.error);
    const stack = (this.state.error.stack ?? "").slice(0, 1200);
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#111",
          padding: 24,
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>
          GraceRun hit an error
        </Text>
        <Text style={{ color: "#f88", marginTop: 12, fontSize: 13 }}>
          {message}
        </Text>
        {stack ? (
          <ScrollView style={{ marginTop: 16, maxHeight: 280 }}>
            <Text style={{ color: "#aaa", fontSize: 11 }}>{stack}</Text>
          </ScrollView>
        ) : null}
      </View>
    );
  }
}
