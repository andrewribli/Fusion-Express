const path = require("path");
const fs = require("fs");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");
const sharedRoot = path.resolve(monorepoRoot, "packages/shared");
const uiRoot = path.resolve(monorepoRoot, "packages/ui");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [projectRoot, monorepoRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

config.resolver.disableHierarchicalLookup = true;

// Firebase JS SDK + Expo SDK 53: package.json "exports" resolution breaks Auth
// ("Component auth has not been registered yet" / Hermes crash on launch).
config.resolver.unstable_enablePackageExports = false;

/**
 * When package exports are disabled, resolve workspace packages (and their
 * subpaths like @fusion-express/shared/auth) to source files manually.
 */
function resolveWorkspacePackage(moduleName) {
  if (moduleName === "@fusion-express/shared") {
    return path.join(sharedRoot, "src/index.ts");
  }
  if (moduleName.startsWith("@fusion-express/shared/")) {
    const sub = moduleName.slice("@fusion-express/shared/".length);
    const candidates = [
      path.join(sharedRoot, "src", `${sub}.ts`),
      path.join(sharedRoot, "src", `${sub}.tsx`),
      path.join(sharedRoot, "src", sub, "index.ts"),
      path.join(sharedRoot, `${sub}.ts`),
      path.join(sharedRoot, sub),
    ];
    for (const file of candidates) {
      if (fs.existsSync(file)) return file;
    }
  }
  if (moduleName === "@fusion-express/ui") {
    return path.join(uiRoot, "src/index.ts");
  }
  if (moduleName.startsWith("@fusion-express/ui/")) {
    const sub = moduleName.slice("@fusion-express/ui/".length);
    const candidates = [
      path.join(uiRoot, "src", `${sub}.ts`),
      path.join(uiRoot, "src", `${sub}.tsx`),
      path.join(uiRoot, "src", sub, "index.ts"),
    ];
    for (const file of candidates) {
      if (fs.existsSync(file)) return file;
    }
  }
  return null;
}

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const workspace = resolveWorkspacePackage(moduleName);
  if (workspace) {
    return { type: "sourceFile", filePath: workspace };
  }
  if (typeof defaultResolveRequest === "function") {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
