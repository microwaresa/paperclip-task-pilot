import type { CapacitorConfig } from "@capacitor/cli";

// The Android app loads the published store; the web code stays the single source.
const config: CapacitorConfig = {
  appId: "app.seen.online",
  appName: "Seen",
  webDir: "mobile-shell",
  server: {
    url: "https://seen-online.lovable.app",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
