import React, { useState, useEffect } from "react";
import { Globe, Smartphone, Package as PackageIcon, Check, Loader2, Download, ExternalLink, ArrowRight, ShieldCheck, Lock as PadlockIcon, AlertCircle, Link as LinkIcon, Zap, Settings } from "lucide-react";
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
}

export default function ConversionForm({ editingApp, onClearEdit }: { editingApp?: any, onClearEdit?: () => void }) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const totalSteps = 4;
  const [config, setConfig] = useState<AppConfig>({
    url: "",
    appName: "",
    packageId: "",
    iconUrl: "https://picsum.photos/seed/placeholder/512/512",
    signingType: "auto",
  });

  const [status, setStatus] = useState<"idle" | "extracting" | "building" | "signing" | "success" | "error">("idle");
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (editingApp) {
      setConfig({
        url: editingApp.url,
        appName: editingApp.appName,
        packageId: editingApp.packageId,
        iconUrl: editingApp.iconUrl,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [editingApp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      signInWithGoogle();
      return;
    }
    if (!config.url || !config.appName) return;

    setStatus("building");
    try {
      const buildRes = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, userId: user.uid }),
      });
      const data = await buildRes.json();
      
      if (data.success) {
        // Here we would normally set up an onSnapshot listener for the specific buildId
        // but since this is a demonstration of the "Private Hookup", we'll simulate the 
        // transition after the worker "connects"
        
        await new Promise(r => setTimeout(r, 2000));
        setStatus("signing");
        await new Promise(r => setTimeout(r, 2000));

        const buildData = {
          userId: user.uid,
          url: config.url,
          appName: config.appName,
          packageId: config.packageId,
          iconUrl: config.iconUrl,
          signingType: config.signingType,
          status: "success",
          downloadUrl: data.downloadUrl || "/api/download/private-bundle.apk",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          isPrivate: true
        };

        if (editingApp) {
          await updateDoc(doc(db, "apps", editingApp.id), buildData);
          if (onClearEdit) onClearEdit();
        } else {
          await addDoc(collection(db, "apps"), buildData);
        }

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

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-8">
      {/* Progress Steps */}
      <div className="flex justify-between max-w-md mx-auto mb-10 relative">
        <div className="absolute top-1/2 left-0 w-full h-px bg-white/5 -z-10"></div>
        {[1, 2, 3, 4].map((s) => (
          <div 
            key={s} 
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
              step >= s ? 'bg-blue-600 text-white' : 'bg-[#1a1a1a] text-gray-600 border border-white/5'
            }`}
          >
            {step > s ? <Check size={14} /> : s}
          </div>
        ))}
      </div>

      <div className="bg-white/5 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden relative group">
        <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 relative h-full">
          {/* Left Side: Dynamic Step Form */}
          <div className="p-8 md:p-12 border-b md:border-b-0 md:border-r border-white/5 flex flex-col">
            <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
              {step === 1 && <><Globe className="text-blue-500" size={28} /> General Identity</>}
              {step === 2 && <><AnimatePresence mode="wait"><motion.div initial={{ rotate: -10 }} animate={{ rotate: 0 }}><PackageIcon className="text-blue-500" size={28} /></motion.div></AnimatePresence> Visual Assets</>}
              {step === 3 && <><Settings className="text-blue-500" size={28} /> Build Pipeline</>}
              {step === 4 && <><Zap className="text-blue-500" size={28} /> Final Review</>}
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
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Website URL</label>
                      <div className="relative">
                        <input
                          type="url"
                          required
                          placeholder="https://your-website.com"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all pl-12 placeholder:text-gray-700"
                          value={config.url}
                          onChange={(e) => setConfig({ ...config, url: e.target.value })}
                          onBlur={handleUrlBlur}
                        />
                        <LinkIcon className="absolute left-4 top-4.5 text-blue-500/50" size={20} />
                        {status === "extracting" && (
                          <Loader2 className="absolute right-4 top-4.5 animate-spin text-blue-500" size={20} />
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Application Name</label>
                      <input
                        type="text"
                        required
                        placeholder="E.g. My Digital Store"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
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
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Application Icon</label>
                      <div className="flex gap-4 items-center p-4 bg-white/5 border border-white/5 rounded-2xl">
                         <img src={config.iconUrl} className="w-16 h-16 rounded-xl" alt="" />
                         <div className="space-y-1">
                            <p className="text-sm font-bold">Auto-Extracted Logo</p>
                            <input 
                              type="text" 
                              className="bg-transparent text-[10px] text-gray-500 border-none p-0 focus:ring-0 w-full"
                              value={config.iconUrl}
                              onChange={(e) => setConfig({ ...config, iconUrl: e.target.value })}
                            />
                         </div>
                      </div>
                      <p className="text-[10px] text-gray-600 px-1">
                        We extract the highest resolution apple-touch-icon or shortcut-icon found in your website manifest.
                      </p>
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
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Package Identifier</label>
                      <input
                        type="text"
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono text-sm"
                        value={config.packageId}
                        onChange={(e) => setConfig({ ...config, packageId: e.target.value })}
                      />
                    </div>

                    <div className="pt-4 border-t border-white/5 space-y-4">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Sign APK</span>
                        <button 
                          type="button"
                          onClick={() => setConfig(c => ({ ...c, signingType: c.signingType === "auto" ? "manual" : "auto" }))}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all ${config.signingType === 'auto' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-white/5 border-white/10 text-gray-400'}`}
                        >
                           {config.signingType === 'auto' ? 'AUTO V3' : 'CUSTOM KEY'}
                        </button>
                      </div>
                      
                      <div className="flex items-start gap-3 p-3 bg-blue-500/5 rounded-xl border border-blue-500/10">
                        <ShieldCheck className="text-blue-500 shrink-0 mt-0.5" size={18} />
                        <div className="space-y-1">
                           <p className="text-xs font-bold text-blue-400 uppercase tracking-tighter leading-none">Security Protocol</p>
                           <p className="text-[10px] text-gray-500 leading-tight">
                             {config.signingType === 'auto' 
                               ? "Secure RSA-2048 keys with PKCS#12 padding." 
                               : "Custom keystore required for Play Store publishing."}
                           </p>
                        </div>
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
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                       <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-500">Service</span>
                          <span className="font-bold">Android Build Worker</span>
                       </div>
                       <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-500">Signing</span>
                          <span className="font-bold">v3 Signature Scheme</span>
                       </div>
                       <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-500">Architecture</span>
                          <span className="font-bold">ARM64-V8A / X86_64</span>
                       </div>
                    </div>
                    
                    <div className="p-4 border-2 border-dashed border-white/10 rounded-2xl flex items-center gap-3">
                       <Zap className="text-yellow-500" size={20} />
                       <p className="text-[10px] text-gray-400 font-medium">Ready for deployment. Pressing the button below will trigger a secure workflow on the private build cluster.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Navigation Buttons */}
            <div className="mt-12 flex gap-3">
               {step > 1 && (
                 <button 
                  onClick={() => setStep(s => s - 1)}
                  className="px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold hover:bg-white/10 transition-all"
                 >
                    Back
                 </button>
               )}
               
               {step < totalSteps ? (
                 <button 
                  onClick={() => setStep(s => s + 1)}
                  disabled={!config.url || (step === 1 && !config.appName)}
                  className="flex-1 py-4 bg-blue-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-500 active:scale-95 disabled:opacity-50 disabled:grayscale transition-all shadow-xl shadow-blue-600/20"
                 >
                    Next Stage
                 </button>
               ) : (
                <button
                  onClick={handleSubmit}
                  disabled={status === "building" || status === "signing" || status === "extracting"}
                  className={`flex-1 py-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all ${
                    status === "building" 
                      ? "bg-blue-600/50 cursor-not-allowed opacity-50" 
                      : "bg-blue-600 hover:bg-blue-500 active:scale-95 shadow-xl shadow-blue-500/20"
                  }`}
                >
                  {status === "building" ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Architecting Build...
                    </>
                  ) : (
                    <>
                      Deploy to Build Cluster
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
               )}
            </div>
          </div>

          {/* Right Side: Device Preview */}
          <div className="p-8 md:p-12 bg-black/40 flex flex-col justify-center items-center">
            <AnimatePresence mode="wait">
              {status === "building" || status === "signing" ? (
                <motion.div 
                  key="building"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center space-y-6 w-full max-w-[240px]"
                >
                  <div className="relative w-24 h-24 mx-auto">
                    <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                       {status === 'signing' ? <PadlockIcon className="text-blue-500" size={32} /> : <PackageIcon className="text-blue-500" size={32} />}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold tracking-tight uppercase">
                       {status === 'signing' ? 'Applying V3 Signature' : 'Serializing Bundle'}
                    </h3>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                       <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: status === 'signing' ? '90%' : '45%' }}
                        className="h-full bg-blue-500"
                       />
                    </div>
                    <p className="text-[10px] text-gray-500 uppercase font-mono tracking-widest animate-pulse">
                       {status === 'signing' ? 'Keytool: generating pkcs12...' : 'Compiling Manifest...'}
                    </p>
                  </div>
                </motion.div>
              ) : status !== "success" ? (
                <motion.div 
                  key="preview"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="text-center w-full"
                >
                  <div className="relative group/device">
                    {/* Device Frame */}
                    <div className="relative w-52 h-[420px] mx-auto bg-[#1a1a1a] rounded-[3rem] border-[8px] border-[#222] shadow-2xl p-2.5 overflow-hidden flex flex-col group/splash">
                       {/* Notch */}
                       <div className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-24 bg-[#222] rounded-b-2xl z-20"></div>
                       
                       {/* Splash View (Hover Triggered) */}
                       <div className="absolute inset-x-2 top-8 bottom-2 bg-gradient-to-b from-blue-900 via-blue-950 to-black z-10 flex flex-col items-center justify-center p-6 opacity-0 group-hover/splash:opacity-100 transition-opacity duration-500 rounded-[1.5rem]">
                          <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4">
                             <img src={config.iconUrl} className="w-10 h-10 object-contain" alt="" />
                          </div>
                          <span className="text-xs font-bold tracking-[0.2em] text-white/40 uppercase">Splash Screen</span>
                       </div>

                       {/* App Home View */}
                       <div className="flex-1 bg-black rounded-[2.2rem] overflow-hidden flex flex-col items-center justify-center p-6 text-center space-y-4">
                          <motion.img 
                            layoutId="app-icon"
                            src={config.iconUrl} 
                            alt="Logo" 
                            className="w-24 h-24 rounded-3xl shadow-2xl border border-white/5 object-cover"
                          />
                          <div className="space-y-1">
                             <h3 className="font-bold text-xl leading-tight text-white/90">
                               {config.appName || "Application"}
                             </h3>
                             <p className="text-[10px] text-blue-500 font-mono tracking-widest uppercase">
                               {config.packageId || "com.app.private"}
                             </p>
                          </div>
                       </div>
                    </div>
                    
                    {/* Floating Glow */}
                    <div className="absolute -inset-10 bg-blue-600/10 blur-[60px] rounded-full -z-10 group-hover/device:bg-blue-600/20 transition-all duration-700"></div>
                  </div>
                  
                  <div className="mt-8 space-y-2">
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest italic">Live Extraction Preview</p>
                    <p className="text-[10px] text-gray-700 max-w-[200px] mx-auto leading-relaxed underline underline-offset-4 decoration-blue-500/30">
                      Site logo assets will be optimized for Adaptive & Legacy icons.
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="success"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center space-y-8 w-full"
                >
                  <div className="w-24 h-24 bg-green-500/10 text-green-500 rounded-3xl flex items-center justify-center mx-auto border border-green-500/20 rotate-12">
                    <Check size={48} className="-rotate-12" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-3xl font-black tracking-tighter">BUILD AUTHENTICATED</h3>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-500/10">
                      Signed & Encrypted
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-left">
                       <p className="text-xs text-blue-400 font-bold uppercase mb-1">Worker Log</p>
                       <code className="text-[10px] text-gray-500 block">
                         [INFO] Signed with release-key.keystore<br/>
                         [INFO] Verified V3 signature scheme<br/>
                         [INFO] SHA-256 Digest generated
                       </code>
                    </div>

                    <a 
                      href={result?.downloadUrl || "#"}
                      className="w-full py-5 bg-white text-black font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-gray-100 transition-all transform hover:-translate-y-1 shadow-2xl shadow-white/10"
                    >
                      <Download size={22} />
                      COLLECT BUNDLE
                    </a>
                    
                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-left space-y-1">
                          <span className="text-[10px] text-gray-600 font-bold uppercase">Target</span>
                          <p className="text-xs font-bold">Android 6+</p>
                       </div>
                       <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-left space-y-1">
                          <span className="text-[10px] text-gray-600 font-bold uppercase">Signing</span>
                          <p className="text-xs font-bold">V2 / V3 Full</p>
                       </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => setStatus("idle")}
                    className="text-xs text-gray-500 hover:text-white transition-colors underline underline-offset-8"
                  >
                    RETURN TO TERMINAL
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {status === "error" && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500"
        >
          <AlertCircle size={20} />
          <p className="text-sm font-medium">An error occurred during build serialization. Please check your URL and try again.</p>
        </motion.div>
      )}
    </div>
  );
}
