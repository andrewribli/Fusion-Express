/**
 * Push EXPO_PUBLIC_* from apps/mobile/.env into EAS production.
 * Values are never printed.
 *
 *   node apps/mobile/scripts/sync-eas-env.mjs
 */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(mobileRoot, ".env");

const REQUIRED = [
  "EXPO_PUBLIC_FIREBASE_API_KEY",
  "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
  "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "EXPO_PUBLIC_FIREBASE_APP_ID",
  "EXPO_PUBLIC_WEB_ORIGIN",
];

function parseEnv(text) {
  const out = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

if (!existsSync(envPath)) {
  console.error("Missing apps/mobile/.env — copy from .env.example first.");
  process.exit(1);
}

const env = parseEnv(readFileSync(envPath, "utf8"));
const missing = REQUIRED.filter((key) => !env[key]);
if (missing.length) {
  console.error(`apps/mobile/.env is missing: ${missing.join(", ")}`);
  process.exit(1);
}

if (!env.EXPO_PUBLIC_WEB_ORIGIN) {
  env.EXPO_PUBLIC_WEB_ORIGIN = "https://www.gracerun.fit";
}

for (const name of REQUIRED) {
  const result = spawnSync(
    "npx",
    [
      "eas-cli",
      "env:set",
      "production",
      "--name",
      name,
      "--value",
      env[name],
      "--visibility",
      name.includes("FIREBASE") ? "sensitive" : "plaintext",
      "--non-interactive",
    ],
    {
      cwd: mobileRoot,
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
      encoding: "utf8",
    },
  );
  if (result.status !== 0) {
    const err = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
    console.error(`Failed to set ${name} (value omitted).`);
    if (err) console.error(err.replaceAll(env[name], "[redacted]"));
    process.exit(result.status ?? 1);
  }
  console.log(`Set ${name} on EAS production`);
}

console.log("EAS production env is ready. Re-run the production build.");
