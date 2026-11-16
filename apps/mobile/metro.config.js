const fs = require("fs");
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [projectRoot, monorepoRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

config.resolver.disableHierarchicalLookup = false;

const firebaseAuthRn = path.resolve(
  monorepoRoot,
  "node_modules/firebase/node_modules/@firebase/auth",
);

config.resolver.extraNodeModules = {
  "@firebase/auth": firebaseAuthRn,
  "@fusion-express/shared": path.resolve(monorepoRoot, "packages/shared"),
  "@fusion-express/ui": path.resolve(monorepoRoot, "packages/ui"),
  react: path.resolve(monorepoRoot, "node_modules/react"),
  "react-dom": path.resolve(monorepoRoot, "node_modules/react-dom"),
  "react-native-reanimated": path.resolve(
    monorepoRoot,
    "node_modules/react-native-reanimated",
  ),
  "react-native-css-interop": path.resolve(
    monorepoRoot,
    "node_modules/react-native-css-interop",
  ),
  "react-is": fs.existsSync(path.resolve(projectRoot, "node_modules/react-is"))
    ? path.resolve(projectRoot, "node_modules/react-is")
    : path.resolve(monorepoRoot, "node_modules/react-is"),
  scheduler: fs.existsSync(path.resolve(projectRoot, "node_modules/scheduler"))
    ? path.resolve(projectRoot, "node_modules/scheduler")
    : path.resolve(monorepoRoot, "node_modules/scheduler"),
};

// Allow mobile to import web canteen menu TS (type-only `@/data/canteen/*` paths).
const canteenDataRoot = path.resolve(
  monorepoRoot,
  "apps/web/src/data/canteen",
);
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    typeof moduleName === "string" &&
    moduleName.startsWith("@/data/canteen/")
  ) {
    const rel = moduleName.slice("@/data/canteen/".length);
    const filePath = path.resolve(canteenDataRoot, rel);
    return context.resolveRequest(context, filePath, platform);
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
