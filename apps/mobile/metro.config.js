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

config.resolver.extraNodeModules = {
  "@fusion-express/shared": path.resolve(monorepoRoot, "packages/shared"),
  "@fusion-express/ui": path.resolve(monorepoRoot, "packages/ui"),
  "react-is": fs.existsSync(path.resolve(projectRoot, "node_modules/react-is"))
    ? path.resolve(projectRoot, "node_modules/react-is")
    : path.resolve(monorepoRoot, "node_modules/react-is"),
  scheduler: fs.existsSync(path.resolve(projectRoot, "node_modules/scheduler"))
    ? path.resolve(projectRoot, "node_modules/scheduler")
    : path.resolve(monorepoRoot, "node_modules/scheduler"),
};

module.exports = withNativeWind(config, { input: "./global.css" });
