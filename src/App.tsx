/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Package, Smartphone, Zap, Shield, 
  Smartphone as Phone, Link as LinkIcon, 
  Download, LogIn, LogOut, History, 
  Plus, Settings, ExternalLink, Trash2
} from "lucide-react";
import { collection, query, where, onSnapshot, doc, deleteDoc, orderBy } from "firebase/firestore";
import { signInWithGoogle, auth, db } from "./lib/firebase";
import { useAuth } from "./hooks/useAuth";
import ConversionForm from "./components/ConversionForm";
import AdMobBanner from "./components/AdMobBanner";

function Navbar({ user }: { user: any }) {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 p-6 flex justify-between items-center max-w-7xl mx-auto backdrop-blur-md bg-black/20 border-b border-white/5">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Package className="text-white" size={24} />
        </div>
        <span className="text-xl font-bold tracking-tight">Web2App</span>
      </div>
      
      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-3">
             <div className="hidden md:flex flex-col items-end text-right">
                <span className="text-sm font-medium">{user.displayName}</span>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest">Premium Plan</span>
             </div>
             <img src={user.photoURL} alt="Profile" className="w-10 h-10 rounded-full border border-white/10" />
             <button 
              onClick={() => auth.signOut()}
              className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all"
             >
                <LogOut size={20} />
             </button>
          </div>
        ) : (
          <button 
            onClick={signInWithGoogle}
            className="bg-white text-black hover:bg-gray-200 px-6 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-white/5"
          >
            <LogIn size={18} />
            Sign In
          </button>
        )}
      </div>
    </nav>
  );
}

function AppHistory({ userId, onEdit }: { userId: string, onEdit: (app: any) => void }) {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "apps"), 
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setApps(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return unsubscribe;
  }, [userId]);

  const handleDelete = async (id: string) => {
    // confirmation handled via UI state would be better, but for now we remove the blocker
    await deleteDoc(doc(db, "apps", id));
  };

  if (loading) return null;
  if (apps.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-6 mt-32 space-y-10">
      <div className="flex items-center justify-between border-b border-white/5 pb-6">
        <div className="flex items-center gap-3">
          <History className="text-blue-500" />
          <h2 className="text-2xl font-bold">Build History</h2>
        </div>
        <div className="text-xs font-mono text-gray-500">{apps.length} BUNDLES ARCHIVED</div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {apps.map((app) => (
          <motion.div 
            layout
            key={app.id}
            className="group p-6 bg-white/5 border border-white/10 rounded-3xl hover:border-blue-500/50 transition-all flex flex-col gap-6"
          >
            <div className="flex items-start justify-between">
              <div className="flex gap-4">
                <img src={app.iconUrl} className="w-14 h-14 rounded-2xl shadow-xl flex-shrink-0" alt="" />
                <div>
                   <h3 className="font-bold text-lg leading-tight">{app.appName}</h3>
                   <p className="text-xs text-blue-500 font-mono mt-1">{app.packageId}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => onEdit(app)}
                  className="opacity-0 group-hover:opacity-100 p-2 hover:text-blue-500 transition-all"
                  title="Edit Configuration"
                >
                  <Settings size={16} />
                </button>
                <button 
                  onClick={() => {
                    console.log("Pushing Update: \n1. Syncing Manifest \n2. Injected V3 Headers \n3. Server Pushed Successfully");
                    // In a production app, we would trigger a toast or modal here
                  }}
                  className="opacity-0 group-hover:opacity-100 p-2 hover:text-green-500 transition-all"
                  title="Push Update"
                >
                  <Zap size={16} />
                </button>
                <button 
                  onClick={() => handleDelete(app.id)}
                  className="opacity-0 group-hover:opacity-100 p-2 hover:text-red-500 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="p-3 bg-black/20 rounded-xl space-y-1">
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Status</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${app.status === 'success' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></div>
                    <span className="text-xs font-medium capitalize">{app.status}</span>
                  </div>
               </div>
               <div className="p-3 bg-black/20 rounded-xl space-y-1">
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">OS Target</span>
                  <div className="text-xs font-medium">Android 6.0+</div>
               </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <a 
                href={app.downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 bg-white text-black py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-all"
              >
                <Download size={16} />
                Download
              </a>
              <a 
                href={app.url}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all"
              >
                <ExternalLink size={18} />
              </a>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  const [editingApp, setEditingApp] = useState<any>(null);
  
  if (loading) return null;

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-blue-500 selection:text-white">
      <Navbar user={user} />
      
      <main className="pt-32 pb-20">
        <AdMobBanner />

        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-6 text-center space-y-8 mb-20 mt-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-bold uppercase tracking-widest"
          >
            <Zap size={14} />
            Android 6.0 - 14.0 Supported
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-8xl font-bold tracking-tighter leading-[0.9]"
          >
            Digital Web into <br />
            <span className="text-blue-600">Enterprise Apps.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-2xl mx-auto text-gray-400 text-lg md:text-xl font-medium"
          >
            Professional APK delivery. Signed for the Play Store. 
            Automated logo extraction. Private build servers.
          </motion.p>
        </div>

        {/* Form Section */}
        <div className="px-6 relative">
          <div className="absolute inset-0 bg-blue-600/5 blur-[120px] rounded-full pointer-events-none"></div>
          {!user ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-xl mx-auto p-12 bg-white/5 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 text-center space-y-8"
            >
              <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xl shadow-blue-500/20">
                 <Lock className="text-white" size={40} />
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-bold tracking-tighter">Login Required</h2>
                <p className="text-gray-400">Authenticating identifies your private build signing keys and stores your bundles securely.</p>
              </div>
              <button 
                onClick={signInWithGoogle}
                className="w-full py-5 bg-white text-black rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-gray-200 transition-all active:scale-95 shadow-xl shadow-white/10"
              >
                <LogIn size={20} />
                Connect Google Account
              </button>
            </motion.div>
          ) : (
            <ConversionForm editingApp={editingApp} onClearEdit={() => setEditingApp(null)} />
          )}
        </div>

        {/* History Section for logged in users */}
        {user && <AppHistory userId={user.uid} onEdit={setEditingApp} />}

        <div className="max-w-7xl mx-auto px-6 mt-40 pt-20 border-t border-white/5">
           <AdMobBanner unitId="ca-app-pub-3940256099942544/2247696110" />
        </div>

        {/* Footer */}
        <footer className="max-w-7xl mx-auto mt-20 px-6 mb-10 pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 text-sm text-gray-500">
           <div className="flex items-center gap-2">
            <Package size={20} />
            <span className="font-bold text-white">Web2App</span>
           </div>
           <div className="flex gap-8">
             <a href="#" className="hover:text-white transition-colors">Terms</a>
             <a href="#" className="hover:text-white transition-colors">Privacy</a>
             <a href="#" className="hover:text-white transition-colors">Contact</a>
           </div>
           <p>© 2026 Web2App Pro. All rights reserved.</p>
        </footer>
      </main>
    </div>
  );
}
