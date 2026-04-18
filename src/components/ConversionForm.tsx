/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Globe, Smartphone, Package, Check, Loader2, Download, ExternalLink, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AppConfig {
  url: string;
  appName: string;
  packageId: string;
  iconUrl: string;
}

export default function ConversionForm() {
  const [config, setConfig] = useState<AppConfig>({
    url: "",
    appName: "",
    packageId: "com.web2app.myapp",
    iconUrl: "https://picsum.photos/seed/appicon/512/512",
  });

  const [status, setStatus] = useState<"idle" | "building" | "success" | "error">("idle");
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.url || !config.appName) return;

    setStatus("building");
    try {
      const response = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await response.json();
      if (data.success) {
        setResult(data);
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  const handleUrlBlur = async () => {
    if (!config.url || config.appName) return;
    try {
      const response = await fetch("/api/suggest-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: config.url }),
      });
      const data = await response.json();
      if (data.success) {
        setConfig(prev => ({ ...prev, appName: data.name, packageId: data.packageId }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-8">
      <div className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left Side: Form */}
          <div className="p-8 border-b md:border-b-0 md:border-r border-white/10">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <Globe className="text-blue-400" size={24} />
              App Configuration
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Website URL</label>
                <div className="relative">
                  <input
                    type="url"
                    required
                    placeholder="https://example.com"
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all pl-10"
                    value={config.url}
                    onChange={(e) => setConfig({ ...config, url: e.target.value })}
                    onBlur={handleUrlBlur}
                  />
                  <Globe className="absolute left-3 top-3.5 text-gray-500" size={18} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">App Name</label>
                  <input
                    type="text"
                    required
                    placeholder="My Awesome App"
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={config.appName}
                    onChange={(e) => setConfig({ ...config, appName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Package ID</label>
                  <input
                    type="text"
                    required
                    placeholder="com.myapp.id"
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={config.packageId}
                    onChange={(e) => setConfig({ ...config, packageId: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">App Icon URL (512x512)</label>
                <input
                  type="url"
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={config.iconUrl}
                  onChange={(e) => setConfig({ ...config, iconUrl: e.target.value })}
                />
              </div>

              <button
                type="submit"
                disabled={status === "building"}
                className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                  status === "building" 
                    ? "bg-gray-600 cursor-not-allowed" 
                    : "bg-blue-600 hover:bg-blue-500 hover:scale-[1.02] active:scale-[0.98]"
                }`}
              >
                {status === "building" ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Building APK...
                  </>
                ) : (
                  <>
                    Package APK
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Side: Preview/Status */}
          <div className="p-8 bg-black/20 flex flex-col justify-center items-center">
            <AnimatePresence mode="wait">
              {status === "idle" && (
                <motion.div 
                  key="idle"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-center"
                >
                  <div className="relative w-48 h-96 mx-auto mb-6 bg-gray-900 rounded-[2.5rem] border-[6px] border-gray-800 shadow-xl p-2 overflow-hidden flex items-center justify-center">
                    <div className="text-gray-700 text-center px-4">
                      <Smartphone size={64} className="mx-auto mb-4 opacity-20" />
                      <p className="text-sm">Preview will appear here</p>
                    </div>
                    {/* Simulated Screen */}
                    {config.appName && (
                      <div className="absolute inset-x-2 top-8 bottom-2 bg-black rounded-[1.5rem] overflow-hidden flex flex-col items-center justify-center p-4">
                         <img 
                          src={config.iconUrl} 
                          alt="Icon" 
                          className="w-20 h-20 rounded-2xl mb-4 shadow-lg"
                        />
                        <h3 className="font-bold text-lg text-center leading-tight">{config.appName}</h3>
                        <p className="text-[10px] text-gray-500 mt-1">{config.packageId}</p>
                      </div>
                    )}
                  </div>
                  <p className="text-gray-500 text-sm">Fill in the details to see a preview of your app.</p>
                </motion.div>
              )}

              {status === "building" && (
                <motion.div 
                  key="building"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center space-y-4"
                >
                  <div className="relative w-24 h-24 mx-auto">
                    <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <Package className="absolute inset-0 m-auto text-blue-500" size={32} />
                  </div>
                  <h3 className="text-xl font-medium">Processing Assets</h3>
                  <p className="text-gray-500 max-w-xs mx-auto text-sm">
                    We're preparing your app package, optimizing images, and generating the Android manifest...
                  </p>
                </motion.div>
              )}

              {status === "success" && (
                <motion.div 
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center space-y-6 w-full"
                >
                  <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto">
                    <Check size={40} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Build Ready!</h3>
                    <p className="text-green-500/80 text-sm mt-1">Version 1.0.0 (Build 1)</p>
                  </div>
                  
                  <div className="space-y-3">
                    <a 
                      href={result.downloadUrl}
                      className="w-full py-4 bg-white text-black font-bold rounded-xl flex items-center justify-center gap-3 hover:bg-gray-100 transition-colors"
                    >
                      <Download size={20} />
                      Download APK
                    </a>
                    <button 
                      onClick={() => setStatus("idle")}
                      className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-colors"
                    >
                      Create Another
                    </button>
                  </div>

                  <div className="pt-6 border-t border-white/5 space-y-4">
                    <div className="flex items-center justify-between text-sm px-2">
                       <span className="text-gray-500">Play Store Ready</span>
                       <Check className="text-green-500" size={16} />
                    </div>
                    <div className="flex items-center justify-between text-sm px-2">
                       <span className="text-gray-500">Auto-Update Support</span>
                       <Check className="text-green-500" size={16} />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
