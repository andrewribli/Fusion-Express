import fs from "fs";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const app = JSON.parse(fs.readFileSync("app.json", "utf8")).expo;
assert(app.icon === "./assets/icon.png", "icon path");
assert(app.splash.image === "./assets/splash.png", "splash path");
assert(app.splash.backgroundColor === "#ED1C24", "splash bg");
assert(fs.existsSync("assets/icon.png"), "icon file");
assert(fs.existsSync("assets/splash.png"), "splash file");
assert(
  app.plugins.some((p) =>
    Array.isArray(p) ? p[0] === "expo-notifications" : p === "expo-notifications",
  ),
  "notifications plugin",
);
assert(
  app.plugins.some(
    (p) => Array.isArray(p) && p[0] === "expo-image-picker" && p[1].cameraPermission,
  ),
  "camera permission",
);
assert(
  app.ios.infoPlist.NSCameraUsageDescription.toLowerCase().includes("camera"),
  "ios camera plist",
);
assert(
  app.ios.infoPlist.UIBackgroundModes.includes("remote-notification"),
  "bg modes",
);

const take = fs.readFileSync("src/takePhoto.ts", "utf8");
assert(take.includes("launchCameraAsync"), "uses camera");
assert(take.includes("CameraType.back"), "back camera");

const notif = fs.readFileSync("src/notifications.ts", "utf8");
assert(notif.includes("getExpoPushTokenAsync"), "expo token");
assert(notif.includes("expoPushToken"), "saves token field");
assert(notif.includes('where("status", "==", "pending")'), "pending query");

const runner = fs.readFileSync("app/(tabs)/runner.tsx", "utf8");
assert(runner.includes("takePhoto"), "runner uses takePhoto");
assert(runner.includes("uploadReceiptPhoto"), "receipt upload");
assert(runner.includes("uploadDeliveryPhoto"), "delivery upload");

const appTsx = fs.readFileSync("App.tsx", "utf8");
assert(appTsx.includes("NotificationBootstrap"), "bootstrap wired");

console.log("STATIC_SMOKE_OK");
