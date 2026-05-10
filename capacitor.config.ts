import type { CapacitorConfig } from "@capacitor/cli";

// Capacitor wraps the published Lovable web app inside a native Android shell.
// After you publish the app on Lovable, replace the `server.url` below
// with your real published URL (e.g. https://your-app.lovable.app).
const config: CapacitorConfig = {
  appId: "app.lovable.salestracker",
  appName: "Sales Tracker",
  webDir: "dist",
  server: {
    // Sau khi bạn bấm Publish trên Lovable, thay URL này bằng URL thật:
    url: "https://038a0506-5d16-4f7d-a152-beb89061231a.lovableproject.com",
    cleartext: true,
  },
  android: {
    backgroundColor: "#1e3a8a",
  },
};

export default config;
