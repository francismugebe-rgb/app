import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import * as fs from "fs";
import axios from "axios";
import { JSDOM } from "jsdom";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3003;
  const isProd = process.env.NODE_ENV === "production";
  
  // Use absolute path relative to the root public_html directory
  const rootDir = process.cwd();
  const distPath = path.resolve(rootDir, "dist");

  console.log(`[INIT] Environment: ${process.env.NODE_ENV}`);
  console.log(`[INIT] Root: ${rootDir}`);
  console.log(`[INIT] Dist: ${distPath}`);

  if (isProd && !fs.existsSync(distPath)) {
    console.error("[CRITICAL] Dist directory not found. Please run 'npm run build' first.");
  }

  app.use(express.json());

  // Health Check
  app.get("/api/ping", (req, res) => {
    res.json({ 
      status: "alive", 
      time: new Date().toISOString(),
      mode: process.env.NODE_ENV,
      distExists: fs.existsSync(distPath)
    });
  });

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
    
    const buildId = Math.random().toString(36).substring(7);
    
    // In a production app, we would:
    // 1. Create a "pending" build record in Firestore
    // 2. Trigger a GitHub Action (Private Worker) via Repository Dispatch
    // 3. GitHub Action updates the status via another API route
    
    console.log(`[BUILD] Triggered build ${buildId} for ${url}`);
    
    // Simulate initial response to allow UI to show "Connecting..."
    res.json({
      success: true,
      buildId,
      message: "Initiating Private Build Worker...",
      status: "queued"
    });
  });

  // API Route: Build Update (To be called by Private Worker)
  app.post("/api/build-update", async (req, res) => {
    const { buildId, status, downloadUrl } = req.body;
    console.log(`[BUILD UPDATE] ${buildId}: ${status}`);
    // Update logic would go here
    res.json({ success: true });
  });

  // Vite integration
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files from dist
    app.use(express.static(distPath, {
      maxAge: '1d',
      index: false // We handle index via wildcard to ensure SPA fallback
    }));

    app.get("*", (req, res) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Production build (index.html) missing. Deployment error.");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[READY] Web2App Converter running on port ${PORT}`);
    console.log(`[MODE] ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer();
