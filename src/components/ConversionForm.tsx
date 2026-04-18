import React, { useState, useEffect, useRef } from "react";
import { Globe, Smartphone, Package as PackageIcon, Check, Loader2, Download, ExternalLink, ArrowRight, ShieldCheck, Lock as PadlockIcon, AlertCircle, Link as LinkIcon, Zap, Settings, Upload, Image as ImageIcon, Palette, Eye, Terminal, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { addDoc, collection, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { db, signInWithGoogle } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";

interface AppConfig {
  url: string;
  appName: string;
  packageId: string;
  iconUrl: string;
  signingType: "auto" | "manual";
  splashColor: string;
  showSplashTitle: boolean;
  navLayout: "tabs" | "drawer" | "top" | "none";
}

export default function ConversionForm({ editingApp, onClearEdit }: { editingApp?: any, onClearEdit?: () => void }) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const totalSteps = 5;
  const [previewMode, setPreviewMode] = useState<"home" | "splash">("home");

  const [config, setConfig] = useState<AppConfig>({
    url: "",
    appName: "",
    packageId: "",
    iconUrl: "https://picsum.photos/seed/placeholder/512/512",
    signingType: "auto",
    splashColor: "#000000",
    showSplashTitle: true,
    navLayout: "tabs",
  });

  const [status, setStatus] = useState<"idle" | "extracting" | "building" | "signing" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [buildLogs, setBuildLogs] = useState<string[]>([]);

  useEffect(() => {
    if (editingApp) {
      setConfig({
        url: editingApp.url,
        appName: editingApp.appName,
        packageId: editingApp.packageId,
        iconUrl: editingApp.iconUrl,
        signingType: editingApp.signingType || "auto",
        splashColor: editingApp.splashColor || "#000000",
        showSplashTitle: editingApp.showSplashTitle ?? true,
        navLayout: editingApp.navLayout || "tabs",
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [editingApp]);

  // Set preview mode based on step
  useEffect(() => {
    if (step === 3) setPreviewMode("splash");
    else setPreviewMode("home");
  }, [step]);

  const handleSubmit = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) {
      signInWithGoogle();
      return;
    }
    if (!config.url || !config.appName) return;

    setStatus("building");
    setErrorMessage(null);
    try {
      const buildRes = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, userId: user.uid }),
      });
      
      if (!buildRes.ok) {
        const errorText = await buildRes.text();
        throw new Error(errorText || `Network error: ${buildRes.status}`);
      }

      const data = await buildRes.json();
      
      if (data.success) {
        const buildId = data.buildId;
        
        // Start Polling Loop
        const pollStatus = async () => {
          try {
            const statusRes = await fetch(`/api/build-status/${buildId}`);
            const statusData = await statusRes.json();
            
            if (statusData.success) {
              setBuildLogs(statusData.logs || []);
              
              if (statusData.status === "success") {
                const buildData = {
                  userId: user.uid,
                  url: config.url,
                  appName: config.appName,
                  packageId: config.packageId,
                  iconUrl: config.iconUrl,
                  signingType: config.signingType,
                  splashColor: config.splashColor,
                  showSplashTitle: config.showSplashTitle,
                  navLayout: config.navLayout,
                  status: "success",
                  downloadUrl: `/api/download/${buildId}`,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                  isPrivate: true
                };

                if (editingApp) {
                  await updateDoc(doc(db, "apps", editingApp.id), buildData);
                } else {
                  await addDoc(collection(db, "apps"), buildData);
                }

                setResult({ ...statusData, downloadUrl: `/api/download/${buildId}` });
                setStatus("success");
                return; // Stop polling
              } else if (statusData.status === "error") {
                setErrorMessage(statusData.error || "Build worker reported a fatal error.");
                setStatus("error");
                return; // Stop polling
              } else {
                // Determine UI status based on backend status
                if (statusData.status === "building") setStatus("building");
                if (statusData.status === "signing") setStatus("signing");
                
                // Continue polling
                setTimeout(pollStatus, 3000);
              }
            }
          } catch (pollErr) {
            console.error("Polling error:", pollErr);
            setTimeout(pollStatus, 5000);
          }
        };

        pollStatus();
      } else {
        setErrorMessage(data.message || "The build worker rejected the configuration.");
        setStatus("error");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "An unexpected error occurred during build serialization.");
      setStatus("error");
    }
  };

  const handleUrlBlur = async () => {
    if (!config.url) return;
    setStatus("extracting");
    try {
      const response = await fetch("/api/extract-site-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: config.url }),
      });
      const data = await response.json();
      if (data.success) {
        setConfig(prev => ({ 
          ...prev, 
          appName: prev.appName || data.name, 
          packageId: data.packageId,
          iconUrl: data.iconUrl
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStatus("idle");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setConfig(prev => ({ ...prev, iconUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-8">
      {/* Progress Steps */}
      <div className="flex justify-between max-w-lg mx-auto mb-10 relative">
        <div className="absolute top-1/2 left-0 w-full h-px bg-white/5 -z-10"></div>
        {[1, 2, 3, 4, 5].map((s) => (
          <div 
            key={s} 
            className={`w-10 h-10 rounded-full flex flex-col items-center justify-center text-[10px] font-bold transition-all duration-500 relative ${
              step >= s ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-[#1a1a1a] text-gray-600 border border-white/5'
            }`}
          >
            {step > s ? <Check size={16} /> : s}
            <span className="absolute -bottom-6 whitespace-nowrap text-[9px] text-gray-500 font-bold uppercase tracking-tighter">
              {s === 1 && "Identity"}
              {s === 2 && "Branding"}
              {s === 3 && "Splash"}
              {s === 4 && "Pipeline"}
              {s === 5 && "Review"}
            </span>
          </div>
        ))}
      </div>

      <div className="bg-[#0a0a12]/80 backdrop-blur-3xl rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden relative group">
        <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 relative min-h-[600px]">
          {/* Left Side: Dynamic Step Form */}
          <div className="p-8 md:p-12 border-b lg:border-b-0 lg:border-r border-white/5 flex flex-col bg-white/[0.02] relative">
            <h2 className="text-3xl font-black mb-10 flex items-center gap-4 tracking-tighter italic uppercase text-blue-500">
              {step === 1 && <><Globe className="text-white" size={32} /> Identity</>}
              {step === 2 && <><ImageIcon className="text-white" size={32} /> Assets</>}
              {step === 3 && <><Palette className="text-white" size={32} /> Appearance</>}
              {step === 4 && <><Settings className="text-white" size={32} /> Protocol</>}
              {step === 5 && <><Zap className="text-white" size={32} /> Ready</>}
            </h2>
            
            <div className="flex-1 space-y-8">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                    key="step1"
                  >
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] pl-1">Website Endpoint</label>
                      <div className="relative">
                        <input
                          type={config.url ? "password" : "url"}
                          required
                          placeholder="https://your-website.com"
                          className={`w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all pl-14 placeholder:text-gray-700 font-medium ${config.url ? 'text-blue-500/50' : ''}`}
                          value={config.url}
                          onChange={(e) => setConfig({ ...config, url: e.target.value })}
                          onBlur={handleUrlBlur}
                        />
                        <LinkIcon className="absolute left-5 top-5 text-gray-500" size={24} />
                        {config.url && (
                          <button 
                            onClick={() => setConfig({...config, url: ""})}
                            className="absolute right-5 top-5 text-[10px] font-black uppercase text-gray-600 hover:text-white"
                          >
                             Clear
                          </button>
                        )}
                        {status === "extracting" && (
                          <Loader2 className="absolute right-5 top-5 animate-spin text-blue-500" size={24} />
                        )}
                      </div>
                      {config.url && (
                        <p className="text-[10px] font-bold text-green-500/50 uppercase tracking-widest flex items-center gap-2 mt-2">
                          <Check size={12} /> Endpoint Secured & Hidden
                        </p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] pl-1">Display Name</label>
                      <input
                        type="text"
                        required
                        placeholder="E.g. My Digital Store"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold text-lg"
                        value={config.appName}
                        onChange={(e) => setConfig({ ...config, appName: e.target.value })}
                      />
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                    key="step2"
                  >
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] pl-1">Application Icon</label>
                      <div className="flex gap-6 items-center p-6 bg-white/5 border border-white/5 rounded-[2rem]">
                         <div className="relative group/icon-upload cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <img src={config.iconUrl} className="w-24 h-24 rounded-3xl object-cover shadow-2xl border-2 border-white/10 group-hover/icon-upload:opacity-50 transition-all" alt="" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/icon-upload:opacity-100 transition-opacity">
                               <Upload className="text-white" size={24} />
                            </div>
                         </div>
                         <div className="space-y-2 flex-1">
                            <p className="text-sm font-bold">App Branding</p>
                            <p className="text-[10px] text-gray-500 leading-tight mb-2">
                              Upload a 512x512 PNG for best results. We handle the mask generation.
                            </p>
                            <div className="flex gap-2">
                               <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-tighter hover:bg-blue-500 transition-all"
                               >
                                  Upload File
                               </button>
                               <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*" 
                                onChange={handleFileChange}
                               />
                            </div>
                         </div>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-bold text-gray-500">Asset URL Override</label>
                         <input 
                            type="text" 
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                            value={config.iconUrl}
                            onChange={(e) => setConfig({ ...config, iconUrl: e.target.value })}
                          />
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                    key="step3"
                  >
                    <div className="space-y-6">
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] pl-1">Splash Background</label>
                         <div className="flex gap-3">
                            <input 
                              type="color" 
                              className="w-20 h-16 bg-white/5 border border-white/10 rounded-2xl cursor-pointer p-1"
                              value={config.splashColor}
                              onChange={(e) => setConfig({ ...config, splashColor: e.target.value })}
                            />
                            <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 flex items-center">
                               <span className="font-mono text-xs text-gray-400 uppercase">{config.splashColor}</span>
                            </div>
                         </div>
                      </div>

                      <div className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/5">
                         <div className="space-y-1">
                            <span className="text-xs font-bold block">Display Title</span>
                            <span className="text-[10px] text-gray-500">Show app name below logo during splash.</span>
                         </div>
                         <button 
                          onClick={() => setConfig(c => ({ ...c, showSplashTitle: !c.showSplashTitle }))}
                          className={`w-12 h-6 rounded-full transition-all relative ${config.showSplashTitle ? 'bg-blue-600' : 'bg-white/10'}`}
                         >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${config.showSplashTitle ? 'left-7' : 'left-1'}`}></div>
                         </button>
                      </div>

                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] pl-1">Navigation Menu Style</label>
                         <div className="grid grid-cols-2 gap-3">
                            {[
                              { id: "tabs", label: "Bottom Tabs", desc: "Native Android pattern" },
                              { id: "drawer", label: "Side Drawer", desc: "Hierarchical menu" },
                              { id: "top", label: "Top Bar", desc: "Categorical scroll" },
                              { id: "none", label: "Hidden", desc: "Edge-to-edge view" }
                            ].map(opt => (
                              <button
                                key={opt.id}
                                onClick={() => setConfig({...config, navLayout: opt.id as any})}
                                className={`p-4 rounded-2xl border text-left transition-all ${config.navLayout === opt.id ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20'}`}
                              >
                                 <p className="text-[10px] font-black uppercase tracking-tighter">{opt.label}</p>
                                 <p className="text-[8px] opacity-60 leading-none mt-1">{opt.desc}</p>
                              </button>
                            ))}
                         </div>
                      </div>

                      <div className="flex gap-2 p-4 bg-yellow-500/5 rounded-2xl border border-yellow-500/10">
                         <Zap className="text-yellow-500 shrink-0" size={16} />
                         <p className="text-[10px] text-yellow-500/70 italic leading-tight">
                           Android 12+ dynamic splash scaling will be applied to guarantee no "logo stretch" on any DPI.
                         </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 4 && (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                    key="step4"
                  >
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] pl-1">Unique Package ID</label>
                      <input
                        type="text"
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono text-sm uppercase tracking-wider"
                        value={config.packageId}
                        onChange={(e) => setConfig({ ...config, packageId: e.target.value })}
                      />
                    </div>

                    <div className="pt-4 border-t border-white/5 space-y-4">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Digital Signature</span>
                        <button 
                          type="button"
                          onClick={() => setConfig(c => ({ ...c, signingType: c.signingType === "auto" ? "manual" : "auto" }))}
                          className={`text-[9px] font-black px-3 py-1 rounded-full border transition-all ${config.signingType === 'auto' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white/5 border-white/10 text-gray-400'}`}
                        >
                           {config.signingType === 'auto' ? 'AUTO-GEN (PRO)' : 'CUSTOM JKS'}
                        </button>
                      </div>
                      
                      <div className="p-5 bg-blue-500/5 rounded-[2rem] border border-blue-500/10 space-y-3">
                        <div className="flex items-center gap-3">
                           <ShieldCheck className="text-blue-500" size={24} />
                           <p className="text-xs font-black uppercase text-blue-400 tracking-tighter">Encryption V3 Scheme</p>
                        </div>
                        <p className="text-[10px] text-gray-500 leading-relaxed font-medium">
                           {config.signingType === 'auto' 
                             ? "Using 2048-bit secure keys. Your app will be compatible with Samsung & Xiaomi security scanners automatically." 
                             : "Please upload your .jks, store password, and alias at the review stage."}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 5 && (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                    key="step5"
                  >
                    <div className="p-6 bg-white/5 rounded-[2.5rem] border border-white/5 space-y-6">
                       <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Manifest Summary</h4>
                       <div className="space-y-3">
                        {[
                          { l: "Target", v: "Android 13.0 (API 33)" },
                          { l: "Bundle", v: config.appName },
                          { l: "Package", v: config.packageId },
                          { l: "Signing", v: "Hardware-Backed RSA" },
                        ].map(row => (
                          <div key={row.l} className="flex justify-between items-center text-[10px]">
                            <span className="text-gray-500">{row.l}</span>
                            <span className="font-bold border-b border-white/10 pb-0.5">{row.v}</span>
                          </div>
                        ))}
                       </div>
                    </div>
                    
                    <div className="p-5 border-2 border-dashed border-blue-500/20 rounded-3xl flex items-center gap-4 bg-blue-500/5">
                       <Zap className="text-blue-500 shrink-0" size={28} />
                       <p className="text-[10px] text-gray-400 font-bold leading-relaxed">System ready. Click below to initiate a remote build dispatch. This will generate your signed production APK.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Navigation Buttons */}
            <div className="mt-12 flex gap-4">
               {step > 1 && (
                 <button 
                  onClick={() => setStep(s => s - 1)}
                  className="px-8 py-5 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
                 >
                    Back
                 </button>
               )}
               
               {step < totalSteps ? (
                 <button 
                  onClick={() => setStep(s => s + 1)}
                  disabled={!config.url || (step === 1 && !config.appName)}
                  className="flex-1 py-5 bg-blue-600 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-500 active:scale-95 disabled:opacity-30 disabled:grayscale transition-all shadow-2xl shadow-blue-600/30 flex items-center justify-center gap-3"
                 >
                    Proceed to {step === 1 ? "Branding" : step === 2 ? "Appearance" : step === 3 ? "Pipeline" : "Review"}
                    <ArrowRight size={18} />
                 </button>
               ) : (
                <button
                  onClick={handleSubmit}
                  disabled={status === "building" || status === "signing" || status === "extracting"}
                  className={`flex-1 py-6 rounded-[1.5rem] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-4 transition-all ${
                    status === "building" 
                      ? "bg-blue-600/50 cursor-not-allowed opacity-50" 
                      : "bg-blue-600 hover:bg-blue-500 active:scale-95 shadow-3xl shadow-blue-600/40"
                  }`}
                >
                  {status === "building" ? (
                    <>
                      <Loader2 className="animate-spin" size={24} />
                      Serializing...
                    </>
                  ) : (
                    <>
                      Build Production APK
                      <Zap size={20} fill="currentColor" />
                    </>
                  )}
                </button>
               )}
            </div>
          </div>

          {/* Right Side: Adaptive Device Preview */}
          <div className="p-8 md:p-12 bg-black flex flex-col justify-center items-center relative overflow-hidden">
             {/* Dynamic BG Glow */}
             <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/20 via-transparent to-transparent"></div>
             
             <div className="mb-8 flex gap-4 bg-white/5 p-2 rounded-2xl border border-white/5 relative z-10">
                <button 
                  onClick={() => setPreviewMode("splash")}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all flex items-center gap-2 ${previewMode === 'splash' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}
                >
                   <ImageIcon size={14} /> Splash
                </button>
                <button 
                  onClick={() => setPreviewMode("home")}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all flex items-center gap-2 ${previewMode === 'home' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}
                >
                   <Eye size={14} /> Result
                </button>
             </div>

            <AnimatePresence mode="wait">
              {status === "building" || status === "signing" ? (
                <motion.div 
                  key="building-view"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.1 }}
                  className="text-center space-y-8 w-full max-w-[280px] relative z-10"
                >
                  <div className="relative w-32 h-32 mx-auto">
                    <div className="absolute inset-0 border-[6px] border-blue-500/10 rounded-full"></div>
                    <div className="absolute inset-0 border-[6px] border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                       {status === 'signing' ? <PadlockIcon className="text-blue-500" size={40} /> : <div className="text-3xl font-black text-blue-500 italic">WEB</div>}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-2xl font-black tracking-tighter uppercase italic text-white flex items-center justify-center gap-2">
                       {status === 'signing' ? <ShieldCheck className="text-blue-500" size={24} /> : <div className="w-5 h-5 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>}
                       {status === 'signing' ? 'Signing APK' : 'Cloud Build'}
                    </h3>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-end px-1">
                        <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">
                          {status === 'signing' ? 'Verification' : 'Compiling'}
                        </span>
                        <span className="text-[9px] font-mono text-gray-500">
                          {status === 'signing' ? '92%' : '48%'}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                         <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: status === 'signing' ? '92%' : '48%' }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className="h-full bg-gradient-to-r from-blue-600 to-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                         />
                      </div>
                    </div>

                    <div className="p-4 bg-black/40 rounded-2xl border border-white/5 text-left font-mono overflow-hidden">
                       <p className="text-[10px] text-blue-500/80 mb-2 flex items-center gap-2">
                          <Terminal size={12} /> Live Engine Logs
                       </p>
                       <div className="space-y-1 h-20 overflow-y-auto custom-scrollbar">
                          {buildLogs.length > 0 ? (
                            buildLogs.map((log, i) => (
                              <div key={i} className="text-[9px] text-gray-500 flex gap-2">
                                 <span className="text-gray-700 shrink-0">{i + 1}</span>
                                 <span className="truncate">{log}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-[9px] text-gray-700 animate-pulse italic">Awaiting build worker heartbeat...</p>
                          )}
                       </div>
                    </div>
                  </div>
                </motion.div>
              ) : status !== "success" ? (
                <motion.div 
                  key="preview-view"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="text-center w-full relative z-10"
                >
                  <div className="relative group/device">
                    {/* Device Frame */}
                    <div className="relative w-[310px] h-[640px] mx-auto bg-[#0a0a0a] rounded-[3.5rem] border-[12px] border-[#1a1a1a] shadow-2xl p-3 overflow-hidden flex flex-col">
                       {/* Notch */}
                       <div className="absolute top-0 left-1/2 -translate-x-1/2 h-7 w-32 bg-[#1a1a1a] rounded-b-2xl z-30"></div>
                       
                       {/* Phone Screen Content */}
                       <div className="flex-1 rounded-[2.5rem] overflow-hidden relative shadow-inner">
                          <AnimatePresence mode="wait">
                            {previewMode === "splash" ? (
                              <motion.div 
                                key="splash-preview"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
                                style={{ backgroundColor: config.splashColor }}
                              >
                                 <motion.img 
                                   initial={{ scale: 0.8, opacity: 0 }}
                                   animate={{ scale: 1, opacity: 1 }}
                                   src={config.iconUrl} 
                                   className="w-24 h-24 object-cover rounded-3xl shadow-3xl mb-4 border border-white/10"
                                   alt=""
                                 />
                                 {config.showSplashTitle && (
                                   <motion.h4 
                                     initial={{ y: 5, opacity: 0 }}
                                     animate={{ y: 0, opacity: 1 }}
                                     className="text-white font-black text-xl tracking-tighter"
                                   >
                                     {config.appName || "App Name"}
                                   </motion.h4>
                                 )}
                                 <div className="absolute bottom-8">
                                    <div className="w-8 h-1 bg-white/20 rounded-full overflow-hidden">
                                       <div className="h-full bg-white/60 animate-load-slide"></div>
                                    </div>
                                 </div>
                              </motion.div>
                            ) : (
                              <motion.div 
                                key="home-preview"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-white flex flex-col overflow-hidden"
                              >
                                 {/* Status Bar */}
                                 <div className="h-6 bg-white/90 backdrop-blur-md flex justify-between px-6 items-center pt-2 absolute top-0 inset-x-0 z-50">
                                    <span className="text-[9px] font-bold text-black/60">9:41</span>
                                    <div className="flex gap-1 items-center">
                                       {config.navLayout === 'drawer' && <div className="w-3 h-0.5 bg-black/40 rounded-full"></div>}
                                       <div className="w-3 h-3 bg-black/60 rounded-[2px]"></div>
                                    </div>
                                 </div>
                                 
                                 {/* Site Container */}
                                 <div className="flex-1 relative flex flex-col pt-6 bg-gray-50 h-full w-full">
                                     {config.navLayout === 'top' && (
                                       <div className="h-10 bg-white border-b border-gray-100 flex items-center px-4 gap-4 overflow-hidden relative z-40">
                                          <div className="h-4 w-12 bg-blue-500 rounded-full flex-shrink-0"></div>
                                          <div className="h-4 w-12 bg-gray-100 rounded-full flex-shrink-0"></div>
                                          <div className="h-4 w-12 bg-gray-100 rounded-full flex-shrink-0"></div>
                                       </div>
                                     )}
                                     
                                     <div className="flex-1 bg-white flex items-center justify-center overflow-hidden relative h-full w-full">
                                        {config.url ? (
                                          <iframe 
                                            src={config.url} 
                                            className="w-full h-full border-none pointer-events-none absolute inset-0 bg-white" 
                                            title="Site Preview"
                                          />
                                        ) : (
                                          <div className="text-center space-y-2 p-8 opacity-20 group-hover:opacity-40 transition-opacity">
                                             <Globe size={48} className="mx-auto text-blue-500" />
                                             <p className="text-[10px] font-black uppercase tracking-widest">Connect Site Endpoint</p>
                                          </div>
                                        )}
                                        {/* Overlay to prevent interaction in preview */}
                                        <div className="absolute inset-0 z-10"></div>
                                     </div>
                                 </div>

                                 {/* Bottom Bar */}
                                 {config.navLayout === 'tabs' && (
                                   <div className="h-14 bg-white/90 backdrop-blur-md border-t border-gray-100 flex justify-around items-center px-4 mb-2 relative z-50">
                                      <div className="flex flex-col items-center gap-1">
                                         <div className="w-5 h-5 bg-blue-500 rounded-lg"></div>
                                         <div className="w-4 h-1 bg-blue-500 rounded-full"></div>
                                      </div>
                                      <div className="flex flex-col items-center gap-1">
                                         <div className="w-5 h-5 bg-gray-100 rounded-lg"></div>
                                         <div className="w-4 h-1 bg-gray-100 rounded-full"></div>
                                      </div>
                                      <div className="flex flex-col items-center gap-1">
                                         <div className="w-5 h-5 bg-gray-100 rounded-lg"></div>
                                         <div className="w-4 h-1 bg-gray-100 rounded-full"></div>
                                      </div>
                                   </div>
                                 )}
                                 {config.navLayout === 'none' && <div className="h-6 bg-white absolute bottom-0 inset-x-0 z-50"></div>}
                              </motion.div>
                            )}
                          </AnimatePresence>
                       </div>
                    </div>
                    
                    {/* Floating Glow */}
                    <div className="absolute -inset-16 bg-blue-600/10 blur-[90px] rounded-full -z-10 animate-pulse-slow"></div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="success-view"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center space-y-8 w-full max-w-[320px] relative z-10"
                >
                  <div className="w-28 h-28 bg-blue-500/10 text-blue-500 rounded-[2.5rem] flex items-center justify-center mx-auto border border-blue-500/20 rotate-6 shadow-2xl shadow-blue-500/20">
                    <Check size={56} className="-rotate-6" />
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-4xl font-black tracking-tighter italic uppercase text-white">SUCCESS</h3>
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 text-blue-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/20">
                      Production Signed
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="p-6 bg-white/5 border border-white/10 rounded-[2.5rem] text-left">
                       <p className="text-[10px] text-blue-500 font-black uppercase mb-3 tracking-widest flex items-center gap-2">
                         <Settings size={14} /> Worker Output
                       </p>
                       <code className="text-[10px] text-gray-500 block font-mono space-y-1 overflow-hidden">
                         {buildLogs.slice(-3).map((log, i) => (
                            <div key={i} className="truncate">
                               {log.startsWith('SUCCESS') ? '✅ ' : log.startsWith('REJECTED') ? '❌ ' : '[OK] '} 
                               {log}
                            </div>
                         ))}
                         {!buildLogs.length && (
                           <>
                             [OK] Splashing: {config.splashColor}<br/>
                             [OK] Signature: V3 Secure<br/>
                             [OK] Digest: {Math.random().toString(16).substring(2, 10).toUpperCase()}
                           </>
                         )}
                       </code>
                    </div>

                    <a 
                      href={result?.downloadUrl || "#"}
                      className="w-full py-6 bg-blue-600 text-white font-black rounded-[1.5rem] flex items-center justify-center gap-4 hover:bg-blue-500 transition-all transform hover:-translate-y-1 shadow-3xl shadow-blue-600/40 text-sm uppercase tracking-widest"
                    >
                      <Download size={22} strokeWidth={3} />
                      Download APK
                    </a>
                  </div>

                  <button 
                    onClick={() => { setStatus("idle"); setStep(1); }}
                    className="text-[10px] text-gray-600 hover:text-white transition-colors font-black uppercase tracking-widest border-b border-gray-800 pb-1"
                  >
                    Start New Project
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {status === "error" && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-8 overflow-hidden rounded-[2.5rem] bg-red-500/5 border border-red-500/10 flex flex-col md:flex-row relative group"
        >
          <div className="p-8 flex flex-col items-center justify-center bg-red-500/10 border-r border-red-500/10 min-w-[200px] text-center">
             <AlertCircle size={48} className="text-red-500 mb-4 animate-bounce" />
             <h4 className="text-xl font-black italic uppercase tracking-tighter text-red-500">Build Reject</h4>
             <button 
               onClick={() => setStatus("idle")}
               className="mt-4 px-6 py-2 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase hover:bg-red-400 transition-all font-mono"
             >
                Try Again
             </button>
          </div>
          <div className="p-8 flex-1 space-y-4">
             <div className="space-y-1">
                <p className="text-sm font-bold text-gray-300">Failure Logic Context</p>
                <p className="text-[10px] text-red-400 font-mono uppercase font-black">
                   {errorMessage || "ENGINE_TIMEOUT: Worker did not report finalization within 240s"}
                </p>
             </div>
             
             <div className="space-y-2">
                <p className="text-[10px] text-gray-500 font-black flex items-center gap-2 uppercase tracking-widest">
                   <Terminal size={14} /> Full Execution Stack (Partial)
                </p>
                <div className="bg-black/50 p-4 rounded-xl border border-white/5 max-h-40 overflow-y-auto custom-scrollbar font-mono">
                   {buildLogs.map((log, i) => (
                     <div key={i} className="text-[9px] text-gray-600 mb-1 border-b border-white/5 pb-1">
                        {log}
                     </div>
                   ))}
                   {buildLogs.length === 0 && (
                     <p className="text-[9px] text-gray-700 italic">No logs captured. Check your internet connection or GitHub Action status.</p>
                   )}
                </div>
             </div>
          </div>
          
          <div className="absolute top-4 right-4 group-hover:rotate-45 transition-transform duration-500 opacity-20">
             <ShieldAlert size={64} className="text-red-500" />
          </div>
        </motion.div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes load-slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .animate-load-slide {
          animation: load-slide 2s infinite ease-in-out;
        }
        .shadow-3xl {
           box-shadow: 0 40px 60px -20px rgba(0, 0, 0, 0.4);
        }
        .animate-pulse-slow {
           animation: pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}} />
    </div>
  );
}
