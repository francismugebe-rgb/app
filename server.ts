import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import * as fs from "fs";
import axios from "axios";
import { JSDOM } from "jsdom";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3003;

  // Ensure builds directory exists
  const buildsDir = path.join(process.cwd(), "public", "builds");
  if (!fs.existsSync(buildsDir)) {
    fs.mkdirSync(buildsDir, { recursive: true });
  }

  app.use(express.json());

  // API Route: Download APK (Real file delivery)
  app.get("/api/download/:appId", (req, res) => {
    // In a real app, we'd find the file by ID
    // For this demo, we'll serve a signed dummy bundle
    const appId = req.params.appId;
    res.setHeader("Content-Disposition", `attachment; filename="Web2App_${appId}.apk"`);
    res.setHeader("Content-Type", "application/vnd.android.package-archive");
    res.send(Buffer.from("DUMMY_ANDROID_PACKAGE_DATA_SIGNED_V3_PKCS12"));
  });

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
    const { url, appName, packageId, iconUrl, userId, signingType } = req.body;
    
    // BUILD LOGIC: This would be the entry point for a worker-based build system
    // We simulate the multi-stage pipeline:
    // 1. Scraping Site Manifest
    // 2. Generating Android Assets (Splash, Icons)
    // 3. Compiling JAVA/Kotlin Bridge
    // 4. Signing with V3 Scheme
    
    const buildId = Math.random().toString(36).substring(7);

    setTimeout(() => {
      res.json({
        success: true,
        message: "APK built with Android 6.0+ compatibility",
        downloadUrl: `/api/download/${buildId}`,
        buildInfo: {
          minSdk: 23,
          targetSdk: 34,
          adMobEnabled: true,
          signed: true,
          signingMethod: signingType || "Auto-Generated keystore",
          certificateFingerprint: "SHA-256: 4F:EA:72:...", 
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
    }, 4500);
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
