import React from "react";
import { motion } from "motion/react";

interface AdMobBannerProps {
  unitId?: string;
}

export default function AdMobBanner({ unitId = "ca-app-pub-3940256099942544/6300978111" }: AdMobBannerProps) {
  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full bg-white/5 border border-dashed border-white/20 rounded-xl p-4 flex flex-col items-center justify-center gap-2 overflow-hidden"
      >
        <div className="flex items-center gap-4 text-xs font-mono text-gray-500 uppercase tracking-widest">
           <span>AdMob Banner</span>
           <div className="h-px w-20 bg-gray-800"></div>
           <span>{unitId}</span>
        </div>
        <div className="w-full h-12 bg-black/40 rounded flex items-center justify-center text-[10px] text-gray-600 font-medium">
          SPONSOR CONTENT PLACEHOLDER
        </div>
      </motion.div>
    </div>
  );
}
