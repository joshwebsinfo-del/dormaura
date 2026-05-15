"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useNotificationStore } from "@/store";
import { DoorOpen, X } from "lucide-react";
import { useEffect } from "react";

export function KnockAlert() {
  const { knockNotification, setKnockNotification } = useNotificationStore();

  useEffect(() => {
    if (knockNotification) {
      const timer = setTimeout(() => setKnockNotification(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [knockNotification, setKnockNotification]);

  return (
    <AnimatePresence>
      {knockNotification && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -100, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="fixed top-20 left-4 right-4 z-50 max-w-sm mx-auto"
        >
          <div
            className="glass rounded-2xl p-4 flex items-center gap-4"
            style={{
              border: "1px solid rgba(0,245,255,0.3)",
              boxShadow:
                "0 0 40px rgba(0,245,255,0.2), 0 8px 32px rgba(0,0,0,0.5)",
            }}
          >
            {/* Icon with pulse animation */}
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background:
                  "linear-gradient(135deg, rgba(0,245,255,0.2), rgba(124,58,237,0.2))",
                border: "1px solid rgba(0,245,255,0.4)",
                boxShadow: "0 0 20px rgba(0,245,255,0.3)",
              }}
            >
              <DoorOpen size={22} className="text-cyan-400" />
            </motion.div>

            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm">
                Someone&apos;s at your door! 🚪
              </p>
              <p className="text-white/50 text-xs mt-0.5 truncate">
                <span className="text-cyan-400">{knockNotification.fromUser}</span>{" "}
                is outside your room
              </p>
            </div>

            <button
              onClick={() => setKnockNotification(null)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
            >
              <X size={14} />
            </button>
          </div>

          {/* Animated progress bar */}
          <motion.div
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: 8, ease: "linear" }}
            className="h-0.5 rounded-full mt-1 origin-left"
            style={{ background: "linear-gradient(to right, #00f5ff, #7c3aed)" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
