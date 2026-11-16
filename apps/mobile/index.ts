import "react-native-gesture-handler";
import "react-native-reanimated";
import "./src/global-error-handler";

if (__DEV__) {
  // Dev client only — production store builds do not need this.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("expo-dev-client");
}

// Side-effect: initializeAuth + AsyncStorage before App imports getAuth().
import "./src/firebase-init";
import { registerRootComponent } from "expo";
import App from "./App";

registerRootComponent(App);
