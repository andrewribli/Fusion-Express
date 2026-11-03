import "./src/global-error-handler";

try {
  // Native module may be missing in a stale binary; never abort launch.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("react-native-gesture-handler");
} catch (err) {
  console.warn("[index] gesture-handler", err);
}

import { initMobileFirebaseAuth } from "./src/firebase-init";
import { registerRootComponent } from "expo";
import { createElement } from "react";
import FallbackApp from "./FallbackApp";

try {
  initMobileFirebaseAuth();
} catch (err) {
  console.warn("[index] firebase init", err);
}

try {
  // Require after Auth init so firebase/auth is not evaluated first.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const App = require("./App").default as Parameters<
    typeof registerRootComponent
  >[0];
  registerRootComponent(App);
} catch (err) {
  console.error("[index] App import failed", err);
  function StartupFallback() {
    return createElement(FallbackApp, { error: err });
  }
  registerRootComponent(StartupFallback);
}
