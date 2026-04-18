/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { Package, Smartphone, Zap, Shield, Smartphone as Phone, Link as LinkIcon, Download } from "lucide-react";
import ConversionForm from "./components/ConversionForm";

function Navbar() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 p-6 flex justify-between items-center max-w-7xl mx-auto backdrop-blur-sm bg-black/10">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
          <Package className="text-white" size={24} />
        </div>
        <span className="text-xl font-bold tracking-tight">Web2App</span>
      </div>
      <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
        <a href="#" className="hover:text-white transition-colors">How it works</a>
        <a href="#" className="hover:text-white transition-colors">Pricing</a>
        <a href="#" className="hover:text-white transition-colors">Docs</a>
      </div>
      <button className="bg-white/5 hover:bg-white/10 px-6 py-2 rounded-full border border-white/10 text-sm font-medium transition-all">
        Sign In
      </button>
    </nav>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
  return (
    <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4">
      <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center">
        <Icon size={24} />
      </div>
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="text-gray-400 leading-relaxed text-sm">{description}</p>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-blue-500 selection:text-white">
      <Navbar />
      
      <main className="pt-32 pb-20 px-6">
        {/* Hero Section */}
        <div className="max-w-7xl mx-auto text-center space-y-8 mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-bold uppercase tracking-widest"
          >
            <Zap size={14} />
            Android Build Service
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-8xl font-bold tracking-tighter leading-[0.9]"
          >
            Websites into <br />
            <span className="text-blue-600">Native Apps.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-2xl mx-auto text-gray-400 text-lg md:text-xl font-medium"
          >
            The easiest way to package your website as a professional APK. 
            No coding required. Play Store ready.
          </motion.p>
        </div>

        {/* Form Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <ConversionForm />
        </motion.div>

        {/* Features Section */}
        <div className="max-w-7xl mx-auto mt-32 grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard 
            icon={Zap}
            title="Fast Builds"
            description="Package your website in under 60 seconds with our optimized build pipeline."
          />
          <FeatureCard 
            icon={Smartphone}
            title="Native Experience"
            description="Complete WebView optimization with pull-to-refresh and native splash screens."
          />
          <FeatureCard 
            icon={Shield}
            title="Store Ready"
            description="We handle the signing and manifest generation so you can publish to Play Store immediately."
          />
        </div>

        {/* How it works */}
        <div className="max-w-4xl mx-auto mt-40 space-y-20">
          <div className="text-center space-y-4">
             <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Three steps to mobile.</h2>
             <p className="text-gray-400">Going from web to app has never been this simple.</p>
          </div>

          <div className="space-y-12">
            {[
              { step: "01", icon: LinkIcon, text: "Input your mobile-optimized website URL." },
              { step: "02", icon: Phone, text: "Customize icon, splash screen, and package settings." },
              { step: "03", icon: Download, text: "Download your signed, production-ready APK." }
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-8">
                 <span className="text-4xl font-bold text-white/10 font-mono pt-1">{item.step}</span>
                 <div className="flex-1 pb-12 border-b border-white/5 flex items-center gap-6">
                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center shrink-0">
                      <item.icon className="text-blue-500" size={28} />
                    </div>
                    <p className="text-xl font-medium text-gray-200">{item.text}</p>
                 </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="max-w-7xl mx-auto mt-40 pt-20 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 text-sm text-gray-500">
           <div className="flex items-center gap-2">
            <Package size={20} />
            <span className="font-bold text-white">Web2App</span>
           </div>
           <div className="flex gap-8">
             <a href="#" className="hover:text-white transition-colors">Terms</a>
             <a href="#" className="hover:text-white transition-colors">Privacy</a>
             <a href="#" className="hover:text-white transition-colors">Contact</a>
           </div>
           <p>© 2026 Web2App Converter. Powered by AI Studio.</p>
        </footer>
      </main>
    </div>
  );
}
