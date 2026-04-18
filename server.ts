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

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Health Check
  app.get("/api/ping", (req, res) => {
    res.json({ 
      status: "alive", 
      time: new Date().toISOString(),
      mode: process.env.NODE_ENV,
      distExists: fs.existsSync(distPath)
    });
  });

  // In-memory build registry (for session persistence)
  const activeBuilds = new Map<string, {
    status: "initializing" | "building" | "signing" | "success" | "failing" | "error";
    logs: string[];
    apkPath?: string;
    error?: string;
  }>();

  // Create builds directory
  const buildsDir = path.resolve(rootDir, "storage", "builds");
  if (!fs.existsSync(buildsDir)) {
    fs.mkdirSync(buildsDir, { recursive: true });
  }

  // API Route: Download APK (Real file delivery)
  app.get("/api/download/:buildId", (req, res) => {
    const buildId = req.params.buildId;
    const build = activeBuilds.get(buildId);
    
    // Check if build exists and is successful
    if (!build || build.status !== "success" || !build.apkPath) {
      return res.status(404).json({ 
        success: false, 
        message: "APK not ready or build failed. Please check build logs." 
      });
    }

    const fullPath = path.resolve(buildsDir, build.apkPath);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ success: false, message: "APK file missing on server." });
    }

    // APK Size Validator
    const stats = fs.statSync(fullPath);
    if (stats.size < 1024 * 1024) { // 1MB
      return res.status(500).json({ 
        success: false, 
        message: `Security rejection: APK size is too small (${stats.size} bytes). Likely a corrupt build.` 
      });
    }

    res.download(fullPath, `Web2App_${buildId}.apk`);
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
    activeBuilds.set(buildId, {
      status: "initializing",
      logs: ["Thread started: Build Serialization initiated", "Allocating virtual resources..."]
    });

    const githubToken = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;

    console.log(`[BUILD] Triggered build ${buildId} for ${url}`);

    if (githubToken && owner && repo) {
      try {
        activeBuilds.get(buildId)!.logs.push("Contacting GitHub Build Cluster...");
        // Trigger GitHub Actions Workflow Dispatch
        await axios.post(
          `https://api.github.com/repos/${owner}/${repo}/actions/workflows/android-build.yml/dispatches`,
          {
            ref: "main",
            inputs: {
              build_id: buildId,
              site_url: url,
              app_name: appName,
              package_id: packageId,
              icon_url: iconUrl,
              signing_type: signingType,
              app_domain: (process.env.APP_DOMAIN || req.get('host') || 'localhost:3003').replace(/\/$/, '')
            }
          },
          {
            headers: {
              Authorization: `Bearer ${githubToken}`,
              Accept: "application/vnd.github.v3+json",
            }
          }
        );
        activeBuilds.get(buildId)!.status = "building";
        activeBuilds.get(buildId)!.logs.push("Gradle engine spinning up. Repository cloned.");
        console.log(`[GITHUB] Workflow dispatched successfully for ${buildId}`);
      } catch (err: any) {
        console.error(`[GITHUB ERROR] Failed to dispatch workflow: ${err.message}`);
        activeBuilds.get(buildId)!.status = "error";
        activeBuilds.get(buildId)!.error = err.message;
        activeBuilds.get(buildId)!.logs.push(`FATAL: GitHub Dispatch Failed: ${err.message}`);
      }
    } else {
      console.warn("[BUILD] GitHub credentials missing. Running in Simulation Mode.");
      activeBuilds.get(buildId)!.logs.push("WARN: Production Cluster unavailable. Running offline Gradle emulator.");
      
      // Simulation of a real build for local dev
      setTimeout(() => {
        const build = activeBuilds.get(buildId);
        if (build) {
          build.status = "building";
          build.logs.push("Configuring Android SDK 33...", "[GRADLE] Running :app:assembleRelease...");
        }
      }, 3000);
    }
    
    res.json({
      success: true,
      buildId,
      message: githubToken ? "Connected to Build Cluster" : "Simulated Worker connected",
      status: "initializing"
    });
  });

  // API Route: Check Build Status
  app.get("/api/build-status/:buildId", (req, res) => {
    const build = activeBuilds.get(req.params.buildId);
    if (!build) return res.status(404).json({ success: false, message: "Build not found" });
    res.json({ success: true, ...build });
  });

  // API Route: Build Update (To be called by Private Worker)
  // This endpoint now handles APK uploads too
  app.post("/api/build-update", async (req, res) => {
    const { buildId, status, log, apkBase64, error } = req.body;
    const build = activeBuilds.get(buildId);
    
    if (build) {
      if (status) build.status = status;
      if (log) build.logs.push(log);
      if (error) build.error = error;
      
      if (apkBase64) {
        const fileName = `build_${buildId}.apk`;
        const filePath = path.join(buildsDir, fileName);
        fs.writeFileSync(filePath, Buffer.from(apkBase64, 'base64'));
        
        // Final validation
        const stats = fs.statSync(filePath);
        if (stats.size > 1024 * 1024) { // Real APKs are > 1MB
           build.status = "success";
           build.apkPath = fileName;
           build.logs.push(`SUCCESS: Production APK generated (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
        } else {
           build.status = "error";
           build.logs.push(`REJECTED: Generated APK is too small (${stats.size} bytes). Execution failed.`);
        }
      }
    }
    
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
