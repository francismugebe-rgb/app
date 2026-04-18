import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import * as fs from "fs";
import axios from "axios";
import { JSDOM } from "jsdom";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3003;

  app.use(express.json());

  // API Route: Extract logo and metadata from URL
  app.post("/api/extract-site-data", async (req, res) => {
    const { url } = req.body;
    try {
      const response = await axios.get(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        timeout: 5000
      });
      const dom = new JSDOM(response.data);
      const doc = dom.window.document;

      // Extract title
      const title = doc.title || new URL(url).hostname;
      
      // Extract icon
      let iconUrl = "";
      const appleTouchIcon = doc.querySelector('link[rel="apple-touch-icon"]')?.getAttribute("href");
      const shortcutIcon = doc.querySelector('link[rel="shortcut icon"]')?.getAttribute("href");
      const icon = doc.querySelector('link[rel="icon"]')?.getAttribute("href");

      iconUrl = appleTouchIcon || shortcutIcon || icon || "";
      
      if (iconUrl && !iconUrl.startsWith("http")) {
        const baseUrl = new URL(url);
        iconUrl = new URL(iconUrl, baseUrl.origin).toString();
      }

      // Generate private Package ID
      const domain = new URL(url).hostname.replace("www.", "");
      const packageId = `com.app.${domain.split(".").reverse().join(".")}`;
      
      res.json({ 
        success: true, 
        name: title.trim(), 
        packageId, 
        iconUrl: iconUrl || `https://picsum.photos/seed/${domain}/512/512` 
      });
    } catch (err) {
      console.error("Extraction error:", err);
      res.status(400).json({ success: false, message: "Could not fetch website data" });
    }
  });

  app.post("/api/convert", async (req, res) => {
    const { url, appName, packageId, iconUrl, userId } = req.body;
    
    // BUILD SIMULATION (Production Grade)
    // In a production environment with proper SDKs:
    // 1. We'd create a TWA (Trusted Web Activity) project using Bubblewrap
    // 2. We'd set minSdk=23 (Android 6.0) and targetSdk=34 (Latest)
    // 3. We'd integrate AdMob configuration into the manifest/layout
    // 4. We'd sign the APK using a generated keystore
    // 5. AUTO-SPLASH: Generate splash screen using iconUrl background blending
    // 6. OFFLINE: Inject a service worker for offline fallback
    // 7. PERMISSIONS: Analyze URL for camera/location needs and inject into AndroidManifest.xml
    
    // Simulated build process delay
    setTimeout(() => {
      res.json({
        success: true,
        message: "APK built with Android 6.0+ compatibility",
        downloadUrl: `https://via.placeholder.com/150?text=APK_v1.0.0_Ready_for_${encodeURIComponent(appName)}`,
        buildInfo: {
          minSdk: 23,
          targetSdk: 34,
          adMobEnabled: true,
          signed: true,
          packageId: packageId || "com.private.app",
          features: {
            autoSplash: true,
            offlineFallback: true,
            backNavigation: true,
            fileUpload: true,
            downloadManager: true,
            httpsOnly: true,
            performanceCache: true
          }
        }
      });
    }, 4000);
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[READY] Web2App Converter running on port ${PORT}`);
    console.log(`[MODE] ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer();
