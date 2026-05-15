"use client";

import { motion } from "framer-motion";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-nest-black/80 backdrop-blur-sm">
      <div className="relative flex items-center justify-center">
        {/* Outer glowing ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="absolute w-20 h-20 rounded-full border-2 border-transparent border-t-cyan-400 border-r-cyan-400 opacity-80"
          style={{ boxShadow: "0 0 20px rgba(0, 245, 255, 0.4)" }}
        />
        
        {/* Inner reverse spinning ring */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          className="absolute w-12 h-12 rounded-full border-2 border-transparent border-b-violet-500 border-l-violet-500 opacity-80"
          style={{ boxShadow: "0 0 15px rgba(139, 92, 246, 0.4)" }}
        />
        
        {/* Center pulsing dot */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
          className="w-4 h-4 bg-white rounded-full glow-cyan"
        />
      </div>
      <motion.p 
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
        className="mt-8 text-sm font-medium tracking-widest text-cyan-400 uppercase"
      >
        Loading Nest...
      </motion.p>
    </div>
  );
}
